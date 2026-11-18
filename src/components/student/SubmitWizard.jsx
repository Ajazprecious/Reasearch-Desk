import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, CloudUpload, FileText, Loader2, X } from "lucide-react";
import { localClient } from "@/api/localClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, SelectField } from "@/components/workspace/Field";
import { submitDraft } from "@/lib/server-fns";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED = ["pdf", "doc", "docx"];
const STEPS = [
  { key: "upload", label: "1 Upload" },
  { key: "review", label: "2 Review" },
  { key: "submitted", label: "3 Submitted" },
];

const fileSize = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

/** Three-step submission flow: pick the chapter and document, review, then confirm. */
export function SubmitWizard({ milestones, drafts, initialChapterId }) {
  const submit = useServerFn(submitDraft);
  const inputRef = useRef(null);
  const defaultChapter = milestones.find((milestone) => milestone.id === initialChapterId)
    ? initialChapterId
    : milestones.find((milestone) => milestone.status !== "approved")?.id || milestones[0]?.id || "";

  const [chapterId, setChapterId] = useState(defaultChapter);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [note, setNote] = useState("");
  const [step, setStep] = useState("upload");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const chapter = milestones.find((milestone) => milestone.id === chapterId) || null;
  const version = Math.max(0, ...drafts.filter((draft) => draft.milestone_id === chapterId).map((draft) => draft.version || 0)) + 1;

  async function accept(chosen) {
    if (!chosen) return;
    const extension = chosen.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED.includes(extension)) {
      setError("Upload a PDF or Word document.");
      return;
    }
    if (chosen.size > MAX_BYTES) {
      setError("That document is larger than 20 MB.");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const { file_uri } = await localClient.integrations.Core.UploadPrivateFile({ file: chosen });
      setFile({ name: chosen.name, uri: file_uri, size: chosen.size });
    } catch (err) {
      setError(err?.message || "That upload did not finish. Try again.");
    } finally {
      setUploading(false);
    }
  }

  function onPick(event) {
    const chosen = event.target.files?.[0];
    event.target.value = "";
    accept(chosen);
  }

  function onDrop(event) {
    event.preventDefault();
    setDragging(false);
    accept(event.dataTransfer.files?.[0]);
  }

  async function confirm() {
    if (!chapter || !file) return;
    setBusy(true);
    setError("");
    try {
      const response = await submit({
        data: {
          milestoneId: chapter.id,
          title: `${chapter.title} — version ${version}`,
          note: note.trim(),
          fileName: file.name,
          fileUri: file.uri,
        },
      });
      setResult({ version: response.version, submitted_date: new Date().toISOString() });
      setStep("submitted");
    } catch (err) {
      setError(err?.message || "Could not submit this draft");
    } finally {
      setBusy(false);
    }
  }

  if (!milestones.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center">
        <p className="text-[14px] font-medium text-[#0A1929]">No chapters open yet</p>
        <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-relaxed text-slate-500">
          Your chapter list appears once the research office confirms your supervisor.
        </p>
        <Button asChild variant="outline" className="mt-4 h-10 rounded-xl border-slate-200 text-[13px]">
          <Link to="/student">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap items-center gap-2">
        {STEPS.map((entry) => {
          const active = entry.key === step;
          const complete = STEPS.findIndex((item) => item.key === entry.key) < STEPS.findIndex((item) => item.key === step);
          return (
            <li
              key={entry.key}
              className={cn(
                "rounded-full border px-4 py-1.5 text-[12px] font-medium",
                active ? "border-[#00796B] bg-[#00796B] text-white" : complete ? "border-[#00796B]/40 bg-[#00796B]/[0.08] text-[#00574C]" : "border-slate-200 bg-white text-slate-500",
              )}
            >
              {entry.label}
            </li>
          );
        })}
      </ol>

      {error && <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[12.5px] text-[#C62828]">{error}</p>}

      {step === "upload" && (
        <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
          <div className="space-y-5 rounded-2xl border border-slate-200/70 bg-white px-5 py-5">
            <div>
              <p className="text-[14px] font-semibold text-[#0A1929]">Draft details</p>
              <p className="mt-0.5 text-[12px] text-slate-500">Pick the chapter this document belongs to.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                id="chapter"
                label="Chapter"
                value={chapterId}
                onChange={(event) => setChapterId(event.target.value)}
                options={milestones.map((milestone) => ({ value: milestone.id, label: milestone.title }))}
              />
              <Field label="Version" htmlFor="version">
                <input
                  id="version"
                  value={`Version ${version}`}
                  readOnly
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[13.5px] text-slate-600"
                />
              </Field>
            </div>

            <input ref={inputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={onPick} />
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
              }}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-5 py-8 text-center transition-colors",
                dragging ? "border-[#00796B] bg-[#00796B]/[0.05]" : "border-slate-300 bg-slate-50/50 hover:border-[#00796B]",
              )}
            >
              {uploading ? (
                <Loader2 className="h-7 w-7 animate-spin text-[#00796B]" aria-hidden="true" />
              ) : (
                <CloudUpload className="h-7 w-7 text-[#00796B]" aria-hidden="true" />
              )}
              <p className="mt-2.5 text-[13px] font-medium text-[#0A1929]">{uploading ? "Uploading document…" : "Drag and drop your document here"}</p>
              <p className="mt-0.5 text-[12px] text-[#00796B]">or click to browse files</p>
              <p className="mt-1.5 text-[11.5px] text-slate-400">PDF or DOCX • maximum 20 MB</p>
            </div>

            {file && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <FileText className="h-4 w-4 shrink-0 text-[#00796B]" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="truncate text-[12.8px] font-medium text-[#0A1929]">{file.name}</p>
                    <p className="text-[11.5px] text-slate-500">{fileSize(file.size)} • ready to upload</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1 text-[11.5px] font-medium text-[#C62828] hover:bg-red-50"
                >
                  <X className="h-3 w-3" aria-hidden="true" /> Remove
                </button>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="note" className="text-[12.5px] font-medium text-slate-600">
                Note to supervisor
              </label>
              <Textarea
                id="note"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Tell your supervisor what changed in this version…"
                className="rounded-xl border-slate-200 bg-white text-[13.5px] leading-relaxed shadow-none focus-visible:ring-1 focus-visible:ring-[#00796B]"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
              <Button asChild variant="outline" className="h-10 rounded-xl border-slate-200 text-[13px]">
                <Link to="/student/workspace">Cancel</Link>
              </Button>
              <Button
                onClick={() => setStep("review")}
                disabled={!file || uploading}
                className="h-10 rounded-xl bg-[#00796B] px-4 text-[13px] font-medium hover:bg-[#007D6D]"
              >
                Continue to review
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white px-5 py-5">
            <p className="text-[13px] font-semibold text-[#0A1929]">Before you continue</p>
            <ul className="mt-3 space-y-2.5">
              {[
                "You can remove or replace the selected file before submission.",
                "Submitting creates a new version under the selected chapter.",
                "Your supervisor receives a notification after you submit.",
                "Submitted versions remain in history. Upload a new revision instead of deleting them.",
              ].map((line) => (
                <li key={line} className="flex gap-2 text-[12.3px] leading-relaxed text-slate-600">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00796B]" aria-hidden="true" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {step === "review" && chapter && file && (
        <div className="rounded-2xl border border-slate-200/70 bg-white px-5 py-5">
          <p className="text-[14px] font-semibold text-[#0A1929]">Review your submission</p>
          <p className="mt-0.5 text-[12px] text-slate-500">Nothing is sent until you confirm.</p>
          <dl className="mt-4 divide-y divide-slate-100 text-[12.8px]">
            {[
              ["Chapter", chapter.title],
              ["Version", `Version ${version}`],
              ["Document", `${file.name} • ${fileSize(file.size)}`],
              ["Note to supervisor", note.trim() || "No note added"],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-wrap justify-between gap-2 py-2.5">
                <dt className="text-slate-500">{label}</dt>
                <dd className="max-w-[60%] text-right font-medium text-[#0A1929]">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setStep("upload")} className="h-10 rounded-xl border-slate-200 text-[13px]" disabled={busy}>
              Back
            </Button>
            <Button onClick={confirm} disabled={busy} className="h-10 rounded-xl bg-[#00796B] px-4 text-[13px] font-medium hover:bg-[#007D6D]">
              {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              {busy ? "Submitting…" : "Submit draft"}
            </Button>
          </div>
        </div>
      )}

      {step === "submitted" && result && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200/70 bg-white px-6 py-10 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#E8F5E9] text-[#2E7D32]">
              <Check className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-3 text-[16px] font-semibold text-[#0A1929]">Draft submitted successfully</p>
            <p className="mt-1 text-[12.8px] text-slate-500">
              {chapter?.title} Version {result.version} is now waiting for supervisor review.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className="rounded-full bg-[#E0F2F1] px-2.5 py-1 text-[11.5px] font-medium text-[#00695C]">Awaiting review</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11.5px] font-medium text-slate-600">
                Submitted just now • {formatDateTime(result.submitted_date)}
              </span>
            </div>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button asChild className="h-10 rounded-xl bg-[#00796B] px-4 text-[13px] font-medium hover:bg-[#007D6D]">
                <Link to="/student/workspace">Open My Workspace</Link>
              </Button>
              <Button asChild variant="outline" className="h-10 rounded-xl border-slate-200 text-[13px]">
                <Link to="/student">Back to dashboard</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/70 bg-white px-5 py-4">
              <p className="text-[13px] font-semibold text-[#0A1929]">Submission details</p>
              <dl className="mt-3 space-y-2 text-[12.5px]">
                {[
                  ["Chapter", chapter?.title],
                  ["Version", `Version ${result.version}`],
                  ["File", file.name],
                  ["Status", "Awaiting review"],
                ].map(([label, value]) => (
                  <div key={label} className="flex flex-wrap justify-between gap-2">
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="font-medium text-[#0A1929]">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-white px-5 py-4">
              <p className="text-[13px] font-semibold text-[#0A1929]">Next step</p>
              <p className="mt-1.5 text-[12.3px] leading-relaxed text-slate-500">
                Your supervisor can now review this version. When it is opened, the status updates to Seen and you receive a notification.
              </p>
              <div className="mt-3 rounded-xl bg-[#F4FAF8] px-3.5 py-3">
                <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[#00796B]">Recent activity</p>
                <p className="mt-1 text-[12px] text-slate-600">
                  {formatDateTime(result.submitted_date)} • {chapter?.title} Version {result.version} submitted for review
                </p>
                <p className="text-[12px] text-slate-400">• Not seen yet</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}