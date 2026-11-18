import { CORE_MILESTONES } from "@/lib/milestones";

/** The defined core research milestones, in the order every student works through them. */
export function CycleStages() {
  return (
    <ol className="flex flex-wrap gap-2">
      {CORE_MILESTONES.map((stage, index) => (
        <li
          key={stage.key}
          title={stage.description}
          className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-[#FAFCFB] px-3 py-2"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#E0F2F1] text-[11.5px] font-semibold text-[#00695C]">
            {index + 1}
          </span>
          <span className="text-[12.5px] font-medium text-[#0A1929]">{stage.title}</span>
          <span className="text-[11px] text-slate-400">week {Math.round(stage.days / 7)}</span>
        </li>
      ))}
    </ol>
  );
}