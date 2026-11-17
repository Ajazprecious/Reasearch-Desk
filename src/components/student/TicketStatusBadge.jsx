const STYLES = {
  open: "bg-[#FFF8E1] text-[#92400E]",
  in_review: "bg-[#E3F0FB] text-[#1D4ED8]",
  resolved: "bg-[#E8F5E9] text-[#2E7D32]",
};

const LABELS = { open: "Open", in_review: "In review", resolved: "Resolved" };

export function TicketStatusBadge({ status, className = "" }) {
  if (!status) return null;
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${STYLES[status] || "bg-slate-100 text-slate-600"} ${className}`}
    >
      {LABELS[status] || status}
    </span>
  );
}