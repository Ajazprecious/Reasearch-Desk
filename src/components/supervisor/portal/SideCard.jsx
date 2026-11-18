import { cn } from "@/lib/utils";

/** Right-hand information card used beside review, timeline and student screens. */
export function SideCard({ title, description, action, children, className }) {
  return (
    <section className={cn("rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]", className)}>
      {(title || action) && (
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            {title && <h3 className="text-[13px] font-semibold text-[#111827]">{title}</h3>}
            {description && <p className="mt-0.5 text-[11.5px] text-slate-500">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function DaysPill({ days }) {
  if (days === null || days === undefined) return null;
  if (days < 0) return <span className="inline-flex whitespace-nowrap rounded-md bg-[#FFEBEE] px-2 py-0.5 text-[11.5px] font-medium text-[#C62828]">{Math.abs(days)} days overdue</span>;
  if (days === 0) return <span className="inline-flex whitespace-nowrap rounded-md bg-[#FEF3C7] px-2 py-0.5 text-[11.5px] font-medium text-[#92400E]">Due today</span>;
  return <span className="inline-flex whitespace-nowrap rounded-md bg-[#FEF3C7] px-2 py-0.5 text-[11.5px] font-medium text-[#92400E]">{days} days left</span>;
}

export function ProgressPill({ value }) {
  return (
    <span className="inline-flex whitespace-nowrap rounded-md bg-[#E3F2FD] px-2 py-0.5 text-[11.5px] font-medium text-[#1565C0]">{value}%</span>
  );
}

const STATUS = {
  on_track: { label: "On track", tone: "bg-[#E8F5E9] text-[#2E7D32]" },
  needs_attention: { label: "Needs attention", tone: "bg-[#FFF3E0] text-[#B25E00]" },
  awaiting_review: { label: "Awaiting review", tone: "bg-[#E3F2FD] text-[#1565C0]" },
};

export function TrackStatusPill({ status }) {
  const style = STATUS[status] || STATUS.on_track;
  return <span className={cn("inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-[11.5px] font-medium", style.tone)}>{style.label}</span>;
}