import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { localClient } from "@/api/localClient";
import { useAsync } from "@/hooks/useAsync";
import { PageHeader } from "@/components/workspace/PageHeader";
import { LoadingBlock, EmptyState } from "@/components/workspace/EmptyState";
import { TicketStatusBadge } from "@/components/student/TicketStatusBadge";
import { StudentReportCard } from "@/components/admin/tickets/StudentReportCard";
import { ResponseForm } from "@/components/admin/tickets/ResponseForm";
import { TicketThread } from "@/components/admin/tickets/TicketThread";
import { TicketSideCards } from "@/components/admin/tickets/TicketSideCards";
import { respondToTicket } from "@/lib/server-fns";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authed/admin/tickets/$ticketId")({
  head: () => ({ meta: [{ title: "Ticket response — ResearchDesk" }] }),
  component: AdminTicketDetailPage,
});

function AdminTicketDetailPage() {
  const { ticketId } = Route.useParams();
  const respond = useServerFn(respondToTicket);
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("in_review");
  const [busy, setBusy] = useState(false);
  const [resolving, setResolving] = useState(false);

  const { data, loading, error, reload } = useAsync(async () => {
    const ticket = await localClient.entities.Ticket.get(ticketId);
    const updates = await localClient.entities.TicketUpdate.filter({ ticket_id: ticketId }, { sort: "created_date", limit: 100 });
    return { ticket, updates: updates.items || [] };
  }, [ticketId]);

  async function send(nextStatus, text) {
    const message = (text || "").trim();
    if (message.length < 2) return;
    try {
      await respond({ data: { ticketId, body: message, status: nextStatus, isOfficial: true } });
      setBody("");
      await reload();
      toast.success(nextStatus === "resolved" ? "Ticket closed with your response" : "Response sent to the student");
    } catch (err) {
      toast.error(err?.message || "Could not send this response");
    }
  }

  async function onSend() {
    setBusy(true);
    await send(status, body);
    setBusy(false);
  }

  async function onResolve() {
    setResolving(true);
    await send("resolved", body.trim() || "Closed by the research office — this ticket needs no further action.");
    setResolving(false);
  }

  async function openAttachment() {
    try {
      const { signed_url } = await localClient.integrations.Core.CreateFileSignedUrl({ file_uri: data.ticket.attachment_uri });
      window.open(signed_url, "_blank", "noopener");
    } catch {
      toast.error("That file could not be opened");
    }
  }

  if (loading) return <LoadingBlock rows={5} />;
  if (error) return <EmptyState icon={AlertTriangle} title="Could not load this ticket" description={error.message} />;
  if (!data?.ticket) return <EmptyState icon={AlertTriangle} title="Ticket not found" description="It may have been removed." />;

  const { ticket, updates } = data;

  return (
    <div className="animate-fade">
      <Link to="/admin/tickets" className="mb-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-slate-500 hover:text-[#00796B]">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Ticket queue
      </Link>

      <PageHeader
        title={`Ticket #${ticket.reference}`}
        description={`${ticket.category} · Submitted by ${ticket.student_name || ticket.student_email} · ${formatDateTime(ticket.created_date)}`}
        actions={<TicketStatusBadge status={ticket.status} />}
      />

      <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200/70 bg-white px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[13.5px] font-semibold text-[#0A1929]">
                  #{ticket.reference} · {ticket.category}
                </p>
                <p className="mt-0.5 text-[11.8px] text-slate-500">
                  {ticket.student_name || ticket.student_email} · Submitted {formatDateTime(ticket.created_date)} · Sent to {ticket.send_to}
                </p>
                <p className="mt-1 text-[11.5px] text-slate-400">
                  Previous status: {ticket.status === "open" ? "Open" : ticket.status === "in_review" ? "In review" : "Resolved"}
                </p>
              </div>
              <span className="rounded-full bg-[#E0F2F1] px-2.5 py-1 text-[11px] font-medium text-[#00695C]">{updates.length} messages</span>
            </div>
          </div>

          <StudentReportCard ticket={ticket} onOpenAttachment={openAttachment} />

          <ResponseForm
            body={body}
            setBody={setBody}
            status={status}
            setStatus={setStatus}
            onSend={onSend}
            busy={busy}
          />

          <TicketThread updates={updates} />
        </div>

        <TicketSideCards ticket={ticket} resolving={resolving} onResolve={onResolve} />
      </div>
    </div>
  );
}