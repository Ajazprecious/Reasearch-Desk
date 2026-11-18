import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { MILESTONE_STATUS_LABELS } from "@/lib/milestones";

const TONE = {
  approved: "border-[#2E7D32] bg-[#2E7D32] text-white",
  submitted: "border-[#1565C0] bg-[#1565C0] text-white",
  under_review: "border-[#EF6C00] bg-[#EF6C00] text-white",
  revision_required: "border-[#C62828] bg-[#C62828] text-white",
  in_progress: "border-[#90CAF9] bg-[#E3F2FD] text-[#1565C0]",
};

/** One numbered chip per milestone, coloured by its state, with the detail on hover. */
export function MilestoneStrip({ milestones }) {
  if (!milestones?.length) return <span className="text-[11.5px] text-slate-400">No milestones opened</span>;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {milestones.map((milestone) => (
        <span
          key={milestone.id}
          title={`${milestone.title} — ${MILESTONE_STATUS_LABELS[milestone.status] || milestone.status}${
            milestone.due_date ? ` · due ${formatDate(milestone.due_date)}` : ""
          }`}
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-lg border text-[11px] font-semibold",
            TONE[milestone.status] || "border-slate-200 bg-white text-slate-400",
          )}
        >
          {milestone.order || "•"}
        </span>
      ))}
    </div>
  );
}