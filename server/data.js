import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { makePasswordHash } from "./auth.js";

const STATE_FORMAT = "researchdesk-state";
const STATE_VERSION = 1;
const DEMO_USER_IDS = new Set(["usr-1", "usr-2", "usr-3", "usr-4", "usr-5", "usr-6", "usr-7"]);
const DEMO_EMAILS = new Set([
  "amara.nwosu@example.edu",
  "amina.yusuf@example.edu",
  "ibrahim.musa@example.edu",
  "zainab.bello@example.edu",
  "fatima.bello@example.edu",
  "admin@example.edu",
  "chidi.obi@example.edu",
]);
const ENTITY_NAMES = [
  "Assignment", "Defence", "Draft", "Feedback", "MatchingConfig", "MatchingRun", "Milestone",
  "Notification", "Recommendation", "ResearchProfile", "SupervisorProfile", "Ticket",
  "TicketUpdate", "User", "WritingDocument",
];

export function createStore(databasePath = ":memory:") {
  const demoDataEnabled = process.env.NODE_ENV !== "production" || process.env.SEED_DEMO_DATA === "true";
  const users = [
    {
      id: "usr-1",
      name: "Amara Nwosu",
      email: "amara.nwosu@example.edu",
      identifier: "MIT/IMS/2026/014",
      role: "Student",
      status: "Active",
      department: "Information Technology",
      faculty: "Faculty of Computing",
    },
    {
      id: "usr-2",
      name: "Dr. Amina Yusuf",
      email: "amina.yusuf@example.edu",
      identifier: "Staff ID PG/204",
      role: "Supervisor",
      status: "Active",
      department: "Information Technology",
      faculty: "Faculty of Computing",
    },
    {
      id: "usr-3",
      name: "Ibrahim Musa",
      email: "ibrahim.musa@example.edu",
      identifier: "MSc/CSC/2026/021",
      role: "Student",
      status: "Active",
      department: "Computer Science",
      faculty: "Faculty of Computing",
    },
    {
      id: "usr-4",
      name: "Zainab Bello",
      email: "zainab.bello@example.edu",
      identifier: "MSc/ECO/2026/006",
      role: "Student",
      status: "Active",
      department: "Economics",
      faculty: "Faculty of Social Sciences",
    },
    {
      id: "usr-5",
      name: "Dr. Fatima Bello",
      email: "fatima.bello@example.edu",
      identifier: "Staff ID PG/119",
      role: "Supervisor",
      status: "Active",
      department: "Computer Science",
      faculty: "Faculty of Computing",
    },
    {
      id: "usr-6",
      name: "Postgraduate Admin",
      email: "admin@example.edu",
      identifier: "PG/ADMIN/001",
      role: "Administrator",
      status: "Active",
      department: "Postgraduate School",
      faculty: "Graduate Studies",
    },
    {
      id: "usr-7",
      name: "Chidi Obi",
      email: "chidi.obi@example.edu",
      identifier: "MIT/IMS/2025/018",
      role: "Student",
      status: "Active",
      department: "Information Technology",
      faculty: "Faculty of Computing",
    },
  ];

  const profiles = new Map([
    [
      "usr-2",
      {
        id: "usr-2",
        department: "Information Management Systems",
        academicRank: "Senior Lecturer",
        researchAreas:
          "Information systems, digital transformation, knowledge management",
        keywords: "AI systems, research supervision, analytics, HCI",
        maxCapacity: "8 students",
        currentLoad: "4 active students",
        availability: "Available for new assignment",
        preferredLevel: "Postgraduate / MIT",
        researchSummary:
          "Research interests include information systems, digital workspaces, knowledge management, technology adoption and the design and evaluation of digital platforms.",
      },
    ],
    [
      "usr-5",
      {
        id: "usr-5",
        department: "Computer Science",
        academicRank: "Lecturer",
        researchAreas: "Applied machine learning, data mining, natural language processing",
        keywords: "machine learning, AI, analytics, data science",
        maxCapacity: "6 students",
        currentLoad: "3 active students",
        availability: "Available for new assignment",
        preferredLevel: "Postgraduate / MSc",
        researchSummary: "Research focuses on applied machine learning, data mining and intelligent data systems.",
      },
    ],
  ]);

  const collections = {
    researchProfiles: [
      {
        id: "research-1",
        title: "Design of an Integrated Digital Workspace for Postgraduate Research Supervision",
        subtitle: "Information Management Systems",
        researchArea: "Information Management Systems",
        keywords: "postgraduate supervision, digital workspace, progress analytics, supervisor recommendation",
        description:
          "A web-based workspace connecting supervisor matching, writing, drafts, feedback, milestones and progress analytics.",
        status: "Not yet submitted",
        owner: "Amara Nwosu",
        updatedAt: "Today",
      },
    ],
    projects: [
      {
        id: "project-1",
        title: "Research workspace",
        subtitle: "Thesis · Information Management Systems",
        description: "Current research project and chapter workspace.",
        status: "In progress",
        owner: "Amara Nwosu",
        updatedAt: "Today",
      },
      {
        id: "project-2",
        title: "Chapter 2 — Literature Review",
        subtitle: "Chapter workspace",
        description: "Literature synthesis and research gap.",
        status: "In progress",
        owner: "Amara Nwosu",
        updatedAt: "Yesterday",
      },
    ],
    chapters: [
      {
        id: "chapter-1",
        projectId: "project-1",
        chapterNo: 1,
        title: "Introduction",
        subtitle: "Chapter 1",
        description: "Research context, problem statement, questions and objectives.",
        status: "Completed",
        progress: 100,
        currentVersion: "Submitted V3",
        dueDate: "30 Oct 2026",
        sections: [
          { title: "Background to the study", status: "Ready" },
          { title: "Problem statement", status: "Ready" },
          { title: "Research questions", status: "Ready" },
          { title: "Objectives and scope", status: "Ready" },
        ],
        owner: "Amara Nwosu",
        updatedAt: "12 Nov 2026",
      },
      {
        id: "chapter-2",
        projectId: "project-1",
        chapterNo: 2,
        title: "Literature Review",
        subtitle: "Chapter 2",
        description: "Related work, conceptual framework and identified gap.",
        status: "Completed",
        progress: 100,
        currentVersion: "Submitted V2",
        dueDate: "08 Nov 2026",
        sections: [
          { title: "Conceptual review", status: "Ready" },
          { title: "Empirical review", status: "Ready" },
          { title: "Theoretical framework", status: "Ready" },
          { title: "Research gap", status: "Ready" },
        ],
        owner: "Amara Nwosu",
        updatedAt: "10 Nov 2026",
      },
      {
        id: "chapter-3",
        projectId: "project-1",
        chapterNo: 3,
        title: "Methodology & System Design",
        subtitle: "Chapter 3",
        description: "Research methodology and design of the digital workspace.",
        status: "In progress",
        progress: 68,
        currentVersion: "Working draft V3",
        dueDate: "14 Nov 2026",
        latestSupervisorNote:
          "Clarify how the survey findings informed the functional requirements before the next submission.",
        sections: [
          { title: "Research methodology", status: "Ready" },
          { title: "Requirements analysis", status: "Ready" },
          { title: "System architecture", status: "Ready" },
          { title: "UI design", status: "In progress" },
          { title: "Supervisor recommendation", status: "In progress" },
          { title: "Tools & implementation stack", status: "Ready" },
        ],
        owner: "Amara Nwosu",
        updatedAt: "Today",
      },
      {
        id: "chapter-4",
        projectId: "project-1",
        chapterNo: 4,
        title: "Implementation",
        subtitle: "Chapter 4",
        description: "Implementation and integration of the research workspace.",
        status: "Not started",
        progress: 0,
        currentVersion: "Not started",
        dueDate: "08 Dec 2026",
        sections: [],
        owner: "Amara Nwosu",
        updatedAt: "Not started",
      },
      {
        id: "chapter-5",
        projectId: "project-1",
        chapterNo: 5,
        title: "Evaluation",
        subtitle: "Chapter 5",
        description: "Evaluation results, discussion and limitations.",
        status: "Not started",
        progress: 0,
        currentVersion: "Not started",
        dueDate: "12 Jan 2027",
        sections: [],
        owner: "Amara Nwosu",
        updatedAt: "Not started",
      },
      {
        id: "chapter-6",
        projectId: "project-1",
        chapterNo: 6,
        title: "Conclusion",
        subtitle: "Chapter 6",
        description: "Summary, contributions and future work.",
        status: "Not started",
        progress: 0,
        currentVersion: "Not started",
        dueDate: "02 Feb 2027",
        sections: [],
        owner: "Amara Nwosu",
        updatedAt: "Not started",
      },
    ],
    collaborations: [
      {
        id: "collab-1",
        projectId: "project-1",
        title: "Chapter 3 working session",
        subtitle: "Chapter 3 · Dr. Amina Yusuf",
        description: "Shared notes on methodology and system design.",
        status: "In progress",
        comments: [
          {
            id: "comment-1",
            author: "Dr. Amina Yusuf",
            text: "Clarify how the survey findings informed the functional requirements.",
            createdAt: "Today",
          },
        ],
        owner: "Amara Nwosu",
        updatedAt: "Today",
      },
    ],
    drafts: [
      {
        id: "draft-1",
        projectId: "project-1",
        milestoneId: "mile-1",
        versionNo: 3,
        title: "Chapter 1 — Introduction",
        subtitle: "Version 3 · Submitted 12 Nov 2026",
        description: "Problem statement, research questions and objectives.",
        status: "Awaiting review",
        owner: "Amara Nwosu",
        updatedAt: "12 Nov 2026",
      },
      {
        id: "draft-2",
        projectId: "project-1",
        milestoneId: "mile-2",
        versionNo: 2,
        title: "Chapter 2 — Literature Review",
        subtitle: "Version 2 · Updated 10 Nov 2026",
        description: "Related work, conceptual framework and identified gap.",
        status: "Revision required",
        owner: "Amara Nwosu",
        updatedAt: "10 Nov 2026",
      },
      {
        id: "draft-3",
        projectId: "project-2",
        milestoneId: "mile-3",
        versionNo: 1,
        title: "Research proposal",
        subtitle: "Version 1 · Submitted 06 Nov 2026",
        description: "Proposal submitted for supervisor feedback.",
        status: "Reviewed",
        owner: "Ibrahim Musa",
        updatedAt: "06 Nov 2026",
      },
    ],
    feedback: [
      {
        id: "feedback-1",
        draftId: "draft-2",
        supervisorId: "usr-2",
        comment:
          "Strengthen the synthesis between the literature themes and the research gap.",
        createdAt: "12 Nov 2026",
        owner: "Dr. Amina Yusuf",
      },
    ],
    milestones: [
      {
        id: "mile-1",
        title: "Research proposal approval",
        subtitle: "Due 20 Nov 2026",
        description: "Finalise the proposal and obtain departmental approval.",
        status: "In progress",
        owner: "Amara Nwosu",
        updatedAt: "Today",
      },
      {
        id: "mile-2",
        title: "Literature review submission",
        subtitle: "Due 04 Dec 2026",
        description: "Submit the reviewed literature chapter.",
        status: "Not started",
        owner: "Amara Nwosu",
        updatedAt: "10 Nov 2026",
      },
      {
        id: "mile-3",
        title: "Proposal defence",
        subtitle: "Completed 30 Oct 2026",
        description: "Proposal defence completed; address panel feedback.",
        status: "Completed",
        owner: "Amara Nwosu",
        updatedAt: "30 Oct 2026",
      },
    ],
    defences: [
      {
        id: "def-1",
        title: "Proposal defence",
        subtitle: "30 Oct 2026 · Completed",
        description: "Panel requested clarification of the evaluation plan.",
        status: "Completed",
        owner: "Amara Nwosu",
        updatedAt: "30 Oct 2026",
      },
      {
        id: "def-2",
        title: "Submit revised methodology",
        subtitle: "Follow-up item · Due 21 Nov 2026",
        description: "Clarify the study design and participant selection.",
        status: "In progress",
        owner: "Amara Nwosu",
        updatedAt: "Today",
      },
    ],
    tickets: [
      {
        id: "ticket-1",
        title: "Unable to update research profile",
        subtitle: "Account support · 14 Nov 2026",
        description: "My research area changes are not appearing in the profile.",
        status: "Open",
        owner: "Amara Nwosu",
        updatedAt: "14 Nov 2026",
      },
    ],
    notifications: [
      {
        id: "notice-1",
        title: "Feedback received on Chapter 2",
        subtitle: "Dr. Amina Yusuf · Today",
        description: "Review the supervisor’s comments and submit a revised version.",
        status: "Unread",
        owner: "Amara Nwosu",
        updatedAt: "Today",
      },
      {
        id: "notice-2",
        title: "Milestone due soon",
        subtitle: "Research proposal approval · 20 Nov 2026",
        description: "Your proposal approval milestone is due in four days.",
        status: "Unread",
        owner: "Amara Nwosu",
        updatedAt: "Today",
      },
    ],
    recommendations: [
      {
        id: "rec-1",
        projectId: "project-1",
        studentId: "usr-1",
        supervisorId: "usr-2",
        department: "Information Technology",
        title: "Amara Nwosu — Digital research workspaces",
        subtitle: "Information Technology · 92% match",
        description: "Strong alignment with knowledge management and digital platforms.",
        status: "Pending review",
        owner: "Dr. Amina Yusuf",
        updatedAt: "Today",
        score: 92,
        rankPosition: 1,
        availableSlots: 7,
      },
      {
        id: "rec-2",
        projectId: "project-2",
        studentId: "usr-3",
        supervisorId: "usr-5",
        department: "Computer Science",
        title: "Ibrahim Musa — Applied machine learning",
        subtitle: "Computer Science · 86% match",
        description: "Expertise and capacity checks passed.",
        status: "Pending review",
        owner: "Dr. Fatima Bello",
        updatedAt: "Today",
        score: 86,
        rankPosition: 1,
        availableSlots: 6,
      },
      {
        id: "rec-3",
        department: "Economics",
        title: "Zainab Bello — Digital financial inclusion",
        subtitle: "Economics · 78% match",
        description: "No eligible supervisor is available in Economics. Resolve this within the department; cross-department assignment is not permitted.",
        status: "Needs attention",
        owner: "Unassigned",
        updatedAt: "Yesterday",
      },
    ],
    assignments: [
      {
        id: "assignment-1",
        title: "Chidi Obi → Dr. Amina Yusuf",
        subtitle: "Information Technology · 12 Nov 2026",
        description: "Supervisor assignment confirmed.",
        status: "Assigned",
        owner: "Postgraduate Admin",
        updatedAt: "12 Nov 2026",
        studentId: "usr-7",
        supervisorId: "usr-2",
      },
    ],
    reviews: [
      {
        id: "review-1",
        draftId: "draft-1",
        title: "Chapter 1 — Introduction · Amara Nwosu",
        subtitle: "Version 3 · Submitted 12 Nov 2026",
        description: "Review the submitted chapter and provide actionable feedback.",
        status: "Awaiting review",
        owner: "Dr. Amina Yusuf",
        dueDate: "Today",
        submittedAt: "2 hours ago",
        lastOpenedAt: "20 min ago",
        revisionCycles: 1,
        updatedAt: "12 Nov 2026",
      },
      {
        id: "review-2",
        draftId: "draft-3",
        title: "Research proposal · Ibrahim Musa",
        subtitle: "Version 1 · Submitted 06 Nov 2026",
        description: "Proposal draft awaiting supervisor review.",
        status: "Awaiting review",
        owner: "Dr. Amina Yusuf",
        dueDate: "Tomorrow",
        submittedAt: "3 days ago",
        lastOpenedAt: "",
        revisionCycles: 0,
        updatedAt: "06 Nov 2026",
      },
    ],
    progress: [
      {
        id: "progress-1",
        projectId: "project-1",
        milestoneId: "mile-3",
        title: "Proposal defence completed",
        activityType: "Milestone completed",
        activityDate: "30 Oct 2026",
        status: "Completed",
        owner: "Amara Nwosu",
      },
      {
        id: "progress-2",
        projectId: "project-1",
        milestoneId: "mile-1",
        title: "Proposal approval work started",
        activityType: "Milestone updated",
        activityDate: "Today",
        status: "In progress",
        owner: "Amara Nwosu",
      },
    ],
  };
  if (!demoDataEnabled) {
    users.length = 0;
    profiles.clear();
    for (const key of Object.keys(collections)) collections[key] = [];
  }

  const entities = Object.fromEntries(ENTITY_NAMES.map((name) => [name, []]));
  let entitiesVersion = 0;
  entities.User = users.map((user) => ({
    id: user.id,
    email: user.email,
    full_name: user.name,
    app_role: user.role.toLowerCase() === "administrator" ? "admin" : user.role.toLowerCase(),
    role: user.role.toLowerCase() === "administrator" ? "admin" : user.role.toLowerCase(),
    department: user.department,
    faculty: user.faculty,
    status: user.status,
  }));

  if (databasePath !== ":memory:") mkdirSync(dirname(databasePath), { recursive: true });
  const database = new DatabaseSync(databasePath);
  database.exec(`
    CREATE TABLE IF NOT EXISTS app_state (
      state_key TEXT PRIMARY KEY CHECK (state_key = 'primary'),
      format TEXT NOT NULL,
      version INTEGER NOT NULL,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS entity_records (
      entity TEXT NOT NULL,
      record_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (entity, record_id)
    );
    CREATE INDEX IF NOT EXISTS entity_records_by_entity ON entity_records(entity)
  `);

  const persisted = database.prepare("SELECT format, version, payload FROM app_state WHERE state_key = 'primary'").get();
  let removedDemoAccounts = false;
  if (persisted) {
    if (persisted.format !== STATE_FORMAT || persisted.version !== STATE_VERSION) {
      database.close();
      throw new Error("The SQLite workspace state uses an unsupported format or version.");
    }
    let snapshot;
    try {
      snapshot = JSON.parse(persisted.payload);
    } catch (error) {
      database.close();
      throw new Error("The SQLite workspace state is corrupt and could not be loaded.", { cause: error });
    }
    if (
      !snapshot ||
      !Array.isArray(snapshot.users) ||
      !Array.isArray(snapshot.profiles) ||
      !snapshot.collections ||
      typeof snapshot.collections !== "object" ||
      Array.isArray(snapshot.collections) ||
      snapshot.profiles.some((entry) => !Array.isArray(entry) || entry.length !== 2) ||
      Object.values(snapshot.collections).some((records) => !Array.isArray(records))
    ) {
      database.close();
      throw new Error("The SQLite workspace state has an invalid structure.");
    }
    users.splice(0, users.length, ...snapshot.users);
    profiles.clear();
    snapshot.profiles.forEach(([id, profile]) => profiles.set(id, profile));
    Object.keys(collections).forEach((key) => delete collections[key]);
    Object.assign(collections, snapshot.collections);
    if (snapshot.entities && typeof snapshot.entities === "object") {
      for (const name of ENTITY_NAMES) {
        if (Array.isArray(snapshot.entities[name])) entities[name] = snapshot.entities[name];
      }
      entitiesVersion = Number(snapshot.entities_version) || 0;
    } else {
      entities.User = users.map((user) => ({
        id: user.id,
        email: user.email,
        full_name: user.name,
        app_role: user.role.toLowerCase() === "administrator" ? "admin" : user.role.toLowerCase(),
        role: user.role.toLowerCase() === "administrator" ? "admin" : user.role.toLowerCase(),
        department: user.department,
        faculty: user.faculty,
        status: user.status,
      }));
    }
  }

  if (!demoDataEnabled) {
    const remainingUsers = users.filter(
      (user) => !DEMO_USER_IDS.has(user.id) && !DEMO_EMAILS.has(String(user.email || "").toLowerCase()),
    );
    removedDemoAccounts = remainingUsers.length !== users.length;
    users.splice(0, users.length, ...remainingUsers);
    for (const id of DEMO_USER_IDS) profiles.delete(id);
    entities.User = entities.User.filter(
      (user) => !DEMO_USER_IDS.has(user.id) && !DEMO_EMAILS.has(String(user.email || "").toLowerCase()),
    );
  }

  const needsEntityMigration = entitiesVersion < 1;
  if (needsEntityMigration) {
    const userById = new Map(users.map((user) => [user.id, user]));
    for (const supervisor of users.filter((user) => user.role === "Supervisor")) {
      const profile = profiles.get(supervisor.id) || {};
      entities.SupervisorProfile.push({
        id: `supervisor-${supervisor.id}`,
        email: supervisor.email,
        full_name: supervisor.name,
        department: supervisor.department,
        faculty: supervisor.faculty,
        academic_rank: profile.academicRank || "Lecturer",
        research_areas: profile.researchAreas || "",
        keywords: profile.keywords || "",
        bio: profile.researchSummary || "",
        max_capacity: Number.parseInt(profile.maxCapacity, 10) || 5,
        current_load: 0,
        availability: "available",
        preferred_level: profile.preferredLevel || "Postgraduate",
      });
    }

    entities.ResearchProfile = users
      .filter((user) => user.role === "Student")
      .map((student) => {
        const source = collections.researchProfiles.find((item) => item.owner === student.name);
        const recommendation = collections.recommendations.find((item) =>
          item.studentId === student.id || item.title.startsWith(`${student.name} —`),
        );
        const title = source?.title || recommendation?.title?.split(" — ").slice(1).join(" — ") || "";
        const keywords = source?.keywords || "";
        return {
          id: `research-${student.id}`,
          student_email: student.email,
          student_name: student.name,
          research_title: title,
          research_area: source?.researchArea || source?.subtitle || student.department,
          keywords,
          description: source?.description || recommendation?.description || "",
          level: student.identifier.startsWith("PhD") ? "PhD" : "Masters",
          department: student.department,
          faculty: student.faculty,
          status: recommendation || title ? "submitted" : "draft",
          progress: 0,
          created_date: new Date().toISOString(),
        };
      });

    entities.Assignment = collections.assignments
      .map((item) => {
        const student = userById.get(item.studentId);
        const supervisor = userById.get(item.supervisorId);
        if (!student || !supervisor) return null;
        return {
          id: item.id,
          student_email: student.email,
          student_name: student.name,
          supervisor_email: supervisor.email,
          supervisor_name: supervisor.name,
          research_title: collections.researchProfiles.find((profile) => profile.owner === student.name)?.title || "",
          department: student.department,
          status: "active",
          created_date: item.updatedAt,
          progress: 0,
        };
      })
      .filter(Boolean);
    for (const profile of entities.SupervisorProfile) {
      profile.current_load = entities.Assignment.filter(
        (assignment) => assignment.supervisor_email === profile.email && assignment.status === "active",
      ).length;
    }

    entities.Milestone = collections.milestones.map((item, index) => {
      const student = users.find((user) => user.name === item.owner);
      return {
        id: item.id,
        student_email: student?.email || "",
        student_name: student?.name || "",
        supervisor_email: users.find((user) => user.id === "usr-2")?.email || "",
        title: item.title,
        description: item.description,
        order: index + 1,
        status: item.status === "Completed" ? "approved" : item.status.toLowerCase().replaceAll(" ", "_"),
        due_date: item.subtitle.match(/\d{1,2}\s+[A-Za-z]{3}\s+\d{4}/)?.[0] || "",
        completed_date: item.status === "Completed" ? "2026-10-30" : null,
      };
    });

    entities.Draft = collections.drafts.map((item) => {
      const student = users.find((user) => user.name === item.owner);
      const milestone = entities.Milestone.find((entry) => entry.id === item.milestoneId);
      const submitted = item.status !== "Revision required";
      return {
        id: item.id,
        student_email: student?.email || "",
        student_name: student?.name || "",
        supervisor_email: users.find((user) => user.id === "usr-2")?.email || "",
        milestone_id: item.milestoneId,
        milestone_title: milestone?.title || item.title,
        title: item.title,
        version: item.versionNo,
        status: item.status === "Awaiting review" ? "submitted" : item.status === "Revision required" ? "revision_required" : "approved",
        submitted_date: item.updatedAt,
        content: item.description,
      };
    });

    entities.Feedback = collections.feedback.map((item) => {
      const studentName = collections.drafts.find((draft) => draft.milestoneId === item.draftId)?.owner || "Amara Nwosu";
      const student = users.find((user) => user.name === studentName);
      const supervisor = userById.get(item.supervisorId);
      return {
        id: item.id,
        student_email: student?.email || "",
        supervisor_email: supervisor?.email || "",
        draft_id: item.draftId,
        milestone_id: "mile-2",
        version: 2,
        comments: item.comment,
        outcome: "revision_required",
        reviewed_date: item.createdAt,
      };
    });

    entities.Defence = collections.defences.map((item) => {
      const student = users.find((user) => user.name === item.owner);
      return {
        id: item.id,
        student_email: student?.email || "",
        student_name: student?.name || "",
        supervisor_email: users.find((user) => user.id === "usr-2")?.email || "",
        title: item.title,
        scheduled_date: "2026-11-30",
        scheduled_time: "10:00",
        venue: "Postgraduate Seminar Room",
        status: item.status === "Completed" ? "completed" : "scheduled",
        notes: item.description,
      };
    });

    entities.Ticket = collections.tickets.map((item) => {
      const student = users.find((user) => user.name === item.owner);
      return { id: item.id, student_email: student?.email || "", student_name: student?.name || "", title: item.title, description: item.description, status: item.status.toLowerCase(), created_date: item.updatedAt };
    });
    entities.Notification = collections.notifications.map((item) => {
      const student = users.find((user) => user.name === item.owner);
      return { id: item.id, user_email: student?.email || "", title: item.title, message: item.description, type: "milestone", is_read: false, created_date: item.updatedAt };
    });
    entitiesVersion = 1;
  }

  const save = database.prepare(`
    INSERT INTO app_state (state_key, format, version, payload, updated_at)
    VALUES ('primary', ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(state_key) DO UPDATE SET
      format = excluded.format,
      version = excluded.version,
      payload = excluded.payload,
      updated_at = excluded.updated_at
  `);
  const clearEntityRecords = database.prepare("DELETE FROM entity_records");
  const saveEntityRecord = database.prepare(
    "INSERT INTO entity_records (entity, record_id, payload) VALUES (?, ?, ?)",
  );
  const persist = () => {
    database.exec("BEGIN IMMEDIATE");
    try {
      save.run(
        STATE_FORMAT,
        STATE_VERSION,
        JSON.stringify({ users, profiles: [...profiles.entries()], collections, entities, entities_version: entitiesVersion }),
      );
      clearEntityRecords.run();
      for (const [entity, records] of Object.entries(entities)) {
        for (const record of records) {
          if (record?.id) saveEntityRecord.run(entity, String(record.id), JSON.stringify(record));
        }
      }
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  };

  const needsPasswordUpgrade = users.some((user) => !user.password_hash);
  const demoPasswordHash = needsPasswordUpgrade ? makePasswordHash("ResearchDesk123!") : null;
  for (const user of users) {
    if (!user.password_hash) user.password_hash = demoPasswordHash;
  }
  if (!persisted || needsPasswordUpgrade || needsEntityMigration || removedDemoAccounts) persist();

  return {
    users,
    profiles,
    collections,
    entities,
    persist,
    close: () => database.close(),
  };
}
