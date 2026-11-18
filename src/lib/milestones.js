/**
 * The core supervision cycle. Every student is opened on these stages the moment a
 * supervisor assignment is confirmed, so progress is comparable across departments.
 * `days` counts from the assignment date.
 */
export const CORE_MILESTONES = [
  {
    key: "proposal",
    title: "Proposal Submission",
    description: "Research proposal with problem statement, objectives, research questions and a preliminary literature map.",
    days: 21,
  },
  {
    key: "literature",
    title: "Literature Review",
    description: "Chapter one draft with a critical review of current literature.",
    days: 45,
  },
  {
    key: "methodology",
    title: "Research Methodology",
    description: "Chapter two draft covering design, instruments and ethics.",
    days: 70,
  },
  {
    key: "data_collection",
    title: "Data Collection",
    description: "Fieldwork completed with instruments, sampling records and a clean dataset.",
    days: 110,
  },
  {
    key: "analysis",
    title: "Data Analysis & Findings",
    description: "Chapter three draft presenting the analysis and findings.",
    days: 140,
  },
  {
    key: "discussion",
    title: "Results & Discussion",
    description: "Chapter four draft interpreting findings against the literature.",
    days: 168,
  },
  {
    key: "submission",
    title: "Full Thesis Submission",
    description: "Complete thesis submitted for examination and defence preparation.",
    days: 200,
  },
];

export const MILESTONE_STATUS_LABELS = {
  pending: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  revision_required: "Revision needed",
  approved: "Approved",
};