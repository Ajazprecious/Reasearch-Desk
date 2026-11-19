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
import { timeAgo } from "@/lib/format";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "in_review", label: "In review" },
  { key: "resolved", label: "Resolved" },
];

export const Route = createFileRoute("/_authed/admin/tickets/")({
  head: () => ({ meta: [{ title: "Reports & tickets — ResearchDesk" }] }),
  component: AdminTicketsPage,
});

function AdminTicketsPage() {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

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
  };
  const categories = [...new Set(tickets.map((ticket) => ticket.category).filter(Boolean))].sort();
  const oldestOpen = tickets
    .filter((ticket) => ticket.status !== "resolved")
    .sort((a, b) => String(a.created_date || "").localeCompare(String(b.created_date || "")))[0];

  const visible = tickets.filter((ticket) => {
    if (["open", "in_review", "resolved"].includes(filter) && ticket.status !== filter) return false;
    if (category !== "all" && ticket.category !== category) return false;
    const haystack = `${ticket.reference} ${ticket.category} ${ticket.student_name} ${ticket.student_email} ${ticket.send_to}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  return (
    <div className="animate-fade">
      <PageHeader
        title="Reports & Tickets"
        description="Review issues raised by students and route each ticket to the appropriate administrator or school team."
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
            <TintedStat label="Open" value={counts.open} hint="Awaiting administrative action" tone="blue" />
            <TintedStat label="In review" value={counts.inReview} hint="Being investigated" tone="blue" />
            <TintedStat label="Resolved" value={counts.resolved} hint="Closed with a response" tone="mint" />
            <TintedStat label="Oldest open" value={oldestOpen ? timeAgo(oldestOpen.created_date) : "—"} hint="Needs a response" tone="rose" />
          </div>

          <div className="grid gap-2 sm:grid-cols-[1.4fr_1fr_1fr]">
            <label className="relative block">
              <span className="mb-1 block text-[10.5px] font-medium text-slate-500">Search</span>
              <Search className="absolute left-3 top-8 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ticket, student or issue…" className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[12px] outline-none focus:border-[#00796B]" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10.5px] font-medium text-slate-500">Category</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-[#00796B]">
                <option value="all">All categories</option>
                {categories.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10.5px] font-medium text-slate-500">Status</span>
              <select value={filter} onChange={(event) => setFilter(event.target.value)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-[#00796B]">
                {FILTERS.map((item) => <option key={item.key} value={item.key}>{item.key === "all" ? "All statuses" : item.label}</option>)}
              </select>
            </label>
          </div>

          <SectionCard title="Ticket queue" description={`${visible.length} of ${counts.total} tickets`} bodyClassName="px-5 py-2 sm:px-6">
            <div className="divide-y divide-slate-100">
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