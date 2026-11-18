import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const DECISIONS = [
  { value: "in_review", label: "In review — acknowledge and investigate" },
  { value: "open", label: "Keep open — waiting on the student" },
  { value: "resolved", label: "Resolved — close the ticket" },
];

export function ResponseForm({ body, setBody, status, setStatus, onSend, busy }) {
  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white">
      <div className="border-b border-slate-100 px-5 py-4">
        <p className="text-[14px] font-semibold text-[#0A1929]">Administrator response</p>
        <p className="mt-0.5 text-[12px] text-slate-500">
          Send structured feedback linked to this ticket and decide the next action.
        </p>
      </div>
      <div className="px-5 py-5">
        <label htmlFor="admin-response" className="text-[12px] font-medium text-slate-600">
          Response to the student
        </label>
        <Textarea
          id="admin-response"
          rows={5}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Explain what you checked, what the student should do next, or confirm the issue is resolved..."
          className="mt-1.5 rounded-xl border-slate-200 text-[13px] leading-relaxed shadow-none focus-visible:ring-1 focus-visible:ring-[#00796B]"
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-slate-600">Decision</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-[#0A1929] outline-none focus:border-[#00796B]"
            >
              {DECISIONS.map((decision) => (
                <option key={decision.value} value={decision.value}>
                  {decision.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap items-center gap-2 self-end">
            <span className="rounded-full bg-[#F1F3F4] px-3 py-1.5 text-[11.5px] font-medium text-[#4B5563]">Notify student</span>
            <span className="rounded-full bg-[#F1F3F4] px-3 py-1.5 text-[11.5px] font-medium text-[#4B5563]">
              Attach to ticket record
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            onClick={onSend}
            disabled={busy || body.trim().length < 2}
            className="h-10 rounded-xl bg-[#00796B] px-4 text-[13px] font-medium hover:bg-[#007D6D]"
          >
            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="mr-1.5 h-4 w-4" aria-hidden="true" />}
            {busy ? "Sending…" : status === "resolved" ? "Send response & close ticket" : "Send response & update status"}
          </Button>
          <span className="text-[11.5px] text-slate-400">The student receives this response as a notification.</span>
        </div>
      </div>
    </section>
  );
}