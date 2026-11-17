// Supervisor workspace settings: defaults and the toggle definitions the Settings
// screen renders, shared with the server function that persists them.

export const CAPACITY_OPTIONS = [4, 5, 6, 8, 10];

export const DEFAULT_SUPERVISOR_SETTINGS = {
  available: true,
  max_capacity: 5,
  review_note_required: true,
  review_show_versions: true,
  review_deadline_reminders: true,
  notify_submissions: true,
  notify_messages: true,
  notify_milestones: true,
  notify_defences: true,
  notify_admin: true,
};

export const REVIEW_PREFERENCES = [
  {
    key: "review_note_required",
    label: "Require a note with every submission",
    description: "Students summarise what changed before a draft reaches your review queue.",
  },
  {
    key: "review_show_versions",
    label: "Show earlier versions while reviewing",
    description: "Keep the previous version beside the new one when comparing revisions.",
  },
  {
    key: "review_deadline_reminders",
    label: "Remind me before a review becomes overdue",
    description: "Send a reminder when a submitted draft has been waiting in your queue.",
  },
];

export const NOTIFICATION_PREFERENCES = [
  { key: "notify_submissions", label: "New draft submissions", description: "A student submits a version for your review." },
  { key: "notify_messages", label: "Student and administrator replies", description: "Feedback threads and ticket responses addressed to you." },
  { key: "notify_milestones", label: "Milestone deadlines", description: "Deadlines approaching or overdue for your students." },
  { key: "notify_defences", label: "Defence dates", description: "Defence scheduling changes and panel confirmations." },
  { key: "notify_admin", label: "Research office announcements", description: "Assignment decisions and policy updates from the administrator." },
];