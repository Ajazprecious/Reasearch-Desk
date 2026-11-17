import { cn } from "@/lib/utils";

export function ProgressBar({ value = 0, className, tone = "teal", showLabel = false }) {
  const width = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="h-[6px] w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-700 ease-out",
            tone === "amber" ? "bg-[#EF6C00]" : tone === "rose" ? "bg-[#C62828]" : "bg-[#00796B]",
          )}
          style={{ width: `${width}%` }}
        />
      </div>
      {showLabel && <span className="w-9 shrink-0 text-right text-[12px] font-medium tabular-nums text-slate-500">{width}%</span>}
    </div>
  );
}