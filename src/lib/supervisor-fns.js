import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";
import { DEFAULT_SUPERVISOR_SETTINGS } from "@/lib/supervisor-settings";

// Supervisor-portal reads: one aggregated payload per screen so the queue, student list,
// progress and timeline views all speak about the same live data.

const isAdmin = (user) =>
  [user?.role, user?.app_role].some((role) => ["admin", "administrator"].includes(String(role || "").toLowerCase()));

function forbidden() {
  setResponseStatus(403);
  return Object.assign(new Error("You do not have access to this action"), { status: 403 });
}
function notFound(what) {
  setResponseStatus(404);
  return Object.assign(new Error(`${what} not found`), { status: 404 });
}

const isoToday = () => new Date().toISOString().slice(0, 10);
const startOfDay = (value) => new Date(`${value}T00:00:00`);
function daysUntil(dateString) {
  if (!dateString) return null;
  return Math.round((startOfDay(dateString).getTime() - startOfDay(isoToday()).getTime()) / 86400000);
}

function latestActivity(studentDrafts, milestone) {
  const stamps = [
    ...studentDrafts.map((draft) => draft.submitted_date),
    milestone?.completed_date,
  ].filter(Boolean);
  return stamps.sort((a, b) => String(b).localeCompare(String(a)))[0] || null;
}

function studentStatus({ pendingDraft, overdue, daysLeft }) {
  if (pendingDraft) return "awaiting_review";
  if (overdue > 0) return "needs_attention";
  if (daysLeft !== null && daysLeft < 10) return "needs_attention";
  return "on_track";
}

export const getSupervisorPortal = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const { user } = context;
    const serviceRole = context.getWorkspace().asServiceRole;
    const email = user.email;

    const [profilePage, assignmentPage, milestonePage, draftPage, defencePage, researchPages, feedbackPage] = await Promise.all([
      serviceRole.entities.SupervisorProfile.filter({ email }, { limit: 1 }),
      serviceRole.entities.Assignment.filter({ supervisor_email: email }, { sort: "-created_date", limit: 100 }),
      serviceRole.entities.Milestone.filter({ supervisor_email: email }, { sort: "order", limit: 400 }),
      serviceRole.entities.Draft.filter({ supervisor_email: email }, { sort: "-submitted_date", limit: 300 }),
      serviceRole.entities.Defence.list({ sort: "scheduled_date", limit: 100 }),
      serviceRole.entities.ResearchProfile.list({ sort: "-created_date", limit: 400 }),
      serviceRole.entities.Feedback.filter({ supervisor_email: email }, { sort: "-reviewed_date", limit: 200 }),
    ]);

    const milestones = milestonePage.items || [];
    const drafts = draftPage.items || [];
    const department = profilePage.items?.[0]?.department || user.department || "";
    const defences = (defencePage.items || []).filter((defence) =>
      defence.scope === "department"
        ? defence.department === department
        : defence.supervisor_email === email,
    );
    const research = researchPages.items || [];
    const feedback = feedbackPage.items || [];

    const students = (assignmentPage.items || []).map((assignment) => {
      const researchProfile = research.find((item) => item.student_email === assignment.student_email) || null;
      const studentMilestones = milestones
        .filter((milestone) => milestone.student_email === assignment.student_email)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      const approved = studentMilestones.filter((milestone) => milestone.status === "approved").length;
      const progress = studentMilestones.length
        ? Math.round((approved / studentMilestones.length) * 100)
        : Number(assignment.progress || 0);

      const studentDrafts = drafts.filter((draft) => draft.student_email === assignment.student_email);
      const pendingDraft = studentDrafts.find((draft) => draft.status === "submitted" || draft.status === "under_review") || null;
      const revisions = studentDrafts.filter((draft) => draft.status === "revision_required").length;
      const nextMilestone = studentMilestones.find((milestone) => milestone.status !== "approved") || null;
      const overdue = studentMilestones.filter(
        (milestone) => milestone.status !== "approved" && milestone.due_date && milestone.due_date < isoToday(),
      ).length;
      const defence =
        defences.find((item) => item.student_email === assignment.student_email && item.status === "scheduled") ||
        defences.find((item) => item.student_email === assignment.student_email) ||
        null;
      const daysLeft = nextMilestone?.due_date
        ? daysUntil(nextMilestone.due_date)
        : defence?.scheduled_date
          ? daysUntil(defence.scheduled_date)
          : null;

      return {
        id: assignment.id,
        student_name: assignment.student_name || researchProfile?.student_name || assignment.student_email,
        student_email: assignment.student_email,
        research_title: assignment.research_title || researchProfile?.research_title || "",
        programme: [researchProfile?.level, researchProfile?.department || assignment.department].filter(Boolean).join(" • "),
        department: assignment.department || researchProfile?.department || "",
        stage: nextMilestone?.title || (studentMilestones.length ? "Cycle complete" : "Not started"),
        next_milestone: nextMilestone
          ? { title: nextMilestone.title, due_date: nextMilestone.due_date, status: nextMilestone.status }
          : null,
        progress,
        approved,
        total: studentMilestones.length,
        milestones: studentMilestones.map((milestone) => ({
          id: milestone.id,
          title: milestone.title,
          order: milestone.order,
          status: milestone.status,
          due_date: milestone.due_date,
          days_left: daysUntil(milestone.due_date),
        })),
        drafts: studentDrafts.slice(0, 8).map((draft) => ({
          id: draft.id,
          version: draft.version,
          status: draft.status,
          title: draft.title,
          milestone_title: draft.milestone_title,
          submitted_date: draft.submitted_date,
        })),
        pending_draft: pendingDraft
          ? {
              id: pendingDraft.id,
              version: pendingDraft.version,
              title: pendingDraft.title,
              milestone_title: pendingDraft.milestone_title,
              submitted_date: pendingDraft.submitted_date,
            }
          : null,
        revisions,
        overdue,
        days_left: daysLeft,
        status: studentStatus({ pendingDraft, overdue, daysLeft }),
        defence: defence
          ? {
              id: defence.id,
              scheduled_date: defence.scheduled_date,
              scheduled_time: defence.scheduled_time,
              venue: defence.venue,
              status: defence.status,
              days_left: daysUntil(defence.scheduled_date),
            }
          : null,
        last_activity: latestActivity(studentDrafts, studentMilestones[studentMilestones.length - 1]),
        feedback_count: feedback.filter((item) => item.student_email === assignment.student_email).length,
      };
    });

    const pending = drafts
      .filter((draft) => draft.status === "submitted" || draft.status === "under_review")
      .sort((a, b) => String(a.submitted_date).localeCompare(String(b.submitted_date)))
      .map((draft) => ({
        id: draft.id,
        student_name: draft.student_name || draft.student_email,
        student_email: draft.student_email,
        milestone_title: draft.milestone_title,
        version: draft.version,
        submitted_date: draft.submitted_date,
        status: draft.status,
        days_waiting: draft.submitted_date ? Math.abs(daysUntil(String(draft.submitted_date).slice(0, 10)) || 0) : 0,
      }));

    const upcoming = students
      .filter((student) => student.days_left !== null && student.days_left >= 0)
      .sort((a, b) => a.days_left - b.days_left);
    const nearestDefence = students
      .map((student) => student.defence)
      .filter((defence) => defence && defence.scheduled_date && defence.days_left !== null && defence.days_left >= 0)
      .sort((a, b) => a.days_left - b.days_left)[0] || null;

    return {
      profile: profilePage.items?.[0] || null,
      students: students.sort((a, b) => a.progress - b.progress),
      pending,
      defences: defences.slice(0, 20),
      upcoming: upcoming.slice(0, 6),
      nearestDefence,
      totals: {
        students: students.length,
        milestonesApproved: students.reduce((sum, student) => sum + student.approved, 0),
        milestonesTotal: students.reduce((sum, student) => sum + student.total, 0),
        awaitingReview: pending.length,
        revisions: drafts.filter((draft) => draft.status === "revision_required").length,
        dueSoon: milestones.filter((milestone) => {
          const days = daysUntil(milestone.due_date);
          return milestone.status !== "approved" && days !== null && days >= 0 && days <= 7;
        }).length,
        dueWithin30: students.filter((student) => student.days_left !== null && student.days_left <= 30).length,
        needsAttention: students.filter((student) => student.status === "needs_attention").length,
        onTrack: students.filter((student) => student.status === "on_track").length,
        awaitingReviewStudents: students.filter((student) => student.status === "awaiting_review").length,
        oldestWaiting: pending[0]?.days_waiting || 0,
      },
    };
  });

export const getDraftReview = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .validator(z.object({ draftId: z.string().min(1) }))
  .handler(async ({ context, data }) => {
    const { user } = context;
    const serviceRole = context.getWorkspace().asServiceRole;
    const draft = await serviceRole.entities.Draft.get(data.draftId).catch(() => null);
    if (!draft) throw notFound("Draft");
    if (draft.supervisor_email !== user.email && !isAdmin(user)) throw forbidden();

    const [versionsPage, feedbackPage, milestone, profilePage, assignmentPage] = await Promise.all([
      serviceRole.entities.Draft.filter({ milestone_id: draft.milestone_id }, { sort: "-version", limit: 30 }),
      serviceRole.entities.Feedback.filter({ milestone_id: draft.milestone_id }, { sort: "-reviewed_date", limit: 30 }),
      serviceRole.entities.Milestone.get(draft.milestone_id).catch(() => null),
      serviceRole.entities.ResearchProfile.filter({ student_email: draft.student_email }, { limit: 1 }),
      serviceRole.entities.Assignment.filter({ student_email: draft.student_email }, { limit: 5 }),
    ]);

    const versions = versionsPage.items || [];
    const history = feedbackPage.items || [];

    return {
      draft,
      milestone,
      versions: versions.map((version) => ({
        id: version.id,
        version: version.version,
        status: version.status,
        title: version.title,
        submitted_date: version.submitted_date,
      })),
      feedback: history.filter((item) => item.draft_id === draft.id),
      history: history.map((item) => ({
        id: item.id,
        draft_id: item.draft_id,
        version: item.version,
        outcome: item.outcome,
        comments: item.comments,
        reviewed_date: item.reviewed_date,
      })),
      profile: profilePage.items?.[0] || null,
      assignment: assignmentPage.items?.[0] || null,
    };
  });

// ---- supervisor settings --------------------------------------------------

const SupervisorSettingsInput = z.object({
  available: z.boolean(),
  max_capacity: z.number().int().min(1).max(20),
  review_note_required: z.boolean(),
  review_show_versions: z.boolean(),
  review_deadline_reminders: z.boolean(),
  notify_submissions: z.boolean(),
  notify_messages: z.boolean(),
  notify_milestones: z.boolean(),
  notify_defences: z.boolean(),
  notify_admin: z.boolean(),
});

export const getSupervisorSettings = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const { user } = context;
    const serviceRole = context.getWorkspace().asServiceRole;

    const [profilePage, userPage, assignmentPage] = await Promise.all([
      serviceRole.entities.SupervisorProfile.filter({ email: user.email }, { limit: 1 }),
      serviceRole.entities.User.filter({ email: user.email }, { limit: 1 }),
      serviceRole.entities.Assignment.filter({ supervisor_email: user.email }, { limit: 100 }),
    ]);

    const profile = profilePage.items?.[0] || null;
    const record = userPage.items?.[0] || null;
    const saved = { ...DEFAULT_SUPERVISOR_SETTINGS, ...(record?.settings || {}) };

    return {
      profile: profile
        ? {
            id: profile.id,
            full_name: profile.full_name,
            department: profile.department,
            faculty: profile.faculty,
            academic_rank: profile.academic_rank,
          }
        : null,
      settings: {
        ...saved,
        available: profile ? profile.availability !== "unavailable" : saved.available,
        max_capacity: Number(profile?.max_capacity || saved.max_capacity || 5),
      },
      load: (assignmentPage.items || []).filter((assignment) => assignment.status === "active").length,
      account: { full_name: record?.full_name || user.full_name || "", email: user.email },
      updated: record?.updated_date || null,
    };
  });

export const saveSupervisorSettings = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(SupervisorSettingsInput)
  .handler(async ({ context, data }) => {
    const { user } = context;
    const serviceRole = context.getWorkspace().asServiceRole;
    const availability = data.available ? "available" : "unavailable";

    const [profilePage, userPage] = await Promise.all([
      serviceRole.entities.SupervisorProfile.filter({ email: user.email }, { limit: 1 }),
      serviceRole.entities.User.filter({ email: user.email }, { limit: 1 }),
    ]);

    const profile = profilePage.items?.[0];
    if (profile) {
      await serviceRole.entities.SupervisorProfile.update(profile.id, {
        availability,
        max_capacity: data.max_capacity,
      });
    } else {
      await serviceRole.entities.SupervisorProfile.create({
        email: user.email,
        full_name: user.full_name || user.email,
        availability,
        max_capacity: data.max_capacity,
      });
    }

    const record = userPage.items?.[0];
    const { available, ...preferences } = data;
    if (record) {
      await serviceRole.entities.User.update(record.id, {
        settings: { ...(record.settings || {}), ...preferences, available },
      });
    }

    return { ok: true, availability, max_capacity: data.max_capacity };
  });