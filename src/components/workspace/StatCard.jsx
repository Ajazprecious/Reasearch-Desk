import { cn } from "@/lib/utils";

const TONES = {
  mint: "bg-[#E8F5E9] text-[#2E7D32]",
  amber: "bg-[#FFF3E0] text-[#EF6C00]",
  rose: "bg-[#FFEBEE] text-[#C62828]",
  blue: "bg-[#E3F2FD] text-[#1565C0]",
  teal: "bg-[#E0F2F1] text-[#00695C]",
  plain: "bg-white text-[#00796B] ring-1 ring-slate-100",
};

export function StatCard({ label, value, hint, icon: Icon, tone = "teal", className }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-shadow hover:shadow-[0_10px_28px_-20px_rgba(15,23,42,0.4)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10.5px] font-semibold uppercase leading-relaxed tracking-[0.12em] text-slate-400">{label}</p>
        {Icon && (
          <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]", TONES[tone])}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="mt-3 text-[28px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-[#0A1929]">{value}</p>
      {hint && <p className="mt-2 text-[12px] leading-snug text-slate-500">{hint}</p>}
    </div>
  );
}