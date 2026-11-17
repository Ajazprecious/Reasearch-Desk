import { CalendarDays, FileText, Layers } from "lucide-react";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { dueLabel, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/** A milestone row: order, title, deadline, live draft count and status. */
export function MilestoneRow({ milestone, draftCount = 0, action, className }) {
  const overdue =
    milestone.status !== "approved" && milestone.due_date && new Date(milestone.due_date) < new Date(new Date().toISOString().slice(0, 10));

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-slate-100 px-1 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F4F7F6] text-[12px] font-semibold text-[#00695C]">
          {milestone.order || "•"}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-medium text-[#0A1929]">{milestone.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              {formatDate(milestone.due_date)}
              <span className={cn("font-medium", overdue ? "text-[#C62828]" : "text-slate-400")}>· {dueLabel(milestone.due_date)}</span>
            </span>
            {draftCount > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                {draftCount} version{draftCount === 1 ? "" : "s"}
              </span>
            )}
            {milestone.description && (
              <span className="inline-flex max-w-lg items-center gap-1.5 truncate text-slate-400">
                <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{milestone.description}</span>
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:pl-4">
        <StatusBadge status={milestone.status} />
        {action}
      </div>
    </div>
  );
}