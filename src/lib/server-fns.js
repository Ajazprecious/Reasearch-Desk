import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";
import { rankCandidates } from "@/lib/similarity";
import { CORE_MILESTONES } from "@/lib/milestones";
import { normaliseConfig } from "@/lib/matching-config";

// ---- shared helpers -------------------------------------------------------

function forbidden() {
  setResponseStatus(403);
  return Object.assign(new Error("You do not have access to this action"), { status: 403 });
}
function notFound(what) {
  setResponseStatus(404);
  return Object.assign(new Error(`${what} not found`), { status: 404 });
}

const isAdmin = (user) => user?.role === "admin" || user?.app_role === "admin";
const isoDate = (date) => date.toISOString().slice(0, 10);
const today = () => isoDate(new Date());
const inDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return isoDate(date);
};

// The core supervision cycle lives in @/lib/milestones so screens and the server agree.

async function notify(serviceRole, { email, title, message, type, link }) {
  if (!email) return;
  await serviceRole.entities.Notification.create({ user_email: email, title, message, type, link, is_read: false });
}

async function recalculateProgress(serviceRole, studentEmail) {
  const { items: milestones } = await serviceRole.entities.Milestone.filter(
    { student_email: studentEmail },
    { sort: "order", limit: 100 },
  );
  const total = milestones.length;
  const done = milestones.filter((milestone) => milestone.status === "approved").length;
  const progress = total ? Math.round((done / total) * 100) : 0;

  const { items: profiles } = await serviceRole.entities.ResearchProfile.filter({ student_email: studentEmail }, { limit: 5 });
  if (profiles[0]) await serviceRole.entities.ResearchProfile.update(profiles[0].id, { progress });

  const { items: assignments } = await serviceRole.entities.Assignment.filter({ student_email: studentEmail }, { limit: 20 });
  await Promise.all(assignments.map((assignment) => serviceRole.entities.Assignment.update(assignment.id, { progress })));

  return { progress, total, done };
}

// ---- Local matching configuration -----------------------------------------

async function loadMatchingConfig(serviceRole) {
  const page = await serviceRole.entities.MatchingConfig.list({ sort: "-created_date", limit: 1 });
  return normaliseConfig(page.items?.[0]);
}

async function recordMatchingRun(serviceRole, run) {
  await serviceRole.entities.MatchingRun.create({
    triggered_by: run.triggeredBy || "system",
    scope: run.scope || "all",
    students_processed: run.processed || 0,
    used_ai: !!run.usedAi,
    model: run.model || "tfidf-cosine",
    embedding_model: run.embeddingModel || "",
    confidence: Math.round(run.confidence || 0),
    duration_ms: Math.round(run.durationMs || 0),
    status: run.status || "success",
    summary: run.summary || "",
  });
}

// ---- role selection -------------------------------------------------------

// The workspace role a new account chose on the sign-in screen. Written once, with the
// service role, because the field is locked against self-editing on the User entity.
export const setWorkspaceRole = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ role: z.enum(["student", "supervisor", "admin"]) }))
  .handler(async ({ context, data }) => {
    const { user } = context;
    // A workspace role is set once. An administrator account may switch between the
    // three workspaces (to review each one); everyone else keeps their stored role.
    const canSwitch = user.role === "admin";
    if (user.app_role && !canSwitch) return { role: user.app_role };
    if (user.app_role === data.role) return { role: data.role };
    await context.getWorkspace().asServiceRole.entities.User.update(user.id, { app_role: data.role });
    return { role: data.role };
  });

export const generateRecommendations = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ studentEmail: z.string().max(200).optional() }).optional())
  .handler(async ({ context, data }) => {
    const { user } = context;
    const serviceRole = context.getWorkspace().asServiceRole;
    const admin = isAdmin(user);
    const onlyFor = data?.studentEmail;
    if (!admin && onlyFor && onlyFor !== user.email) throw forbidden();
    const config = await loadMatchingConfig(serviceRole);
    if (!config.engine_enabled) return { processed: 0, usedAi: false, students: [], unmatched: [], reason: "disabled" };
    const started = Date.now();

    const { items: profiles } = await serviceRole.entities.ResearchProfile.list({ sort: "-created_date", limit: 200 });
    const targets = profiles
      .filter((profile) => profile.status === "submitted" && !profile.supervisor_email)
      .filter((profile) => (admin && !onlyFor ? true : profile.student_email === (onlyFor || user.email)))
      .slice(0, 6);

    if (!targets.length) return { processed: 0, usedAi: false, students: [] };

    const { items: supervisors } = await serviceRole.entities.SupervisorProfile.list({ sort: "-created_date", limit: 200 });
    const eligible = supervisors.filter(
      (supervisor) =>
        Number(supervisor.current_load || 0) < Number(supervisor.max_capacity || 0) && supervisor.availability !== "unavailable",
    );

    if (!eligible.length) return { processed: 0, usedAi: false, students: [], reason: "no-capacity" };

    const summary = [];
    const unmatched = [];
    const usedAiAny = false;
    let confidenceTotal = 0;

    for (const profile of targets) {
      const query = [profile.research_title, profile.research_area, profile.keywords, profile.description].filter(Boolean).join(" ");
      const candidates = eligible.filter((supervisor) => supervisor.department === profile.department).map((supervisor) => ({
        key: supervisor.email,
        text: [supervisor.research_areas, supervisor.keywords, supervisor.bio, supervisor.department].filter(Boolean).join(" "),
      }));
      if (!candidates.length) {
        unmatched.push({ student_email: profile.student_email, student_name: profile.student_name, department: profile.department });
        continue;
      }
      const ranked = rankCandidates(query, candidates);
      const maxCosine = Math.max(...ranked.map((entry) => entry.cosine), 0.0001);

      const scored = ranked
        .map((entry) => {
          const supervisor = eligible.find((candidate) => candidate.email === entry.key);
          const headroom =
            Number(supervisor?.max_capacity || 1) > 0
              ? 1 - Number(supervisor.current_load || 0) / Number(supervisor.max_capacity || 1)
              : 0;
          const capacityWeight = Math.min(Math.max(Number(config.capacity_weight ?? 0.1), 0), 0.6);
          const similarityWeight = Math.min(Math.max(Number(config.similarity_weight ?? 0.55), 0), 1 - capacityWeight);
          const overlapWeight = Math.max(0, 1 - similarityWeight - capacityWeight);
          const lexical =
            (entry.cosine / maxCosine) * similarityWeight +
            entry.overlap * overlapWeight +
            Math.max(headroom, 0) * capacityWeight;
          // Structural boosts on top of the similarity + keyword blend: a supervisor in the
          // same department, and one who supervises the student's level, are better fits.
          const departmentFit =
            supervisor?.department && supervisor.department === profile.department ? Number(config.department_boost ?? 0) : 0;
          const levelFit =
            !supervisor?.preferred_level || supervisor.preferred_level === "Both" || supervisor.preferred_level === profile.level
              ? Number(config.level_boost ?? 0)
              : 0;
          const blended = Math.min(
            0.99,
            lexical + departmentFit + levelFit,
          );
          return {
            supervisor,
            score: Math.max(1, Math.min(99, Math.round(blended * 100))),
            matched: entry.matched,
            rationale:
              `Shared focus on ${entry.matched.slice(0, 3).join(", ") || "related research topics"} with ${
                Number(supervisor?.max_capacity || 0) - Number(supervisor?.current_load || 0)
              } supervision slot(s) free.`,
          };
        })
        .sort((a, b) => b.score - a.score);
      const aboveThreshold = scored.filter((entry) => entry.score >= Number(config.min_score ?? 0));
      const finalists = (aboveThreshold.length ? aboveThreshold : scored.slice(0, 1)).slice(
        0,
        Math.max(1, Math.min(5, Number(config.top_matches ?? 3))),
      );

      await serviceRole.entities.Recommendation.deleteMany({ student_email: profile.student_email, status: "pending" });
      await serviceRole.entities.Recommendation.bulkCreate(
        finalists.map((entry, index) => ({
          student_email: profile.student_email,
          student_name: profile.student_name || profile.student_email,
          research_title: profile.research_title,
          research_area: profile.research_area,
          department: profile.department,
          faculty: profile.faculty,
          supervisor_email: entry.supervisor.email,
          supervisor_name: entry.supervisor.full_name,
          supervisor_department: entry.supervisor.department,
          academic_rank: entry.supervisor.academic_rank,
          match_score: entry.score,
          rank: index + 1,
          matched_keywords: entry.matched.join(", "),
          rationale: entry.rationale,
          capacity_snapshot: `${entry.supervisor.current_load || 0}/${entry.supervisor.max_capacity || 0}`,
          status: "pending",
        })),
      );

      confidenceTotal += finalists[0]?.score || 0;
      summary.push({
        student_email: profile.student_email,
        student_name: profile.student_name,
        top: finalists[0]?.supervisor?.full_name,
        score: finalists[0]?.score,
      });
    }

    if (summary.length) {
      const admins = (await serviceRole.entities.User.list()).filter((candidate) => candidate.role === "admin");
      await Promise.all(
        admins.map((candidate) =>
          notify(serviceRole, {
            email: candidate.email,
            title: "New supervisor matches ready",
            message: `${summary.length} student research profile(s) now have ranked supervisor suggestions to review.`,
            type: "assignment",
            link: "/admin/recommendations",
          }),
        ),
      );
    }

    const result = {
      processed: summary.length,
      usedAi: usedAiAny,
      students: summary,
      confidence: summary.length ? Math.round(confidenceTotal / summary.length) : 0,
      durationMs: Date.now() - started,
      unmatched,
    };

    await recordMatchingRun(serviceRole, {
      triggeredBy: user.email,
      scope: onlyFor ? "student" : "all",
      processed: result.processed,
      usedAi: result.usedAi,
      model: config.model,
      embeddingModel: config.embedding_model,
      confidence: result.confidence,
      durationMs: result.durationMs,
      status: "success",
      summary: `${result.processed} student${result.processed === 1 ? "" : "s"} ranked ${
        "with deterministic local cosine ranking"
      } · average top match ${result.confidence}%`,
    });

    return result;
  });

export const confirmAssignment = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ recommendationId: z.string().min(1), note: z.string().max(500).optional() }))
  .handler(async ({ context, data }) => {
    const { user } = context;
    if (!isAdmin(user)) throw forbidden();
    const serviceRole = context.getWorkspace().asServiceRole;

    const recommendation = await serviceRole.entities.Recommendation.get(data.recommendationId).catch(() => null);
    if (!recommendation) throw notFound("Recommendation");
    if (recommendation.status === "approved") return { ok: false, message: "This student already has a supervisor." };

    const { items: profiles } = await serviceRole.entities.ResearchProfile.filter(
      { student_email: recommendation.student_email },
      { limit: 5 },
    );
    const profile = profiles[0];

    await serviceRole.entities.Assignment.create({
      student_email: recommendation.student_email,
      student_name: recommendation.student_name,
      supervisor_email: recommendation.supervisor_email,
      supervisor_name: recommendation.supervisor_name,
      department: recommendation.department || profile?.department || "",
      faculty: recommendation.faculty || profile?.faculty || "",
      programme: profile?.programme || "",
      research_title: recommendation.research_title || profile?.research_title || "",
      assigned_date: today(),
      status: "active",
      progress: 0,
    });

    if (profile) {
      await serviceRole.entities.ResearchProfile.update(profile.id, {
        supervisor_email: recommendation.supervisor_email,
        supervisor_name: recommendation.supervisor_name,
        status: "assigned",
      });
    }

    await serviceRole.entities.Recommendation.update(recommendation.id, {
      status: "approved",
      reviewed_by: user.email,
      decision_note: data.note || "",
    });
    await serviceRole.entities.Recommendation.updateMany(
      { student_email: recommendation.student_email, status: "pending" },
      { $set: { status: "declined" } },
    );

    await serviceRole.entities.SupervisorProfile.updateMany(
      { email: recommendation.supervisor_email },
      { $inc: { current_load: 1 } },
    );

    const { items: existingMilestones } = await serviceRole.entities.Milestone.filter({
      student_email: recommendation.student_email,
    });
    if (!existingMilestones.length) {
      await serviceRole.entities.Milestone.bulkCreate(
        CORE_MILESTONES.map((milestone, index) => ({
          student_email: recommendation.student_email,
          student_name: recommendation.student_name,
          supervisor_email: recommendation.supervisor_email,
          title: milestone.title,
          description: milestone.description,
          due_date: inDays(milestone.days),
          order: index + 1,
          status: "pending",
        })),
      );
    }

    await notify(serviceRole, {
      email: recommendation.student_email,
      title: "Supervisor assigned",
      message: `${recommendation.supervisor_name} has been confirmed as your research supervisor. Your milestones are ready.`,
      type: "assignment",
      link: "/student",
    });
    await notify(serviceRole, {
      email: recommendation.supervisor_email,
      title: "New student assigned",
      message: `${recommendation.student_name} will be supervised by you — "${recommendation.research_title}".`,
      type: "assignment",
      link: "/supervisor",
    });

    await recalculateProgress(serviceRole, recommendation.student_email);

    return { ok: true, supervisorName: recommendation.supervisor_name };
  });

// ---- draft, feedback and revision loop -----------------------------------

export const submitDraft = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      milestoneId: z.string().min(1),
      title: z.string().min(3).max(200),
      summary: z.string().max(600).optional(),
      content: z.string().max(60000).optional(),
      note: z.string().max(1200).optional(),
      fileName: z.string().max(200).optional(),
      fileUri: z.string().max(600).optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { user } = context;
    const serviceRole = context.getWorkspace().asServiceRole;
    const milestone = await serviceRole.entities.Milestone.get(data.milestoneId).catch(() => null);
    if (!milestone) throw notFound("Milestone");
    if (milestone.student_email !== user.email && !isAdmin(user)) throw forbidden();

    const { items: versions } = await serviceRole.entities.Draft.filter(
      { milestone_id: milestone.id },
      { sort: "-version", limit: 50 },
    );
    const version = (versions[0]?.version || 0) + 1;
    if (!data.content && !data.fileUri) {
      setResponseStatus(400);
      throw Object.assign(new Error("Attach a document or add the draft text before submitting"), { status: 400 });
    }
    const wordCount = data.content ? data.content.trim().split(/\s+/).filter(Boolean).length : 0;

    const draft = await serviceRole.entities.Draft.create({
      milestone_id: milestone.id,
      milestone_title: milestone.title,
      student_email: milestone.student_email,
      student_name: milestone.student_name || user.full_name || user.email,
      supervisor_email: milestone.supervisor_email || "",
      version,
      title: data.title,
      summary: data.summary || data.note || "",
      content: data.content || "",
      word_count: wordCount,
      note: data.note || "",
      file_name: data.fileName || "",
      file_uri: data.fileUri || "",
      status: "submitted",
      submitted_date: new Date().toISOString(),
    });

    await serviceRole.entities.Milestone.update(milestone.id, { status: "submitted" });

    if (milestone.supervisor_email) {
      await notify(serviceRole, {
        email: milestone.supervisor_email,
        title: `New draft · ${milestone.title}`,
        message: `${milestone.student_name || milestone.student_email} submitted version ${version} of "${data.title}".`,
        type: "submission",
        link: "/supervisor/reviews",
      });
    }

    return { version, draftId: draft.id };
  });

export const reviewDraft = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      draftId: z.string().min(1),
      outcome: z.enum(["revision_required", "approved"]),
      comments: z.string().min(5).max(4000),
      correctionsRequired: z.string().max(2000).optional(),
      revisionDueDate: z.string().max(20).optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { user } = context;
    const serviceRole = context.getWorkspace().asServiceRole;
    const draft = await serviceRole.entities.Draft.get(data.draftId).catch(() => null);
    if (!draft) throw notFound("Draft");
    if (draft.supervisor_email !== user.email && !isAdmin(user)) throw forbidden();

    const feedback = await serviceRole.entities.Feedback.create({
      draft_id: draft.id,
      milestone_id: draft.milestone_id,
      milestone_title: draft.milestone_title,
      version: draft.version,
      student_email: draft.student_email,
      supervisor_email: user.email,
      supervisor_name: user.full_name || user.email,
      comments: data.comments,
      corrections_required: data.correctionsRequired || "",
      outcome: data.outcome,
      reviewed_date: new Date().toISOString(),
    });

    await serviceRole.entities.Draft.update(draft.id, {
      status: data.outcome === "approved" ? "approved" : "revision_required",
    });
    await serviceRole.entities.Milestone.update(draft.milestone_id, {
      status: data.outcome === "approved" ? "submitted" : "revision_required",
      ...(data.outcome === "revision_required" && data.revisionDueDate ? { due_date: data.revisionDueDate } : {}),
    });

    await notify(serviceRole, {
      email: draft.student_email,
      title: data.outcome === "approved" ? "Draft approved" : "Revision requested",
      message:
        data.outcome === "approved"
          ? `Your version ${draft.version} of "${draft.milestone_title}" was approved.`
          : `Your supervisor left feedback on version ${draft.version} of "${draft.milestone_title}".`,
      type: "feedback",
      link: "/student/drafts",
    });

    return { ok: true, feedbackId: feedback.id };
  });

export const completeMilestone = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ milestoneId: z.string().min(1) }))
  .handler(async ({ context, data }) => {
    const { user } = context;
    const serviceRole = context.getWorkspace().asServiceRole;
    const milestone = await serviceRole.entities.Milestone.get(data.milestoneId).catch(() => null);
    if (!milestone) throw notFound("Milestone");
    if (milestone.supervisor_email !== user.email && !isAdmin(user)) throw forbidden();

    await serviceRole.entities.Milestone.update(milestone.id, { status: "approved", completed_date: today() });
    const progress = await recalculateProgress(serviceRole, milestone.student_email);

    await notify(serviceRole, {
      email: milestone.student_email,
      title: `${milestone.title} marked complete`,
      message: `Your supervisor confirmed this milestone. Overall progress is now ${progress.progress}%.`,
      type: "milestone",
      link: "/student/milestones",
    });

    return { ok: true, ...progress };
  });

// ---- administrator views --------------------------------------------------

async function adminDataset(serviceRole) {
  const [profiles, supervisors, assignments, milestones, recommendations, defences, users] = await Promise.all([
    serviceRole.entities.ResearchProfile.list({ sort: "-created_date", limit: 300 }),
    serviceRole.entities.SupervisorProfile.list({ sort: "-created_date", limit: 300 }),
    serviceRole.entities.Assignment.list({ sort: "-created_date", limit: 300 }),
    serviceRole.entities.Milestone.list({ sort: "due_date", limit: 1000 }),
    serviceRole.entities.Recommendation.list({ sort: "-match_score", limit: 300 }),
    serviceRole.entities.Defence.list({ sort: "scheduled_date", limit: 300 }),
    serviceRole.entities.User.list(),
  ]);
  return {
    profiles: profiles.items,
    supervisors: supervisors.items,
    assignments: assignments.items,
    milestones: milestones.items,
    recommendations: recommendations.items,
    defences: defences.items,
    users,
  };
}

const attentionStatus = (progress, overdue) => (overdue > 0 || progress < 35 ? "needs_attention" : "on_track");

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    if (!isAdmin(context.user)) throw forbidden();
    const serviceRole = context.getWorkspace().asServiceRole;
    const { profiles, supervisors, assignments, milestones, recommendations, users } = await adminDataset(serviceRole);
    const now = today();

    const departments = new Map();
    const addTo = (name, faculty) => {
      const key = name || "Unassigned";
      if (!departments.has(key)) {
        departments.set(key, { name: key, faculty: faculty || "", students: 0, supervisors: 0, approved: 0, milestones: 0, overdue: 0 });
      }
      return departments.get(key);
    };

    profiles.forEach((profile) => {
      const entry = addTo(profile.department, profile.faculty);
      entry.students += 1;
    });
    supervisors.forEach((supervisor) => {
      addTo(supervisor.department, supervisor.faculty).supervisors += 1;
    });
    milestones.forEach((milestone) => {
      const profile = profiles.find((item) => item.student_email === milestone.student_email);
      const entry = addTo(profile?.department, profile?.faculty);
      entry.milestones += 1;
      if (milestone.status === "approved") entry.approved += 1;
      if (milestone.status !== "approved" && milestone.due_date && milestone.due_date < now) entry.overdue += 1;
    });

    const departmentCards = [...departments.values()]
      .map((entry) => {
        const progress = entry.milestones ? Math.round((entry.approved / entry.milestones) * 100) : 0;
        return {
          ...entry,
          progress,
          status: attentionStatus(progress, entry.overdue),
          awaitingSupervisor: profiles.filter(
            (profile) => (profile.department || "Unassigned") === entry.name && profile.status !== "assigned",
          ).length,
        };
      })
      .sort((a, b) => b.students - a.students);

    const pendingRecommendations = recommendations.filter((recommendation) => recommendation.status === "pending");
    const studentsAwaiting = profiles.filter((profile) => profile.status === "submitted" && !profile.supervisor_email);
    const overdue = milestones
      .filter((milestone) => milestone.status !== "approved" && milestone.due_date && milestone.due_date < now)
      .map((milestone) => ({
        id: milestone.id,
        student_name: milestone.student_name,
        student_email: milestone.student_email,
        title: milestone.title,
        due_date: milestone.due_date,
        status: milestone.status,
      }))
      .slice(0, 8);

    return {
      totals: {
        students: profiles.length,
        supervisors: supervisors.length,
        activeAssignments: assignments.filter((assignment) => assignment.status === "active").length,
        awaitingSupervisor: studentsAwaiting.length,
        pendingRecommendations: pendingRecommendations.length,
        overdueMilestones: overdue.length,
        submissionsInReview: milestones.filter((milestone) => milestone.status === "submitted").length,
        users: users.length,
      },
      departmentCards,
      attention: overdue,
      awaiting: studentsAwaiting.slice(0, 6).map((profile) => ({
        student_name: profile.student_name,
        student_email: profile.student_email,
        research_title: profile.research_title,
        department: profile.department,
      })),
      capacity: supervisors
        .map((supervisor) => ({
          name: supervisor.full_name,
          department: supervisor.department,
          load: Number(supervisor.current_load || 0),
          max: Number(supervisor.max_capacity || 0),
          availability: supervisor.availability,
        }))
        .sort((a, b) => b.load / Math.max(b.max, 1) - a.load / Math.max(a.max, 1))
        .slice(0, 5),
    };
  });

export const getAdminRecommendations = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    if (!isAdmin(context.user)) throw forbidden();
    const serviceRole = context.getWorkspace().asServiceRole;
    const { profiles, supervisors, recommendations, assignments } = await adminDataset(serviceRole);

    // A student who has never had matching run is offered the action right in the queue.
    const queue = profiles
      .filter((profile) => profile.status === "submitted" || profile.status === "assigned")
      .map((profile) => ({
        profile: {
          student_name: profile.student_name,
          student_email: profile.student_email,
          research_title: profile.research_title,
          research_area: profile.research_area,
          keywords: profile.keywords,
          department: profile.department,
          faculty: profile.faculty,
          level: profile.level,
          status: profile.status,
          supervisor_name: profile.supervisor_name,
        },
        assigned: assignments.some((assignment) => assignment.student_email === profile.student_email && assignment.status === "active"),
        candidates: recommendations
          .filter((recommendation) => recommendation.student_email === profile.student_email)
          .sort((a, b) => a.rank - b.rank)
          .map((recommendation) => ({
            id: recommendation.id,
            supervisor_name: recommendation.supervisor_name,
            supervisor_email: recommendation.supervisor_email,
            supervisor_department: recommendation.supervisor_department,
            academic_rank: recommendation.academic_rank,
            match_score: recommendation.match_score,
            rank: recommendation.rank,
            rationale: recommendation.rationale,
            matched_keywords: recommendation.matched_keywords,
            capacity_snapshot:
              recommendation.capacity_snapshot ||
              (() => {
                const supervisor = supervisors.find((item) => item.email === recommendation.supervisor_email);
                return supervisor ? `${supervisor.current_load || 0}/${supervisor.max_capacity || 0}` : "—";
              })(),
            status: recommendation.status,
          })),
      }))
      .sort((a, b) => (b.candidates[0]?.match_score || 0) - (a.candidates[0]?.match_score || 0));

    return {
      queue,
      supervisors: supervisors.map((supervisor) => ({
        name: supervisor.full_name,
        email: supervisor.email,
        department: supervisor.department,
        rank: supervisor.academic_rank,
        load: Number(supervisor.current_load || 0),
        max: Number(supervisor.max_capacity || 0),
        availability: supervisor.availability,
        areas: supervisor.research_areas,
      })),
    };
  });

export const getAdminSupervision = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    if (!isAdmin(context.user)) throw forbidden();
    const serviceRole = context.getWorkspace().asServiceRole;
    const { assignments, milestones, supervisors, profiles } = await adminDataset(serviceRole);
    const now = today();

    return {
      assignments: assignments
        .map((assignment) => {
          const studentMilestones = milestones.filter((milestone) => milestone.student_email === assignment.student_email);
          const approved = studentMilestones.filter((milestone) => milestone.status === "approved").length;
          const overdue = studentMilestones.filter(
            (milestone) => milestone.status !== "approved" && milestone.due_date && milestone.due_date < now,
          ).length;
          return {
            id: assignment.id,
            student_name: assignment.student_name,
            student_email: assignment.student_email,
            supervisor_name: assignment.supervisor_name,
            supervisor_email: assignment.supervisor_email,
            department: assignment.department,
            programme: assignment.programme,
            research_title: assignment.research_title,
            assigned_date: assignment.assigned_date,
            status: assignment.status,
            progress: studentMilestones.length ? Math.round((approved / studentMilestones.length) * 100) : assignment.progress || 0,
            milestones: studentMilestones.length,
            approved,
            overdue,
          };
        })
        .sort((a, b) => a.progress - b.progress),
      supervisors: supervisors.map((supervisor) => ({
        name: supervisor.full_name,
        email: supervisor.email,
        department: supervisor.department,
        rank: supervisor.academic_rank,
        load: Number(supervisor.current_load || 0),
        max: Number(supervisor.max_capacity || 0),
        availability: supervisor.availability,
        students: assignments.filter(
          (assignment) => assignment.supervisor_email === supervisor.email && assignment.status === "active",
        ).length,
      })),
      unassigned: profiles
        .filter((profile) => !profile.supervisor_email)
        .map((profile) => ({
          student_name: profile.student_name,
          student_email: profile.student_email,
          research_title: profile.research_title,
          department: profile.department,
          status: profile.status,
        })),
    };
  });

export const getAdminProgress = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    if (!isAdmin(context.user)) throw forbidden();
    const serviceRole = context.getWorkspace().asServiceRole;
    const [{ profiles, milestones, assignments }, draftPage] = await Promise.all([
      adminDataset(serviceRole),
      serviceRole.entities.Draft.list({ sort: "-submitted_date", limit: 500 }),
    ]);
    const drafts = draftPage.items;
    const now = today();

    const students = profiles
      .map((profile) => {
        const studentMilestones = milestones
          .filter((milestone) => milestone.student_email === profile.student_email)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        const approved = studentMilestones.filter((milestone) => milestone.status === "approved").length;
        const overdueMilestones = studentMilestones.filter(
          (milestone) => milestone.status !== "approved" && milestone.due_date && milestone.due_date < now,
        );
        const nextMilestone = studentMilestones.find((milestone) => milestone.status !== "approved");
        const progress = studentMilestones.length ? Math.round((approved / studentMilestones.length) * 100) : profile.progress || 0;
        const assignment = assignments.find((item) => item.student_email === profile.student_email);
        const studentDrafts = drafts.filter((draft) => draft.student_email === profile.student_email);
        const latest = studentDrafts[0];

        return {
          student_name: profile.student_name,
          student_email: profile.student_email,
          matric_number: profile.matric_number,
          programme: profile.programme,
          department: profile.department,
          faculty: profile.faculty,
          research_title: profile.research_title,
          supervisor_name: profile.supervisor_name || "Unassigned",
          progress,
          approved,
          total: studentMilestones.length,
          overdue: overdueMilestones.length,
          next: nextMilestone
            ? { title: nextMilestone.title, due_date: nextMilestone.due_date, status: nextMilestone.status }
            : null,
          status: assignment ? attentionStatus(progress, overdueMilestones.length) : "awaiting",
          milestones: studentMilestones.map((milestone) => ({
            id: milestone.id,
            title: milestone.title,
            order: milestone.order,
            status: milestone.status,
            due_date: milestone.due_date,
          })),
          drafts: {
            total: studentDrafts.length,
            awaitingReview: studentDrafts.filter((draft) => draft.status === "submitted" || draft.status === "under_review").length,
            revisions: studentDrafts.filter((draft) => draft.status === "revision_required").length,
            approved: studentDrafts.filter((draft) => draft.status === "approved").length,
            latest: latest
              ? {
                  id: latest.id,
                  version: latest.version,
                  status: latest.status,
                  milestone_title: latest.milestone_title,
                  title: latest.title,
                  submitted_date: latest.submitted_date,
                }
              : null,
          },
        };
      })
      .sort((a, b) => a.progress - b.progress);

    const totals = {
      students: students.length,
      drafts: drafts.length,
      awaitingReview: students.reduce((sum, student) => sum + student.drafts.awaitingReview, 0),
      revisions: students.reduce((sum, student) => sum + student.drafts.revisions, 0),
      overdue: students.reduce((sum, student) => sum + student.overdue, 0),
    };

    return { students, totals };
  });

export const getAdminDirectory = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    if (!isAdmin(context.user)) throw forbidden();
    const serviceRole = context.getWorkspace().asServiceRole;
    const { users, profiles, supervisors, assignments } = await adminDataset(serviceRole);

    return users.map((user) => {
      const role = user.role === "admin" ? "admin" : user.app_role || "student";
      const profile = profiles.find((item) => item.student_email === user.email);
      const supervisor = supervisors.find((item) => item.email === user.email);
      return {
        id: user.id,
        full_name: user.full_name || profile?.student_name || supervisor?.full_name || user.email,
        email: user.email,
        role,
        department: profile?.department || supervisor?.department || user.department || "—",
        faculty: profile?.faculty || supervisor?.faculty || user.faculty || "—",
        programme: profile?.programme || "—",
        detail:
          role === "supervisor"
            ? `${supervisor?.current_load || 0}/${supervisor?.max_capacity || 0} supervision slots`
            : role === "student"
              ? profile?.research_title || "No research profile yet"
              : `${assignments.filter((assignment) => assignment.status === "active").length} active supervisions`,
        created_date: user.created_date,
      };
    });
  });

export const getAdminOperations = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    if (!isAdmin(context.user)) throw forbidden();
    const serviceRole = context.getWorkspace().asServiceRole;
    const { defences, assignments, milestones, profiles, supervisors } = await adminDataset(serviceRole);
    const now = today();

    const upcoming = milestones
      .filter((milestone) => milestone.status !== "approved" && milestone.due_date >= now)
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .slice(0, 10)
      .map((milestone) => ({
        id: milestone.id,
        student_name: milestone.student_name,
        student_email: milestone.student_email,
        title: milestone.title,
        due_date: milestone.due_date,
        status: milestone.status,
      }));

    return {
      defences,
      upcoming,
      candidates: assignments
        .filter((assignment) => assignment.status === "active")
        .map((assignment) => ({
          student_name: assignment.student_name,
          student_email: assignment.student_email,
          supervisor_name: assignment.supervisor_name,
          supervisor_email: assignment.supervisor_email,
          department: assignment.department,
        })),
      departments: [...new Set(profiles.map((profile) => profile.department).filter(Boolean))].sort(),
      supervisorCount: supervisors.length,
    };
  });

export const scheduleDefence = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      studentEmail: z.string().min(3).max(200),
      scheduledDate: z.string().min(8).max(20),
      scheduledTime: z.string().max(20).optional(),
      venue: z.string().max(160).optional(),
      panel: z.string().max(400).optional(),
      notes: z.string().max(600).optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    if (!isAdmin(context.user)) throw forbidden();
    const serviceRole = context.getWorkspace().asServiceRole;
    const { assignments } = await adminDataset(serviceRole);
    const assignment = assignments.find((item) => item.student_email === data.studentEmail);

    const defence = await serviceRole.entities.Defence.create({
      student_email: data.studentEmail,
      student_name: assignment?.student_name || data.studentEmail,
      supervisor_email: assignment?.supervisor_email || "",
      supervisor_name: assignment?.supervisor_name || "",
      department: assignment?.department || "",
      scheduled_date: data.scheduledDate,
      scheduled_time: data.scheduledTime || "",
      venue: data.venue || "",
      panel: data.panel || "",
      status: "scheduled",
      notes: data.notes || "",
    });

    await notify(serviceRole, {
      email: data.studentEmail,
      title: "Defence scheduled",
      message: `Your defence is scheduled for ${data.scheduledDate}${data.scheduledTime ? ` at ${data.scheduledTime}` : ""}.`,
      type: "milestone",
      link: "/student/milestones",
    });
    if (assignment?.supervisor_email) {
      await notify(serviceRole, {
        email: assignment.supervisor_email,
        title: "Defence scheduled",
        message: `A defence date was set for ${assignment.student_name || data.studentEmail}.`,
        type: "milestone",
        link: "/supervisor/students",
      });
    }

    return { ok: true, id: defence.id };
  });

export const updateDefenceStatus = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ defenceId: z.string().min(1), status: z.enum(["scheduled", "completed", "postponed"]) }))
  .handler(async ({ context, data }) => {
    if (!isAdmin(context.user)) throw forbidden();
    const serviceRole = context.getWorkspace().asServiceRole;
    await serviceRole.entities.Defence.update(data.defenceId, { status: data.status });
    return { ok: true };
  });

export const getAdminReports = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    if (!isAdmin(context.user)) throw forbidden();
    const serviceRole = context.getWorkspace().asServiceRole;
    const { profiles, milestones, assignments, supervisors, users, defences } = await adminDataset(serviceRole);
    const now = today();

    const statusCounts = ["pending", "in_progress", "submitted", "revision_required", "approved"].map((status) => ({
      status,
      count: milestones.filter((milestone) => milestone.status === status).length,
    }));

    const byDepartment = [...new Set(profiles.map((profile) => profile.department).filter(Boolean))]
      .map((department) => {
        const departmentStudents = profiles.filter((profile) => profile.department === department);
        const departmentMilestones = milestones.filter((milestone) =>
          departmentStudents.some((profile) => profile.student_email === milestone.student_email),
        );
        const approved = departmentMilestones.filter((milestone) => milestone.status === "approved").length;
        const overdue = departmentMilestones.filter(
          (milestone) => milestone.status !== "approved" && milestone.due_date && milestone.due_date < now,
        ).length;
        return {
          department,
          students: departmentStudents.length,
          supervisors: supervisors.filter((supervisor) => supervisor.department === department).length,
          approved,
          total: departmentMilestones.length,
          progress: departmentMilestones.length ? Math.round((approved / departmentMilestones.length) * 100) : 0,
          overdue,
        };
      })
      .sort((a, b) => b.students - a.students);

    // Completion per stage of the core cycle, keyed by milestone order so every
    // department's cycles are compared on the same stage.
    const stages = CORE_MILESTONES.map((stage, index) => {
      const stageMilestones = milestones.filter((milestone) => Number(milestone.order) === index + 1);
      const stageApproved = stageMilestones.filter((milestone) => milestone.status === "approved").length;
      return {
        stage: stage.title,
        approved: stageApproved,
        total: stageMilestones.length,
        rate: stageMilestones.length ? Math.round((stageApproved / stageMilestones.length) * 100) : 0,
      };
    });

    return {
      statusCounts,
      byDepartment,
      stages,
      totals: {
        students: profiles.length,
        supervisors: supervisors.length,
        assignments: assignments.length,
        completed: milestones.filter((milestone) => milestone.status === "approved").length,
        revisions: milestones.filter((milestone) => milestone.status === "revision_required").length,
        defences: defences.length,
        users: users.length,
        averageProgress: profiles.length
          ? Math.round(profiles.reduce((sum, profile) => sum + Number(profile.progress || 0), 0) / profiles.length)
          : 0,
      },
    };
  });

// ---- reports & tickets ---------------------------------------------------

export const createTicket = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      sendTo: z.string().min(2).max(120),
      category: z.string().min(2).max(160),
      relatedItem: z.string().max(220).optional(),
      impact: z.enum(["Low", "Normal", "High"]),
      description: z.string().min(15).max(4000),
      attachmentName: z.string().max(200).optional(),
      attachmentUri: z.string().max(600).optional(),
      attachmentSize: z.string().max(40).optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { user } = context;
    const serviceRole = context.getWorkspace().asServiceRole;
    const { items: existing } = await serviceRole.entities.Ticket.list({ sort: "-created_date", limit: 500 });
    const reference = `RPT-${String(24 + existing.length).padStart(3, "0")}`;
    const now = new Date().toISOString();

    const ticket = await serviceRole.entities.Ticket.create({
      reference,
      student_email: user.email,
      student_name: user.full_name || user.email,
      send_to: data.sendTo,
      category: data.category,
      subject: data.category,
      related_item: data.relatedItem || "",
      impact: data.impact,
      priority: data.impact === "High" ? "High" : "Normal",
      description: data.description,
      attachment_name: data.attachmentName || "",
      attachment_uri: data.attachmentUri || "",
      attachment_size: data.attachmentSize || "",
      status: "open",
      last_update: now,
    });

    await serviceRole.entities.TicketUpdate.create({
      ticket_id: ticket.id,
      ticket_reference: reference,
      student_email: user.email,
      author_email: user.email,
      author_name: user.full_name || user.email,
      author_role: "student",
      body: "Ticket submitted with supporting evidence.",
      is_official: false,
    });

    const admins = (await serviceRole.entities.User.list()).filter((candidate) => candidate.role === "admin");
    await Promise.all(
      admins.map((admin) =>
        notify(serviceRole, {
          email: admin.email,
          title: `New ticket ${reference}`,
          message: `${user.full_name || user.email} reported: ${data.category}.`,
          type: "system",
          link: "/admin",
        }),
      ),
    );

    return { id: ticket.id, reference };
  });

export const replyToTicket = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ ticketId: z.string().min(1), body: z.string().min(2).max(4000) }))
  .handler(async ({ context, data }) => {
    const { user } = context;
    const serviceRole = context.getWorkspace().asServiceRole;
    const ticket = await serviceRole.entities.Ticket.get(data.ticketId).catch(() => null);
    if (!ticket) throw notFound("Ticket");
    if (ticket.student_email !== user.email && !isAdmin(user)) throw forbidden();

    await serviceRole.entities.TicketUpdate.create({
      ticket_id: ticket.id,
      ticket_reference: ticket.reference,
      student_email: ticket.student_email,
      author_email: user.email,
      author_name: user.full_name || user.email,
      author_role: isAdmin(user) ? "admin" : "student",
      body: data.body,
      is_official: false,
    });
    await serviceRole.entities.Ticket.update(ticket.id, { last_update: new Date().toISOString() });

    const admins = (await serviceRole.entities.User.list()).filter(
      (candidate) => candidate.role === "admin" && candidate.email !== user.email,
    );
    await Promise.all(
      admins.map((admin) =>
        notify(serviceRole, {
          email: admin.email,
          title: `Reply on ${ticket.reference}`,
          message: `${user.full_name || user.email} added more information to a ticket.`,
          type: "system",
          link: "/admin",
        }),
      ),
    );

    return { ok: true };
  });

// ---- administrator ticket desk -------------------------------------------

export const respondToTicket = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      ticketId: z.string().min(1),
      body: z.string().min(2).max(4000),
      status: z.enum(["open", "in_review", "resolved"]),
      isOfficial: z.boolean().optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { user } = context;
    if (!isAdmin(user)) throw forbidden();
    const serviceRole = context.getWorkspace().asServiceRole;
    const ticket = await serviceRole.entities.Ticket.get(data.ticketId).catch(() => null);
    if (!ticket) throw notFound("Ticket");

    const update = await serviceRole.entities.TicketUpdate.create({
      ticket_id: ticket.id,
      ticket_reference: ticket.reference,
      student_email: ticket.student_email,
      author_email: user.email,
      author_name: user.full_name || user.email,
      author_role: "admin",
      body: data.body,
      is_official: data.isOfficial !== false,
    });

    await serviceRole.entities.Ticket.update(ticket.id, {
      status: data.status,
      reviewer_name: user.full_name || user.email,
      last_update: new Date().toISOString(),
    });

    await notify(serviceRole, {
      email: ticket.student_email,
      title: `Response on ${ticket.reference}`,
      message: data.body.length > 160 ? `${data.body.slice(0, 157)}…` : data.body,
      type: "system",
      link: `/student/tickets/${ticket.id}`,
    });

    return { ok: true, updateId: update.id, status: data.status };
  });

// ---- Local matching engine (administrator) -------------------------------

export const getMatchingEngine = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    if (!isAdmin(context.user)) throw forbidden();
    const serviceRole = context.getWorkspace().asServiceRole;
    const config = await loadMatchingConfig(serviceRole);

    const [profilesPage, supervisorsPage, recommendationsPage, runsPage] = await Promise.all([
      serviceRole.entities.ResearchProfile.list({ sort: "-created_date", limit: 300 }),
      serviceRole.entities.SupervisorProfile.list({ sort: "-created_date", limit: 300 }),
      serviceRole.entities.Recommendation.list({ sort: "-match_score", limit: 300 }),
      serviceRole.entities.MatchingRun.list({ sort: "-created_date", limit: 10 }),
    ]);

    const profiles = profilesPage.items || [];
    const supervisors = supervisorsPage.items || [];
    const recommendations = recommendationsPage.items || [];
    const indexed = supervisors.filter(
      (supervisor) => (supervisor.research_areas || "").trim() || (supervisor.keywords || "").trim(),
    );
    const pending = recommendations.filter((recommendation) => recommendation.status === "pending");
    const scores = pending.map((recommendation) => Number(recommendation.match_score || 0)).filter((score) => score > 0);

    return {
      config,
      runs: runsPage.items || [],
      corpus: {
        profiles: profiles.length,
        awaiting: profiles.filter((profile) => profile.status === "submitted" && !profile.supervisor_email).length,
        supervisors: supervisors.length,
        indexed: indexed.length,
        coverage: supervisors.length ? Math.round((indexed.length / supervisors.length) * 100) : 0,
        pendingMatches: pending.length,
        averageConfidence: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0,
      },
    };
  });

export const saveMatchingEngine = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      engine_enabled: z.boolean(),
      provider: z.string().min(2).max(80),
      model: z.literal("tfidf-cosine"),
      embedding_model: z.string().min(2).max(80),
      embedding_dimensions: z.number().int().min(64).max(4096),
      similarity_weight: z.number().min(0).max(1),
      capacity_weight: z.number().min(0).max(0.6),
      department_boost: z.number().min(0).max(0.2),
      level_boost: z.number().min(0).max(0.2),
      min_score: z.number().min(0).max(90),
      top_matches: z.number().int().min(1).max(5),
      auto_run: z.boolean(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { user } = context;
    if (!isAdmin(user)) throw forbidden();
    const serviceRole = context.getWorkspace().asServiceRole;
    const page = await serviceRole.entities.MatchingConfig.list({ sort: "-created_date", limit: 1 });
    const existing = page.items?.[0];
    const payload = { ...data, updated_by: user.email };

    const saved = existing
      ? await serviceRole.entities.MatchingConfig.update(existing.id, payload)
      : await serviceRole.entities.MatchingConfig.create(payload);

    return { ok: true, config: normaliseConfig(saved) };
  });