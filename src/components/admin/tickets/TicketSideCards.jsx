import { Button } from "@/components/ui/button";

const STEPS = [
  "The student receives the response notification.",
  "The ticket status changes to the decision you chose.",
  "Your response stays attached to this ticket record.",
  "The student can reply again, and the thread continues here.",
];

export function TicketSideCards({ ticket, resolving, onResolve }) {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200/70 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <p className="text-[14px] font-semibold text-[#0A1929]">What happens next</p>
        </div>
        <ol className="space-y-3 px-5 py-5">
          {STEPS.map((step, index) => (
            <li key={step} className="flex gap-2.5 text-[12.3px] leading-relaxed text-slate-600">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E0F2F1] text-[10.5px] font-semibold text-[#00695C]">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl border border-slate-200/70 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <p className="text-[14px] font-semibold text-[#0A1929]">Ticket information</p>
        </div>
        <dl className="space-y-2 px-5 py-5 text-[12.3px]">
          {[
            ["Reference", `#${ticket.reference}`],
            ["Student", ticket.student_name || ticket.student_email],
            ["Sent to", ticket.send_to],
            ["Priority", ticket.priority || "Normal"],
            ["Reviewed by", ticket.reviewer_name || "—"],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3">
              <dt className="text-slate-500">{label}</dt>
              <dd className="max-w-[62%] text-right font-medium text-[#0A1929]">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {ticket.status !== "resolved" && (
        <section className="rounded-2xl border border-slate-200/70 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <p className="text-[14px] font-semibold text-[#0A1929]">Alternative action</p>
          </div>
          <div className="px-5 py-5">
            <p className="text-[12.3px] leading-relaxed text-slate-600">
              If the issue needs no further explanation, close the ticket with a short closing note.
            </p>
            <Button
              onClick={onResolve}
              disabled={resolving}
              variant="outline"
              className="mt-3 h-10 w-full rounded-xl border-slate-200 text-[12.5px]"
            >
              {resolving ? "Closing…" : "Close as resolved"}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}