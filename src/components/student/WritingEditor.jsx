import { useCallback, useEffect, useRef, useState } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { useServerFn } from "@tanstack/react-start";
import { Check, ImagePlus, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { localClient } from "@/api/localClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { submitDraft } from "@/lib/server-fns";
import { formatDateTime, timeAgo, wordCount } from "@/lib/format";
import { cn } from "@/lib/utils";

const TOOLBAR = [
  [{ header: [2, 3, false] }],
  ["bold", "italic", "underline"],
  [{ list: "ordered" }, { list: "bullet" }],
  ["blockquote", "link", "image"],
  ["clean"],
];

const plainText = (html) => String(html || "").replace(/<[^>]*>/g, " ");

/** Collaborative writing surface: autosaves the working document, then submits it as a version. */
export function WritingEditor({ milestones, drafts, user }) {
  const submit = useServerFn(submitDraft);
  const quillRef = useRef(null);
  const dirty = useRef(false);

  const [chapterId, setChapterId] = useState(
    milestones.find((milestone) => milestone.status !== "approved")?.id || milestones[0]?.id || "",
  );
  const [docId, setDocId] = useState(null);
  const [html, setHtml] = useState("");
  const [note, setNote] = useState("");
  const [savedAt, setSavedAt] = useState(null);
  const [state, setState] = useState("idle");
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [busy, setBusy] = useState(false);

  const chapter = milestones.find((milestone) => milestone.id === chapterId) || null;
  const versions = drafts.filter((draft) => draft.milestone_id === chapterId);
  const nextVersion = Math.max(0, ...versions.map((draft) => draft.version || 0)) + 1;

  useEffect(() => {
    if (!chapterId) return undefined;
    let cancelled = false;
    setLoadingDoc(true);
    localClient.entities.WritingDocument.filter({ student_email: user.email, milestone_id: chapterId }, { limit: 1 })
      .then(({ items }) => {
        if (cancelled) return;
        setDocId(items[0]?.id || null);
        setHtml(items[0]?.content || "");
        setSavedAt(items[0]?.last_saved || null);
        setState("idle");
        dirty.current = false;
      })
      .finally(() => {
        if (!cancelled) setLoadingDoc(false);
      });
    return () => {
      cancelled = true;
    };
  }, [chapterId, user.email]);

  const persist = useCallback(
    async (content) => {
      const payload = {
        student_email: user.email,
        milestone_id: chapterId,
        milestone_title: chapter?.title || "",
        content,
        word_count: wordCount(plainText(content)),
        last_saved: new Date().toISOString(),
      };
      setState("saving");
      const record = docId
        ? await localClient.entities.WritingDocument.update(docId, payload)
        : await localClient.entities.WritingDocument.create(payload);
      setDocId(record.id);
      setSavedAt(record.last_saved);
      setState("saved");
    },
    [chapter?.title, chapterId, docId, user.email],
  );

  useEffect(() => {
    if (!dirty.current || !chapterId) return undefined;
    const timer = setTimeout(() => {
      persist(html).catch(() => {
        setState("error");
        toast.error("Could not autosave your document");
      });
    }, 1200);
    return () => clearTimeout(timer);
  }, [html, persist, chapterId]);

  useEffect(() => {
    const quill = quillRef.current?.getEditor();
    const toolbar = quill?.getModule("toolbar");
    if (!toolbar) return;
    toolbar.addHandler("image", () => {
      const picker = document.createElement("input");
      picker.type = "file";
      picker.accept = "image/*";
      picker.onchange = async () => {
        const file = picker.files?.[0];
        if (!file) return;
        try {
          const { file_url } = await localClient.integrations.Core.UploadPublicFile({ file });
          const range = quill.getSelection(true) || { index: quill.getLength() };
          quill.insertEmbed(range.index, "image", file_url, "user");
        } catch {
          toast.error("That image could not be added");
        }
      };
      picker.click();
    });
  }, []);

  async function submitVersion() {
    if (!chapter) return;
    setBusy(true);
    try {
      await persist(html);
      const response = await submit({
        data: {
          milestoneId: chapter.id,
          title: `${chapter.title} — version ${nextVersion}`,
          content: html,
          note: note.trim(),
        },
      });
      toast.success(`Version ${response.version} submitted for review`);
      setNote("");
      setState("idle");
    } catch (err) {
      toast.error(err?.message || "Could not submit this version");
    } finally {
      setBusy(false);
    }
  }

  if (!milestones.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-[13px] text-slate-500">
        Collaborative writing opens once your chapters are created.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-5 lg:grid-cols-[1.9fr_1fr]">
        <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={chapterId}
                onChange={(event) => setChapterId(event.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[12.5px] font-medium text-[#0A1929] outline-none focus:border-[#00796B]"
              >
                {milestones.map((milestone) => (
                  <option key={milestone.id} value={milestone.id}>
                    {milestone.title}
                  </option>
                ))}
              </select>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11.5px] font-medium text-slate-600">
                Next: Version {nextVersion}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11.5px]">
              <span className="text-slate-500">{wordCount(plainText(html))} words</span>
              <span className="inline-flex items-center gap-1.5 text-slate-500">
                {state === "saving" ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#00796B]" aria-hidden="true" /> Saving…
                  </>
                ) : state === "error" ? (
                  "Not saved"
                ) : savedAt ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-[#2E7D32]" aria-hidden="true" /> Saved {timeAgo(savedAt)}
                  </>
                ) : (
                  "Autosave on"
                )}
              </span>
            </div>
          </div>

          {loadingDoc ? (
            <div className="px-4 py-16 text-center text-[12.5px] text-slate-400">Opening document…</div>
          ) : (
            <div className="writing-surface">
              <ReactQuill
                ref={quillRef}
                theme="snow"
                value={html}
                onChange={(value) => {
                  dirty.current = true;
                  setHtml(value);
                }}
                modules={{ toolbar: TOOLBAR }}
                placeholder="Start writing this chapter…"
              />
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/70 bg-white px-5 py-4">
            <p className="text-[13px] font-semibold text-[#0A1929]">Submit this version</p>
            <p className="mt-0.5 text-[11.8px] leading-relaxed text-slate-500">
              Submitting sends the current text to your supervisor as Version {nextVersion}.
            </p>
            <div className="mt-3 space-y-1.5">
              <label htmlFor="writing-note" className="text-[12px] font-medium text-slate-600">
                Note to supervisor
              </label>
              <Textarea
                id="writing-note"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="What should your supervisor look at first?"
                className="rounded-xl border-slate-200 text-[12.8px] shadow-none focus-visible:ring-1 focus-visible:ring-[#00796B]"
              />
            </div>
            <Button
              onClick={submitVersion}
              disabled={busy || !chapter}
              className="mt-3 h-10 w-full rounded-xl bg-[#00796B] text-[13px] font-medium hover:bg-[#007D6D]"
            >
              {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="mr-1.5 h-4 w-4" aria-hidden="true" />}
              {busy ? "Submitting…" : "Submit for review"}
            </Button>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white px-5 py-4">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-[#0A1929]">Chapter status</p>
              {chapter && <StatusBadge status={chapter.status} />}
            </div>
            <dl className="mt-3 space-y-2 text-[12.3px]">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Versions on record</dt>
                <dd className="font-medium text-[#0A1929]">{versions.length}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Last saved</dt>
                <dd className="font-medium text-[#0A1929]">{savedAt ? formatDateTime(savedAt) : "Not saved yet"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Words</dt>
                <dd className="font-medium text-[#0A1929]">{wordCount(plainText(html))}</dd>
              </div>
            </dl>
          </div>

          <div className={cn("rounded-2xl border border-[#E6F4F1] bg-[#F4FAF8] px-5 py-4")}>
            <p className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#00796B]">
              <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" /> Working document
            </p>
            <p className="mt-1 text-[11.8px] leading-relaxed text-slate-600">
              Your writing saves automatically. Submitted versions are kept in Drafts &amp; Versions — writing again creates a new version
              instead of replacing the old one.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}