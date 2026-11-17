import { cn } from "@/lib/utils";

const TONES = {
  teal: { card: "bg-[#E0F2F1] border-[#C8E6E3]", dot: "bg-[#00796B]", value: "text-[#00695C]" },
  amber: { card: "bg-[#FFF9E6] border-[#FBEFC8]", dot: "bg-[#BF360C]", value: "text-[#8C3B00]" },
  blue: { card: "bg-[#E6F0FF] border-[#D3E3FA]", dot: "bg-[#1565C0]", value: "text-[#15509A]" },
  rose: { card: "bg-[#FBE4E4] border-[#F6D3D3]", dot: "bg-[#D32F2F]", value: "text-[#B3261E]" },
  green: { card: "bg-[#E8F5E9] border-[#D3EBD5]", dot: "bg-[#2E7D32]", value: "text-[#24662A]" },
  gray: { card: "bg-[#F4F5F7] border-[#E5E7EB]", dot: "bg-slate-400", value: "text-slate-700" },
};

/** Soft tinted summary tile used across the supervisor portal. */
export function KpiTile({ label, value, hint, tone = "teal", className }) {
  const style = TONES[tone] || TONES.teal;
  return (
    <div className={cn("rounded-xl border px-4 py-3.5", style.card, className)}>
      <div className="flex items-center gap-2">
        <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} aria-hidden="true" />
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-slate-500">{label}</p>
      </div>
      <p className={cn("mt-2 text-[26px] font-semibold leading-none tracking-[-0.02em]", style.value)}>{value}</p>
      {hint && <p className="mt-1.5 text-[11.5px] text-slate-500">{hint}</p>}
    </div>
  );
}

const PILL_TONES = {
  teal: "bg-[#E0F2F1] text-[#00695C]",
  green: "bg-[#E8F5E9] text-[#2E7D32]",
  amber: "bg-[#FFF3E0] text-[#B25E00]",
  yellow: "bg-[#FEF3C7] text-[#92400E]",
  rose: "bg-[#FFEBEE] text-[#C62828]",
  blue: "bg-[#E3F2FD] text-[#1565C0]",
  gray: "bg-slate-100 text-slate-600",
};

/** Compact status pill for timeline, progress and list rows. */
export function Pill({ children, tone = "gray", className }) {
  if (children === null || children === undefined || children === "") return null;
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-[11.5px] font-medium",
        PILL_TONES[tone] || PILL_TONES.gray,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function FilterPills({ options, value, onChange, className }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {options.map((option) => {
        const active = option.key === value;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
              active
                ? "border-[#00796B] bg-[#00796B] text-white shadow-[0_6px_16px_-12px_rgba(0,121,107,1)]"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-[#0A1929]",
            )}
          >
            {option.label}
            {option.count ? <span className={cn("ml-1.5 text-[11px]", active ? "text-white/70" : "text-slate-400")}>{option.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}