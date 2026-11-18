import { cn } from "@/lib/utils";

const STYLES = {
  pending: "bg-slate-100 text-slate-600",
  draft: "bg-slate-100 text-slate-600",
  not_started: "bg-slate-100 text-slate-600",
  in_progress: "bg-[#E3F2FD] text-[#1565C0]",
  submitted: "bg-[#E3F2FD] text-[#1565C0]",
  under_review: "bg-[#FFF3E0] text-[#EF6C00]",
  revision_required: "bg-[#FFEBEE] text-[#C62828]",
  needs_attention: "bg-[#FFEBEE] text-[#C62828]",
  approved: "bg-[#E8F5E9] text-[#2E7D32]",
  completed: "bg-[#E8F5E9] text-[#2E7D32]",
  on_track: "bg-[#E8F5E9] text-[#2E7D32]",
  active: "bg-[#E8F5E9] text-[#2E7D32]",
  available: "bg-[#E8F5E9] text-[#2E7D32]",
  assigned: "bg-[#E8F5E9] text-[#2E7D32]",
  limited: "bg-[#FFF3E0] text-[#EF6C00]",
  paused: "bg-[#FFF3E0] text-[#EF6C00]",
  postponed: "bg-[#FFF3E0] text-[#EF6C00]",
  awaiting: "bg-[#FFF3E0] text-[#EF6C00]",
  scheduled: "bg-[#E3F2FD] text-[#1565C0]",
  unavailable: "bg-[#FFEBEE] text-[#C62828]",
  declined: "bg-slate-100 text-slate-500",
  revision: "bg-[#FFEBEE] text-[#C62828]",
};

const LABELS = {
  pending: "Pending",
  draft: "Draft",
  in_progress: "In progress",
  submitted: "Submitted",
  under_review: "Under review",
  revision_required: "Revision needed",
  needs_attention: "Needs attention",
  approved: "Approved",
  completed: "Completed",
  on_track: "On track",
  active: "Active",
  available: "Available",
  assigned: "Assigned",
  limited: "Limited",
  paused: "Paused",
  postponed: "Postponed",
  awaiting: "Awaiting supervisor",
  scheduled: "Scheduled",
  unavailable: "Unavailable",
  declined: "Declined",
};

export function StatusBadge({ status, label, className }) {
  if (!status) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-medium",
        STYLES[status] || "bg-slate-100 text-slate-600",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      {label || LABELS[status] || status}
    </span>
  );
}