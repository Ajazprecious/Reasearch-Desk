import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Search, Ticket as TicketIcon } from "lucide-react";
import { localClient } from "@/api/localClient";
import { useAsync } from "@/hooks/useAsync";
import { PageHeader } from "@/components/workspace/PageHeader";
import { SectionCard } from "@/components/workspace/SectionCard";
import { TintedStat } from "@/components/workspace/TintedStat";
import { EmptyState, LoadingBlock } from "@/components/workspace/EmptyState";
import { AdminTicketRow } from "@/components/admin/tickets/AdminTicketRow";
import { cn } from "@/lib/utils";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "in_review", label: "In review" },
  { key: "resolved", label: "Resolved" },
  { key: "high", label: "High impact" },
];

export const Route = createFileRoute("/_authed/admin/tickets/")({
  head: () => ({ meta: [{ title: "Reports & tickets — ResearchDesk" }] }),
  component: AdminTicketsPage,
});

function AdminTicketsPage() {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const { data, loading, error, reload } = useAsync(async () => {
    const [ticketPage, updatePage] = await Promise.all([
      localClient.entities.Ticket.list({ sort: "-created_date", limit: 200 }),
      localClient.entities.TicketUpdate.list({ sort: "-created_date", limit: 500 }),
    ]);
    return { tickets: ticketPage.items || [], updates: updatePage.items || [] };
  }, []);

  const tickets = data?.tickets || [];
  const updates = data?.updates || [];
  const counts = {
    total: tickets.length,
    open: tickets.filter((ticket) => ticket.status === "open").length,
    inReview: tickets.filter((ticket) => ticket.status === "in_review").length,
    resolved: tickets.filter((ticket) => ticket.status === "resolved").length,
    high: tickets.filter((ticket) => ticket.impact === "High").length,
  };

  const visible = tickets.filter((ticket) => {
    if (filter === "high" && ticket.impact !== "High") return false;
    if (["open", "in_review", "resolved"].includes(filter) && ticket.status !== filter) return false;
    const haystack = `${ticket.reference} ${ticket.category} ${ticket.student_name} ${ticket.student_email} ${ticket.send_to}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  return (
    <div className="animate-fade">
      <PageHeader
        title="Reports & tickets"
        description="Student reports about delays, records and uploads. Respond, move each ticket through review and close it with a clear record."
        actions={
          <button
            type="button"
            onClick={reload}
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-600 transition-colors hover:border-slate-300"
          >
            Refresh queue
          </button>
        }
      />

      {loading ? (
        <LoadingBlock rows={4} />
      ) : error ? (
        <EmptyState icon={AlertTriangle} title="Could not load tickets" description={error.message} />
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <TintedStat label="Open tickets" value={counts.open} hint="Waiting for a first response" tone="cream" />
            <TintedStat label="In review" value={counts.inReview} hint="Being investigated" tone="blue" />
            <TintedStat label="Resolved" value={counts.resolved} hint="Closed with a response" tone="mint" />
            <TintedStat label="High impact" value={counts.high} hint="Affecting progress right now" tone="rose" />
          </div>

          <SectionCard title="Ticket queue" description={`${counts.total} tickets reported by students.`} bodyClassName="px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-1.5">
                {FILTERS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFilter(item.key)}
                    className={cn(
                      "rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors",
                      filter === item.key ? "bg-[#00796B] text-white" : "bg-[#F1F3F4] text-slate-600 hover:bg-slate-200",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search tickets or students..."
                  className="w-full bg-transparent text-[12.5px] text-[#0A1929] outline-none placeholder:text-slate-400 sm:w-56"
                />
              </div>
            </div>

            <div className="mt-2 divide-y divide-slate-100">
              {visible.length ? (
                visible.map((ticket) => (
                  <AdminTicketRow
                    key={ticket.id}
                    ticket={ticket}
                    replies={updates.filter((update) => update.ticket_id === ticket.id).length}
                  />
                ))
              ) : (
                <div className="py-6">
                  <EmptyState
                    icon={TicketIcon}
                    title="No tickets in this view"
                    description="Student reports appear here as soon as they are submitted."
                  />
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}