import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Layers, MessageSquare, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TextAreaField, TextField } from "@/components/workspace/Field";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { EmptyState } from "@/components/workspace/EmptyState";
import { formatDateTime, wordCount } from "@/lib/format";
import { submitDraft } from "@/lib/server-fns";
import { cn } from "@/lib/utils";

function VersionCard({ draft, feedback }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-[#0A1929] px-2 py-0.5 text-[11px] font-semibold text-white">V{draft.version}</span>
            <p className="truncate text-[13.5px] font-medium text-[#0A1929]">{draft.title}</p>
          </div>
          <p className="mt-1 text-[11.5px] text-slate-500">
            Submitted {formatDateTime(draft.submitted_date)} · {draft.word_count || wordCount(draft.content)} words
          </p>
          {draft.summary && <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-slate-500">{draft.summary}</p>}
        </div>
        <StatusBadge status={draft.status} />
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-4 py-2.5">
        <button type="button" onClick={() => setOpen((value) => !value)} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#00796B] hover:underline">
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} aria-hidden="true" />
          {open ? "Hide submission" : "Read submission"}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-100 bg-[#FBFCFC] px-4 py-4">
          <p className="whitespace-pre-wrap text-[12.8px] leading-relaxed text-slate-600">{draft.content}</p>
        </div>
      )}

      {feedback && (
        <div className="border-t border-slate-100 bg-[#FFFDF8] px-4 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#8A5A00]">
              <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
              Supervisor feedback · V{feedback.version}
            </p>
            <StatusBadge status={feedback.outcome} label={feedback.outcome === "approved" ? "Approved" : "Revision requested"} />
          </div>
          <p className="mt-2 whitespace-pre-wrap text-[12.5px] leading-relaxed text-slate-600">{feedback.comments}</p>
          {feedback.corrections_required && (
            <div className="mt-2.5 rounded-lg border border-[#FFE0B2] bg-[#FFF3E0]/60 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#EF6C00]">Corrections required</p>
              <p className="mt-1 whitespace-pre-wrap text-[12.3px] leading-relaxed text-[#8A4B00]">{feedback.corrections_required}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Draft threads per milestone: every version kept, feedback attached to the version it reviewed. */
export function DraftWorkspace({ milestones, drafts, feedbacks, onChanged }) {
  const submit = useServerFn(submitDraft);
  const [selectedId, setSelectedId] = useState(milestones[0]?.id || "");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", summary: "", content: "" });

  useEffect(() => {
    if (milestones.length && !milestones.some((milestone) => milestone.id === selectedId)) {
      setSelectedId(milestones[0].id);
    }
  }, [milestones, selectedId]);

  const selected = milestones.find((milestone) => milestone.id === selectedId);
  const versions = useMemo(
    () =>
      drafts
        .filter((draft) => draft.milestone_id === selectedId)
        .sort((a, b) => (b.version || 0) - (a.version || 0)),
    [drafts, selectedId],
  );
  const nextVersion = (versions[0]?.version || 0) + 1;
  const feedbackFor = (draftId) => feedbacks.find((feedback) => feedback.draft_id === draftId);

  function startDraft() {
    setForm({ title: selected?.title ? `${selected.title} — version ${nextVersion}` : "", summary: "", content: "" });
    setError("");
    setOpen(true);
  }

  async function send() {
    setError("");
    if (form.title.trim().length < 3 || form.content.trim().length < 20) {
      setError("Give the draft a title and at least a short body of text.");
      return;
    }
    setBusy(true);
    try {
      const result = await submit({
        data: { milestoneId: selectedId, title: form.title.trim(), summary: form.summary.trim(), content: form.content },
      });
      toast.success(`Version ${result.version} submitted`, { description: "Your supervisor has been notified." });
      setOpen(false);
      await onChanged?.();
    } catch (err) {
      setError(err?.message || "Could not submit this draft");
    } finally {
      setBusy(false);
    }
  }

  if (!milestones.length) {
    return (
      <EmptyState
        icon={Layers}
        title="No milestones yet"
        description="Milestones appear as soon as the research office confirms your supervisor and opens your supervision workspace."
      />
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <div className="space-y-1.5">
        {milestones.map((milestone) => {
          const count = drafts.filter((draft) => draft.milestone_id === milestone.id).length;
          const active = milestone.id === selectedId;
          return (
            <button
              key={milestone.id}
              type="button"
              onClick={() => setSelectedId(milestone.id)}
              className={cn(
                "w-full rounded-xl border px-3.5 py-3 text-left transition-all",
                active ? "border-[#00796B] bg-[#00796B]/[0.06]" : "border-slate-200/80 bg-white hover:border-slate-300",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className={cn("truncate text-[13px] font-medium", active ? "text-[#00574C]" : "text-[#0A1929]")}>{milestone.title}</p>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-medium text-slate-500">{count}</span>
              </div>
              <div className="mt-1.5">
                <StatusBadge status={milestone.status} />
              </div>
            </button>
          );
        })}
      </div>

      <div className="min-w-0 rounded-2xl border border-slate-200/70 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-[#0A1929]">{selected?.title}</h2>
            <p className="mt-0.5 text-[12px] text-slate-500">
              {versions.length} version{versions.length === 1 ? "" : "s"} on record · next submission is V{nextVersion}
            </p>
          </div>
          <Button onClick={startDraft} className="h-10 rounded-xl bg-[#00796B] px-4 text-[13px] font-medium hover:bg-[#007D6D]">
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {versions.length ? "Submit new version" : "Submit draft"}
          </Button>
        </div>

        {!versions.length ? (
          <EmptyState
            icon={Send}
            title="Nothing submitted for this milestone"
            description="Upload your chapter text as version 1. Each revision afterwards becomes a new version — earlier versions are never overwritten."
          />
        ) : (
          <div className="space-y-3">
            {versions.map((draft) => (
              <VersionCard key={draft.id} draft={draft} feedback={feedbackFor(draft.id)} />
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[18px]">
              {nextVersion === 1 ? "Submit your draft" : `Submit version ${nextVersion}`}
            </DialogTitle>
            <DialogDescription className="text-[13px]">
              {selected?.title} · version {nextVersion} will be added to the history. Earlier versions stay intact.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <TextField id="draft-title" label="Draft title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <TextAreaField
              id="draft-summary"
              label="What changed in this version?"
              rows={2}
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              placeholder="Addresses the gaps raised in the previous review…"
            />
            <TextAreaField
              id="draft-content"
              label="Draft content"
              hint={`${wordCount(form.content)} words`}
              rows={10}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Paste or write your chapter text here."
            />
            {error && <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[12.5px] text-[#C62828]">{error}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="h-10 rounded-xl border-slate-200 text-[13px]">
              Cancel
            </Button>
            <Button onClick={send} disabled={busy} className="h-10 rounded-xl bg-[#00796B] px-5 text-[13px] font-medium hover:bg-[#007D6D]">
              {busy ? "Submitting…" : `Submit version ${nextVersion}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}