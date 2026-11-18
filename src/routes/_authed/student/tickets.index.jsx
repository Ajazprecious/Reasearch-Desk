import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { localClient } from "@/api/localClient";
import { useAuth } from "@/lib/AuthContext";
import { useAsync } from "@/hooks/useAsync";
import { useStudentWorkspace } from "@/hooks/useStudentWorkspace";
import { PageHeader } from "@/components/workspace/PageHeader";
import { SectionCard } from "@/components/workspace/SectionCard";
import { EmptyState, LoadingBlock } from "@/components/workspace/EmptyState";
import { Button } from "@/components/ui/button";
import { TicketForm } from "@/components/student/TicketForm";
import { TicketStatusBadge } from "@/components/student/TicketStatusBadge";
import { formatDateTime, timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authed/student/tickets/")({
  head: () => ({ meta: [{ title: "Reports & Tickets — ResearchDesk" }] }),
  component: StudentTicketsPage,
});

function StudentTicketsPage() {
  const { user } = useAuth();
  const { data: workspace } = useStudentWorkspace();
  const { data: tickets, loading, reload } = useAsync(async () => {
    const page = await localClient.entities.Ticket.filter({ student_email: user.email }, { sort: "-created_date", limit: 50 });
    return page.items;
  }, [user?.email]);

  const counts = {
    open: (tickets || []).filter((ticket) => ticket.status === "open").length,
    in_review: (tickets || []).filter((ticket) => ticket.status === "in_review").length,
    resolved: (tickets || []).filter((ticket) => ticket.status === "resolved").length,
  };

  return (
    <div className="animate-fade">
      <PageHeader
        title="Reports & Tickets"
        description="Report delays, record issues or upload problems to the research office and follow the response in one thread."
        actions={
          <Button
            onClick={() => document.getElementById("create-ticket")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="h-10 rounded-xl bg-[#00796B] px-4 text-[13px] font-medium hover:bg-[#007D6D]"
          >
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" /> Create new ticket
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          <div id="create-ticket">
            <TicketForm
              milestones={workspace?.milestones || []}
              drafts={workspace?.drafts || []}
              onCreated={reload}
            />
          </div>

          <SectionCard title="What can a student report?" description="Anything the research office must act on.">
            <ul className="space-y-3">
              {[
                ["Supervisor assignment delay", "No supervisor confirmed after your proposal was submitted."],
                ["Feedback / review delay", "A draft is waiting for review longer than expected."],
                ["Milestone or defence issue", "Dates, outcomes or defence records that look wrong."],
                ["Administrative / record issue", "Names, programme details or records that need correcting."],
              ].map(([title, description]) => (
                <li key={title} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#00796B]" aria-hidden="true" />
                  <div>
                    <p className="text-[12.8px] font-medium text-[#0A1929]">{title}</p>
                    <p className="text-[12px] text-slate-500">{description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        <div className="space-y-5">
          <SectionCard title="Ticket overview">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-[#F1F5F9] px-2 py-3">
                <p className="text-[18px] font-semibold text-[#0F172A]">{counts.open}</p>
                <p className="text-[11px] text-slate-500">Open</p>
              </div>
              <div className="rounded-xl bg-[#ECFDF5] px-2 py-3">
                <p className="text-[18px] font-semibold text-[#0F172A]">{counts.in_review}</p>
                <p className="text-[11px] text-slate-500">In review</p>
              </div>
              <div className="rounded-xl bg-[#E8F5E9] px-2 py-3">
                <p className="text-[18px] font-semibold text-[#0F172A]">{counts.resolved}</p>
                <p className="text-[11px] text-slate-500">Resolved</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="My tickets" bodyClassName="px-5 py-2">
            {loading ? (
              <LoadingBlock rows={2} />
            ) : tickets?.length ? (
              <ul className="divide-y divide-slate-100">
                {tickets.slice(0, 5).map((ticket) => (
                  <li key={ticket.id}>
                    <Link to="/student/tickets/$ticketId" params={{ ticketId: ticket.id }} className="block py-3 hover:opacity-80">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[12.8px] font-medium text-[#0A1929]">
                          #{ticket.reference} • {ticket.category}
                        </p>
                        <TicketStatusBadge status={ticket.status} />
                      </div>
                      <p className="mt-0.5 text-[11.5px] text-slate-500">
                        Sent to: {ticket.send_to} • {timeAgo(ticket.created_date)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-3">
                <EmptyState icon={Plus} title="No tickets yet" description="Reports you send appear here with their status." />
              </div>
            )}
            <Link
              to="/student/tickets"
              className="mb-3 mt-1 inline-flex text-[12px] font-medium text-[#00796B] hover:underline"
            >
              View all tickets
            </Link>
          </SectionCard>

          <SectionCard title="After you submit">
            <p className="text-[12.3px] leading-relaxed text-slate-600">
              Your report goes to the selected office as a tracked ticket. You can add more information at any time and the whole
              conversation stays on one record.
            </p>
            <p className="mt-2 text-[12.3px] leading-relaxed text-[#00695C]">
              You will receive a notification when the administrator or school responds.
            </p>
            {tickets?.[0] && (
              <p className="mt-3 text-[11.5px] text-slate-400">Last activity {formatDateTime(tickets[0].last_update || tickets[0].created_date)}</p>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}