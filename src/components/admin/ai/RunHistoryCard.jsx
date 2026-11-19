import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { modelLabel } from "@/lib/matching-config";

const DOT = {
  success: "bg-[#2E7D32]",
  partial: "bg-[#EF6C00]",
  failed: "bg-[#C62828]",
};

export function RunHistoryCard({ runs }) {
  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white">
      <div className="border-b border-slate-100 px-5 py-4">
        <p className="text-[14px] font-semibold text-[#0A1929]">Run history</p>
        <p className="mt-0.5 text-[12px] text-slate-500">Every matching run with the model it used.</p>
      </div>
      {runs?.length ? (
        <ul className="divide-y divide-slate-100 px-5">
          {runs.slice(0, 6).map((run) => (
            <li key={run.id} className="py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-[12.3px] font-medium text-[#0A1929]">
                  <span className={cn("h-2 w-2 rounded-full", DOT[run.status] || DOT.success)} aria-hidden="true" />
                  {run.students_processed} student{run.students_processed === 1 ? "" : "s"} ranked
                </p>
                <span className="text-[11px] text-slate-400">{timeAgo(run.created_date)}</span>
              </div>
              <p className="mt-1 text-[11.5px] text-slate-500">
                {run.model ? modelLabel(run.model) : "Legacy local"} ·{" "}
                {run.used_ai ? "Gemini semantic ranking with local eligibility" : "Legacy local ranking"} ·{" "}
                {run.confidence || 0}% average top match
              </p>
              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                {run.scope === "student" ? "Single student" : "All waiting profiles"} · {run.triggered_by}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 py-5 text-[12.5px] text-slate-500">No runs recorded yet. Run matching to build the first shortlist.</p>
      )}
    </section>
  );
}