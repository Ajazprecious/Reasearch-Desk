import { useState } from "react";
import { createFileRoute, Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { useAsync } from "@/hooks/useAsync";
import { getDraftReview } from "@/lib/supervisor-fns";
import { reviewDraft } from "@/lib/server-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/workspace/PageHeader";
import { EmptyState, LoadingBlock } from "@/components/workspace/EmptyState";
import { Pill } from "@/components/supervisor/portal/KpiTile";
import { SideCard } from "@/components/supervisor/portal/SideCard";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authed/supervisor/reviews/$draftId_/feedback")({
  validateSearch: (search) => ({
    outcome: search.outcome === "approved" ? "approved" : "revision_required",
  }),
  head: () => ({ meta: [{ title: "Feedback & review decision — ResearchDesk" }] }),
  component: FeedbackDecisionPage,
});

function FeedbackDecisionPage() {
  const { draftId } = useParams({ from: "/_authed/supervisor/reviews/$draftId_/feedback" });
  const search = useSearch({ from: "/_authed/supervisor/reviews/$draftId_/feedback" });
  const navigate = useNavigate();
  const { user } = useAuth();
  const load = useServerFn(getDraftReview);
  const submit = useServerFn(reviewDraft);
  const { data, loading, reload } = useAsync(() => load({ data: { draftId } }), [draftId, user?.email]);

  const [outcome, setOutcome] = useState(search.outcome);
  const [comments, setComments] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  if (loading) return <LoadingBlock rows={6} />;
  if (!data?.draft) {
    return <EmptyState title="Draft not found" description="This submission is no longer available to you." />;
  }

  const { draft, versions, history } = data;

  async function send(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await submit({
        data: {
          draftId,
          outcome,
          comments: comments.trim(),
          revisionDueDate: outcome === "revision_required" && dueDate ? dueDate : undefined,
        },
      });
      toast.success(outcome === "approved" ? "Draft approved — student notified." : "Feedback sent — revision requested.");
      navigate({ to: "/supervisor/reviews" });
    } catch {
      toast.error("The review could not be saved. Please try again.");
      reload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={send} className="animate-fade space-y-4">
      <Link
        to="/supervisor/reviews/$draftId"
        params={{ draftId }}
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#00796B] hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Draft review — {draft.milestone_title} V{draft.version}
      </Link>

      <PageHeader
        eyebrow="Review"
        title="Feedback & decision"
        description="Send structured feedback linked to this exact version and decide the next research action."
      />

      <div className="grid gap-4 lg:grid-cols-[1.8fr_1fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-[14px] font-semibold text-[#111827]">
                {draft.milestone_title} • Version {draft.version}
              </h2>
              <p className="mt-0.5 text-[11.5px] text-slate-500">
                {draft.student_name} • Submitted {formatDate(draft.submitted_date)} • Reviewed today
              </p>
            </div>
            <Pill tone="teal">{data.feedback.length} comment{data.feedback.length === 1 ? "" : "s"} recorded</Pill>
          </div>

          <div className="space-y-3 pt-3">
            <div>
              <label htmlFor="feedback" className="text-[12px] font-medium text-[#111827]">Supervisor feedback</label>
              <Textarea
                id="feedback"
                value={comments}
                onChange={(event) => setComments(event.target.value)}
                rows={7}
                placeholder="Explain what needs to change, or why the draft meets the milestone requirements…"
                className="mt-1.5 rounded-lg border-slate-200 text-[13px]"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="decision" className="text-[12px] font-medium text-[#111827]">Decision</label>
                <select
                  id="decision"
                  value={outcome}
                  onChange={(event) => setOutcome(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none focus:border-[#00796B]/60"
                >
                  <option value="revision_required">Revision required</option>
                  <option value="approved">Approved</option>
                </select>
              </div>
              <div>
                <label htmlFor="due" className="text-[12px] font-medium text-[#111827]">Revision due date</label>
                <input
                  id="due"
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  disabled={outcome === "approved"}
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none focus:border-[#00796B]/60 disabled:opacity-50"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
              <Button
                type="submit"
                disabled={saving || comments.trim().length < 5}
                className="h-10 rounded-lg bg-[#00796B] px-4 text-[13px] font-medium hover:bg-[#007D6D]"
              >
                {saving ? "Sending…" : outcome === "approved" ? "Send feedback & approve" : "Send feedback & request revision"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setOutcome(outcome === "approved" ? "revision_required" : "approved")} className="h-10 rounded-lg border-slate-300 text-[12.5px] font-medium text-slate-700">
                Switch to {outcome === "approved" ? "revision" : "approval"}
              </Button>
            </div>
            <p className="text-[11px] text-slate-400">
              Comments are attached to version {draft.version} and the student is notified immediately.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <SideCard title="What happens next">
            <ol className="list-decimal space-y-1.5 pl-4 text-[11.5px] leading-snug text-slate-600">
              <li>{draft.student_name} receives your feedback notification.</li>
              <li>The milestone status changes to {outcome === "approved" ? "approved" : "revision required"}.</li>
              <li>Your comments stay attached to version {draft.version}.</li>
              <li>
                {outcome === "approved"
                  ? "Supervision progress updates automatically."
                  : "The student uploads the next version for review."}
              </li>
            </ol>
          </SideCard>

          <SideCard title="Version history">
            <ul className="space-y-2">
              {versions.map((version) => (
                <li key={version.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-[#111827]">
                      V{version.version}
                      {version.id === draft.id ? " (current)" : ""}
                    </p>
                    <p className="text-[11px] text-slate-400">{formatDate(version.submitted_date)}</p>
                  </div>
                  <Pill tone={version.status === "approved" ? "green" : version.status === "revision_required" ? "rose" : "blue"}>
                    {version.status.replace("_", " ")}
                  </Pill>
                </li>
              ))}
            </ul>
            {history.length > 0 && <p className="mt-2.5 text-[11px] text-slate-400">{history.length} review record(s) on this milestone.</p>}
          </SideCard>

          <SideCard title="Alternative action" description="If the chapter meets the requirements, choose Approved instead of requesting another revision.">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOutcome(outcome === "approved" ? "revision_required" : "approved")}
              className="h-9 rounded-lg border-slate-300 text-[12px] font-medium text-slate-700"
            >
              {outcome === "approved" ? "Request a revision" : "Approve chapter"}
            </Button>
          </SideCard>
        </div>
      </div>
    </form>
  );
}