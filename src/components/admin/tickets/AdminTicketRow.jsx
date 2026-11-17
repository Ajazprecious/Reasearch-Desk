import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { TicketStatusBadge } from "@/components/student/TicketStatusBadge";
import { timeAgo } from "@/lib/format";

const IMPACT = {
  High: "bg-[#FFEBEE] text-[#C62828]",
  Normal: "bg-[#E3F0FB] text-[#1D4ED8]",
  Low: "bg-[#F1F3F4] text-[#4B5563]",
};

export function AdminTicketRow({ ticket, replies }) {
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-[#0A1929]">#{ticket.reference}</span>
          <TicketStatusBadge status={ticket.status} />
          <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${IMPACT[ticket.impact] || IMPACT.Normal}`}>
            {ticket.impact || "Normal"} impact
          </span>
        </div>
        <p className="mt-1.5 text-[12.8px] font-medium text-[#1F2A30]">{ticket.category}</p>
        <p className="mt-0.5 text-[11.8px] text-slate-500">
          {ticket.student_name || ticket.student_email} · sent to {ticket.send_to} · {replies} {replies === 1 ? "reply" : "replies"} ·{" "}
          {timeAgo(ticket.last_update || ticket.created_date)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button asChild variant="outline" className="h-9 rounded-lg border-slate-300 px-3.5 text-[12.5px]">
          <Link to="/admin/tickets/$ticketId" params={{ ticketId: ticket.id }}>
            Open ticket
          </Link>
        </Button>
      </div>
    </div>
  );
}