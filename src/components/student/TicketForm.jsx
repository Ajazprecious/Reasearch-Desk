import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Paperclip, Send, X } from "lucide-react";
import { toast } from "sonner";
import { localClient } from "@/api/localClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createTicket } from "@/lib/server-fns";

const SEND_TO = ["Research Administrator", "Postgraduate Office", "My supervisor", "Technical support"];
const CATEGORIES = [
  "Supervisor assignment delay",
  "Feedback / review delay",
  "Milestone or defence issue",
  "Administrative / record issue",
  "Upload or download error",
  "Login or access problem",
  "Something else",
];
const IMPACTS = ["Low", "Normal", "High"];

const selectClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-[#0A1929] outline-none focus:border-[#00796B]";

export function TicketForm({ milestones = [], drafts = [], onCreated }) {
  const submit = useServerFn(createTicket);
  const [sendTo, setSendTo] = useState(SEND_TO[0]);
  const [category, setCategory] = useState(CATEGORIES[1]);
  const [relatedItem, setRelatedItem] = useState("");
  const [impact, setImpact] = useState("Normal");
  const [description, setDescription] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const relatedOptions = [
    ...milestones.map((milestone) => milestone.title),
    ...drafts.slice(0, 8).map((draft) => `${draft.milestone_title} • Version ${draft.version}`),
  ];

  async function pickFile(event) {
    const chosen = event.target.files?.[0];
    event.target.value = "";
    if (!chosen) return;
    if (chosen.size > 10 * 1024 * 1024) {
      toast.error("Attach a file under 10 MB");
      return;
    }
    setUploading(true);
    try {
      const { file_uri } = await localClient.integrations.Core.UploadPrivateFile({ file: chosen });
      setAttachment({ name: chosen.name, uri: file_uri, size: `${Math.max(1, Math.round(chosen.size / 1024))} KB` });
    } catch {
      toast.error("That file could not be attached");
    } finally {
      setUploading(false);
    }
  }

  async function send() {
    setError("");
    setBusy(true);
    try {
      const result = await submit({
        data: {
          sendTo,
          category,
          relatedItem,
          impact,
          description,
          attachmentName: attachment?.name,
          attachmentUri: attachment?.uri,
          attachmentSize: attachment?.size,
        },
      });
      toast.success(`Ticket ${result.reference} sent`);
      setDescription("");
      setRelatedItem("");
      setAttachment(null);
      onCreated?.(result);
    } catch (err) {
      setError(err?.message || "Could not send this ticket");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
        <p className="text-[14px] font-semibold text-[#0A1929]">Create a report / ticket</p>
        <span className="rounded-full bg-[#FFF3E0] px-2.5 py-1 text-[11px] font-medium text-[#9A3412]">School action</span>
      </div>
      <div className="space-y-4 px-5 py-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-slate-600">Send to</span>
            <select value={sendTo} onChange={(event) => setSendTo(event.target.value)} className={selectClass}>
              {SEND_TO.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-slate-600">Issue type</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)} className={selectClass}>
              {CATEGORIES.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-slate-600">Related item</span>
            <select value={relatedItem} onChange={(event) => setRelatedItem(event.target.value)} className={selectClass}>
              <option value="">No related item</option>
              {[...new Set(relatedOptions)].map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-slate-600">Impact</span>
            <select value={impact} onChange={(event) => setImpact(event.target.value)} className={selectClass}>
              {IMPACTS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <span className="mb-1.5 block text-[12px] font-medium text-slate-600">Describe the issue</span>
          <Textarea
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Explain what is happening, what you expected and how long it has been like this."
            className="rounded-xl border-slate-200 text-[13px] leading-relaxed shadow-none focus-visible:ring-1 focus-visible:ring-[#00796B]"
          />
        </div>

        <input id="ticket-attachment" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" className="hidden" onChange={pickFile} />
        {attachment ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3.5 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <Paperclip className="h-4 w-4 shrink-0 text-[#00796B]" aria-hidden="true" />
              <p className="truncate text-[12.3px] text-[#0A1929]">
                {attachment.name} <span className="text-slate-400">• {attachment.size}</span>
              </p>
            </div>
            <button type="button" onClick={() => setAttachment(null)} className="text-slate-400 hover:text-[#C62828]" aria-label="Remove attachment">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <label
            htmlFor="ticket-attachment"
            className="inline-flex cursor-pointer items-center gap-1.5 text-[12.3px] font-medium text-[#00796B] hover:underline"
          >
            <Paperclip className="h-3.5 w-3.5" aria-hidden="true" /> {uploading ? "Attaching…" : "Attach evidence"}
          </label>
        )}

        {error && <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[12.3px] text-[#C62828]">{error}</p>}

        <div className="flex justify-end">
          <Button
            onClick={send}
            disabled={busy || description.trim().length < 15}
            className="h-10 rounded-xl bg-[#00796B] px-4 text-[13px] font-medium hover:bg-[#007D6D]"
          >
            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="mr-1.5 h-4 w-4" aria-hidden="true" />}
            {busy ? "Sending…" : "Send ticket"}
          </Button>
        </div>
      </div>
    </div>
  );
}