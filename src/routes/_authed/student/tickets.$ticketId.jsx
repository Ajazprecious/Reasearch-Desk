import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Download, Loader2, Paperclip, Send } from "lucide-react";
import { toast } from "sonner";
import { localClient } from "@/api/localClient";
import { useAsync } from "@/hooks/useAsync";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/components/workspace/SectionCard";
import { LoadingBlock } from "@/components/workspace/EmptyState";
import { TicketStatusBadge } from "@/components/student/TicketStatusBadge";
import { replyToTicket } from "@/lib/server-fns";
import { formatDate, formatDateTime, initials, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/student/tickets/$ticketId")({
  head: () => ({ meta: [{ title: "Ticket — ResearchDesk" }] }),
  component: TicketDetailPage,
});

function TicketDetailPage() {
  const { ticketId } = Route.useParams();
  const reply = useServerFn(replyToTicket);
  const replyRef = useRef(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const { data, loading, reload } = useAsync(async () => {
    const ticket = await localClient.entities.Ticket.get(ticketId);
    const updates = await localClient.entities.TicketUpdate.filter({ ticket_id: ticketId }, { sort: "created_date", limit: 100 });
    return { ticket, updates: updates.items };
  }, [ticketId]);

  if (loading) return <LoadingBlock rows={5} />;
  if (!data?.ticket) return <p className="text-[13px] text-slate-500">This ticket could not be found.</p>;

  const { ticket, updates } = data;
  const received = updates[0]?.created_date || ticket.created_date;

  const steps = [
    { label: "Ticket submitted", at: ticket.created_date, done: true },
    { label: "Received by administrator", at: received, done: true },
    { label: "In review", at: ticket.status === "open" ? null : ticket.last_update, done: ticket.status !== "open" },
    { label: "Resolved", at: ticket.status === "resolved" ? ticket.last_update : null, done: ticket.status === "resolved" },
  ];

  async function openAttachment() {
    try {
      const { signed_url } = await localClient.integrations.Core.CreateFileSignedUrl({ file_uri: ticket.attachment_uri });
      window.open(signed_url, "_blank", "noopener");
    } catch {
      toast.error("That file could not be opened");
    }
  }

  async function sendReply() {
    setBusy(true);
    try {
      await reply({ data: { ticketId, body: body.trim() } });
      setBody("");
      await reload();
      toast.success("Reply added to this ticket");
    } catch (err) {
      toast.error(err?.message || "Could not send this reply");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="animate-fade space-y-5">
      <div>
        <Link to="/student/tickets" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-slate-500 hover:text-[#00796B]">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Reports &amp; Tickets
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[23px] font-semibold tracking-[-0.02em] text-[#0A1929]">Ticket #{ticket.reference}</h1>
              <TicketStatusBadge status={ticket.status} />
            </div>
            <p className="mt-1 text-[12.5px] text-slate-500">
              {ticket.category} • Submitted {formatDateTime(ticket.created_date)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => window.print()} className="h-10 rounded-xl border-slate-200 text-[13px]">
              <Download className="mr-1.5 h-4 w-4" aria-hidden="true" /> Download record
            </Button>
            <Button onClick={() => replyRef.current?.focus()} className="h-10 rounded-xl bg-[#00796B] px-4 text-[13px] font-medium hover:bg-[#007D6D]">
              Add reply
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.9fr_1fr]">
        <div className="space-y-5">
          <SectionCard
            title="Original report"
            action={<span className="rounded-full bg-[#FFF3E0] px-2.5 py-1 text-[11px] font-medium text-[#9A3412]">School action</span>}
          >
            <p className="text-[13px] font-medium text-[#0A1929]">{ticket.category}</p>
            <p className="mt-2 whitespace-pre-wrap text-[12.8px] leading-relaxed text-slate-600">{ticket.description}</p>
            <dl className="mt-4 grid gap-2 text-[12px] sm:grid-cols-2">
              <div>
                <dt className="text-slate-400">Sent to</dt>
                <dd className="text-[#0A1929]">{ticket.send_to}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Related item</dt>
                <dd className="text-[#0A1929]">{ticket.related_item || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Impact</dt>
                <dd className="text-[#0A1929]">{ticket.impact}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Priority</dt>
                <dd className="text-[#0A1929]">{ticket.priority || "Normal"}</dd>
              </div>
            </dl>
            {ticket.attachment_uri && (
              <button
                type="button"
                onClick={openAttachment}
                className="mt-4 flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 px-3.5 py-2.5 text-left hover:border-[#00796B]"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Paperclip className="h-4 w-4 shrink-0 text-[#00796B]" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block truncate text-[12.3px] font-medium text-[#0A1929]">{ticket.attachment_name}</span>
                    <span className="block text-[11px] text-slate-400">{ticket.attachment_size}</span>
                  </span>
                </span>
                <span className="text-[12px] font-medium text-[#00796B]">View</span>
              </button>
            )}
          </SectionCard>

          <SectionCard title="Ticket conversation" action={<span className="text-[11.5px] text-slate-400">{updates.length} updates</span>}>
            <ul className="space-y-4">
              {updates.map((update) => (
                <li key={update.id} className="flex gap-3">
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                      update.author_role === "admin" ? "bg-[#E3F0FB] text-[#1D4ED8]" : "bg-[#E0F2F1] text-[#00695C]",
                    )}
                  >
                    {initials(update.author_name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[12.5px] font-medium text-[#0A1929]">
                        {update.author_role === "admin" ? update.author_name || "Research Administrator" : "You"}
                      </p>
                      <span className="text-[11px] text-slate-400">{formatDateTime(update.created_date)}</span>
                      {update.is_official && (
                        <span className="rounded-full bg-[#E3F0FB] px-2 py-0.5 text-[10.5px] font-medium text-[#1D4ED8]">Official response</span>
                      )}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-[12.8px] leading-relaxed text-slate-600">{update.body}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-5 border-t border-slate-100 pt-4">
              <label htmlFor="reply" className="text-[12px] font-medium text-slate-600">
                Add more information
              </label>
              <Textarea
                id="reply"
                ref={replyRef}
                rows={3}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Write a reply or provide additional information..."
                className="mt-1.5 rounded-xl border-slate-200 text-[13px] leading-relaxed shadow-none focus-visible:ring-1 focus-visible:ring-[#00796B]"
              />
              <div className="mt-3 flex justify-end">
                <Button
                  onClick={sendReply}
                  disabled={busy || body.trim().length < 2}
                  className="h-10 rounded-xl bg-[#00796B] px-4 text-[13px] font-medium hover:bg-[#007D6D]"
                >
                  {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="mr-1.5 h-4 w-4" aria-hidden="true" />}
                  {busy ? "Sending…" : "Send reply"}
                </Button>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-5">
          <SectionCard title="Status" action={<TicketStatusBadge status={ticket.status} />}>
            <p className="text-[12.5px] leading-relaxed text-slate-600">
              {ticket.status === "resolved"
                ? "This ticket has been resolved by the research office."
                : ticket.status === "in_review"
                  ? `Your ticket is currently being reviewed by the ${ticket.send_to}.`
                  : `Your ticket has been sent to the ${ticket.send_to} and is waiting to be picked up.`}
            </p>
            <ol className="mt-4 space-y-3">
              {steps.map((step, index) => (
                <li key={step.label} className="flex gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                      step.done ? "bg-[#E8F5E9] text-[#2E7D32]" : "bg-slate-100 text-slate-400",
                    )}
                  >
                    {index + 1}
                  </span>
                  <div>
                    <p className={cn("text-[12.3px] font-medium", step.done ? "text-[#0A1929]" : "text-slate-400")}>{step.label}</p>
                    <p className="text-[11px] text-slate-400">{step.at ? formatDate(step.at) : "Pending"}</p>
                  </div>
                </li>
              ))}
            </ol>
          </SectionCard>

          <SectionCard title="Ticket information">
            <dl className="space-y-2 text-[12.3px]">
              {[
                ["Ticket ID", `#${ticket.reference}`],
                ["Category", ticket.category],
                ["Sent to", ticket.send_to],
                ["Related item", ticket.related_item || "—"],
                ["Priority", ticket.priority || "Normal"],
                ["Last update", ticket.last_update ? timeAgo(ticket.last_update) : "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="max-w-[60%] text-right font-medium text-[#0A1929]">{value}</dd>
                </div>
              ))}
            </dl>
          </SectionCard>

          <SectionCard title="Need to add something?">
            <p className="text-[12.3px] leading-relaxed text-slate-600">
              Use the reply box to add information or attach more evidence. Your updates remain part of this ticket record.
            </p>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}