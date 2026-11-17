import { cn } from "@/lib/utils";

const TINTS = {
  cream: "bg-[#FFF3E0] text-[#B45309]",
  blue: "bg-[#E3F2FD] text-[#1565C0]",
  rose: "bg-[#FFEBEE] text-[#C62828]",
  mint: "bg-[#E8F5E9] text-[#2E7D32]",
  teal: "bg-[#E0F2F1] text-[#00695C]",
  slate: "bg-[#F1F5F9] text-[#334155]",
};

export function TintedStat({ label, value, hint, tone = "teal" }) {
  return (
    <div className={cn("rounded-2xl px-5 py-4", TINTS[tone])}>
      <p className="text-[12px] font-medium">{label}</p>
      <p className="mt-1.5 text-[23px] font-semibold leading-none tracking-[-0.02em]">{value}</p>
      {hint && <p className="mt-1.5 text-[11.5px] leading-snug opacity-80">{hint}</p>}
    </div>
  );
}