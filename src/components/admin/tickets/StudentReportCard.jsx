import { Paperclip } from "lucide-react";

export function StudentReportCard({ ticket, onOpenAttachment }) {
  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <p className="text-[14px] font-semibold text-[#0A1929]">Student's report</p>
          <p className="mt-0.5 text-[12px] text-slate-500">
            {ticket.category} · {ticket.student_name || ticket.student_email}
          </p>
        </div>
        <span className="rounded-full bg-[#FFF3E0] px-2.5 py-1 text-[11px] font-medium text-[#B45309]">
          {ticket.impact || "Normal"} impact
        </span>
      </div>
      <div className="px-5 py-5">
        <p className="whitespace-pre-wrap text-[12.8px] leading-relaxed text-slate-600">{ticket.description}</p>
        <dl className="mt-4 grid gap-2 text-[12px] sm:grid-cols-2">
          <div>
            <dt className="text-slate-400">Sent to</dt>
            <dd className="text-[#0A1929]">{ticket.send_to}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Related item</dt>
            <dd className="text-[#0A1929]">{ticket.related_item || "—"}</dd>
          </div>
        </dl>
        {ticket.attachment_uri && (
          <button
            type="button"
            onClick={onOpenAttachment}
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
      </div>
    </section>
  );
}