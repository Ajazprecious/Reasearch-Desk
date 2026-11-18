import { Users } from "lucide-react";
import { ProgressBar } from "@/components/workspace/ProgressBar";
import { StatusBadge } from "@/components/workspace/StatusBadge";

/** Department overview card: faculty, progress bar and an on-track / needs-attention label. */
export function DepartmentCard({ department }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-shadow hover:shadow-[0_10px_28px_-20px_rgba(15,23,42,0.4)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-[#0A1929]">{department.name}</p>
          <p className="mt-0.5 truncate text-[11.5px] text-slate-500">{department.faculty || "Faculty not set"}</p>
        </div>
        <StatusBadge status={department.status} />
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-[11.5px] text-slate-500">
          <span>Confirmed progress</span>
          <span className="font-medium tabular-nums text-[#0A1929]">{department.progress}%</span>
        </div>
        <ProgressBar value={department.progress} tone={department.status === "needs_attention" ? "rose" : "teal"} />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11.5px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          {department.students} student{department.students === 1 ? "" : "s"}
        </span>
        <span>{department.supervisors} supervisor{department.supervisors === 1 ? "" : "s"}</span>
      </div>

      {(department.overdue > 0 || department.awaitingSupervisor > 0) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {department.overdue > 0 && (
            <span className="rounded-full bg-[#FFEBEE] px-2 py-0.5 text-[10.5px] font-medium text-[#C62828]">
              {department.overdue} overdue milestone{department.overdue === 1 ? "" : "s"}
            </span>
          )}
          {department.awaitingSupervisor > 0 && (
            <span className="rounded-full bg-[#FFF3E0] px-2 py-0.5 text-[10.5px] font-medium text-[#EF6C00]">
              {department.awaitingSupervisor} awaiting supervisor
            </span>
          )}
        </div>
      )}
    </div>
  );
}