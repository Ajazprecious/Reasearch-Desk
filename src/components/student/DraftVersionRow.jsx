import { useState } from "react";
import { ChevronDown, Download, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { localClient } from "@/api/localClient";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { formatDateTime, timeAgo, wordCount } from "@/lib/format";
import { cn } from "@/lib/utils";

/** One submitted version: header row, expandable activity, feedback and the uploaded document. */
export function DraftVersionRow({ draft, feedback }) {
  const [open, setOpen] = useState(false);
  const [opening, setOpening] = useState(false);

  async function openFile() {
    setOpening(true);
    try {
      const { signed_url } = await localClient.integrations.Core.CreateFileSignedUrl({ file_uri: draft.file_uri });
      window.open(signed_url, "_blank", "noopener");
    } catch {
      toast.error("Could not open that document");
    } finally {
      setOpening(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3.5">
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-medium text-[#0A1929]">{draft.milestone_title || draft.title}</p>
          <p className="mt-1 text-[11.5px] text-slate-500">
            Version {draft.version} • Submitted {timeAgo(draft.submitted_date)} • {formatDateTime(draft.submitted_date)}
          </p>
          <p className="mt-0.5 text-[11.5px] text-slate-400">
            {feedback
              ? `Feedback received ${timeAgo(feedback.reviewed_date)}${draft.status === "approved" ? " • seen and approved" : ""}`
              : draft.status === "under_review"
                ? "Seen by your supervisor"
                : "Awaiting review"}
          </p>
        </div>
        <StatusBadge
          status={draft.status}
          label={draft.status === "under_review" ? "Seen" : draft.status === "revision_required" ? "Feedback received" : undefined}
        />
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 px-4 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#00796B] hover:underline"
        >
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} aria-hidden="true" />
          {open ? "Hide activity" : "View activity"}
        </button>
        {draft.file_uri && (
          <button
            type="button"
            onClick={openFile}
            disabled={opening}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-600 hover:underline disabled:opacity-60"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            {opening ? "Preparing…" : draft.file_name || "Open document"}
          </button>
        )}
        {!draft.file_uri && <span className="text-[11.5px] text-slate-400">{draft.word_count || wordCount(draft.content)} words in the workspace</span>}
      </div>

      {open && (
        <div className="space-y-3 border-t border-slate-100 bg-[#FBFCFC] px-4 py-4">
          <ol className="space-y-2">
            <li className="flex gap-2.5 text-[12.3px] text-slate-600">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00796B]" aria-hidden="true" />
              Submitted {formatDateTime(draft.submitted_date)}
            </li>
            {feedback && (
              <li className="flex gap-2.5 text-[12.3px] text-slate-600">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00796B]" aria-hidden="true" />
                {feedback.outcome === "approved" ? "Approved" : "Feedback received"} {formatDateTime(feedback.reviewed_date)}
              </li>
            )}
          </ol>
          {draft.note && (
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">Your note</p>
              <p className="mt-1 whitespace-pre-wrap text-[12.3px] leading-relaxed text-slate-600">{draft.note}</p>
            </div>
          )}
          {draft.content && (
            <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-slate-600">
              {String(draft.content).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()}
            </p>
          )}
          {feedback && (
            <div className="rounded-lg border border-[#FFE0B2] bg-[#FFFDF8] px-3 py-2.5">
              <p className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#8A5A00]">
                <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" /> {feedback.supervisor_name || "Supervisor"} · V{feedback.version}
              </p>
              <p className="mt-1.5 whitespace-pre-wrap text-[12.3px] leading-relaxed text-slate-600">{feedback.comments}</p>
              {feedback.corrections_required && (
                <p className="mt-2 whitespace-pre-wrap text-[12.3px] leading-relaxed text-[#8A4B00]">{feedback.corrections_required}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}