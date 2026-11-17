import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { localClient } from "@/api/localClient";
import { useAuth } from "@/lib/AuthContext";
import { useAsync } from "@/hooks/useAsync";
import { getDraftReview } from "@/lib/supervisor-fns";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingBlock } from "@/components/workspace/EmptyState";
import { Pill } from "@/components/supervisor/portal/KpiTile";
import { SideCard } from "@/components/supervisor/portal/SideCard";
import { ReviewChecklist } from "@/components/supervisor/portal/ReviewChecklist";
import { formatDate, timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authed/supervisor/reviews/$draftId")({
  head: () => ({ meta: [{ title: "Review draft — ResearchDesk" }] }),
  component: ReviewDraftPage,
});

const plain = (value) => String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

function ReviewDraftPage() {
  const { draftId } = useParams({ from: "/_authed/supervisor/reviews/$draftId" });
  const { user } = useAuth();
  const load = useServerFn(getDraftReview);
  const { data, loading } = useAsync(() => load({ data: { draftId } }), [draftId, user?.email]);

  if (loading) return <LoadingBlock rows={6} />;
  if (!data?.draft) {
    return <EmptyState icon={FileText} title="Draft not found" description="This submission is no longer available to you." />;
  }

  const { draft, versions, feedback } = data;
  const previous = versions.find((version) => version.version === (draft.version || 1) - 1);

  async function download() {
    try {
      const { signed_url } = await localClient.integrations.Core.CreateFileSignedUrl({ file_uri: draft.file_uri });
      window.open(signed_url, "_blank", "noopener");
    } catch {
      toast.error("The attached file could not be opened.");
    }
  }

  return (
    <div className="animate-fade space-y-4">
      <Link to="/supervisor/reviews" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#00796B] hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Review queue
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#00796B]">Draft review</p>
          <h1 className="text-[25px] font-semibold leading-tight tracking-[-0.025em] text-[#0A1929] sm:text-[27px]">{draft.student_name}</h1>
          <p className="mt-1.5 text-[13px] text-slate-500">
            {draft.milestone_title} • Version {draft.version} • Submitted {formatDate(draft.submitted_date)}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Pill tone="teal">Milestone: {draft.milestone_title}</Pill>
            {previous && <Pill tone="gray">Previous version: V{previous.version}</Pill>}
            <Pill tone="yellow">{timeAgo(draft.submitted_date)}</Pill>
            <Pill tone={draft.status === "under_review" ? "amber" : "blue"}>{draft.status === "under_review" ? "In review" : "Awaiting review"}</Pill>
          </div>
        </div>
        <Button asChild className="h-10 shrink-0 rounded-xl bg-[#00796B] px-4 text-[13px] font-medium hover:bg-[#007D6D]">
          <Link to="/supervisor/reviews/$draftId/feedback" params={{ draftId: draft.id }}>
            Continue to feedback
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.8fr_1fr]">
        <article className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <div>
              <h2 className="text-[14px] font-semibold text-[#111827]">{draft.title || draft.milestone_title}</h2>
              <p className="mt-0.5 text-[11.5px] text-slate-500">
                {draft.word_count ? `${draft.word_count} words • ` : ""}
                {versions.length} version{versions.length === 1 ? "" : "s"} on record
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {draft.file_uri && (
                <Button variant="outline" onClick={download} className="h-8 rounded-lg border-slate-300 px-3 text-[11.5px] font-medium text-slate-700">
                  <Download className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Download file
                </Button>
              )}
            </div>
          </div>

          {draft.summary && <p className="border-b border-slate-100 bg-slate-50/60 px-4 py-2.5 text-[12px] text-slate-600">{draft.summary}</p>}

          <div className="px-4 py-4">
            {plain(draft.content) ? (
              <p className="whitespace-pre-wrap text-[13px] leading-[1.85] text-[#1f2a30]">{plain(draft.content)}</p>
            ) : (
              <p className="text-[12.5px] text-slate-500">
                This submission was uploaded as {draft.file_name || "an attachment"} with no inline text. Open the file to review it.
              </p>
            )}
          </div>

          <div className="border-t border-slate-100 px-4 py-2.5 text-[11.5px] text-slate-500">
            {draft.note ? `Student note: ${draft.note}` : `Submitted ${timeAgo(draft.submitted_date)}`}
          </div>
        </article>

        <div className="space-y-3">
          <SideCard title="Review checklist">
            <ReviewChecklist />
          </SideCard>

          <SideCard title="Comments" description={`${feedback.length} comment${feedback.length === 1 ? "" : "s"} recorded on this version`}>
            {feedback.length ? (
              <ul className="space-y-2">
                {feedback.map((entry) => (
                  <li key={entry.id} className="rounded-lg bg-[#FFF8E1] p-2.5 text-[11.5px] leading-snug text-slate-700">
                    {entry.comments}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11.5px] text-slate-500">No comments on this version yet.</p>
            )}
          </SideCard>

          <SideCard title="Ready to decide?">
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="h-9 rounded-lg border-slate-300 text-[12px] font-medium text-slate-700">
                <Link to="/supervisor/reviews/$draftId/feedback" params={{ draftId: draft.id }} search={{ outcome: "revision_required" }}>
                  Request revision
                </Link>
              </Button>
              <Button asChild className="h-9 rounded-lg bg-[#00796B] px-3.5 text-[12px] font-medium hover:bg-[#007D6D]">
                <Link to="/supervisor/reviews/$draftId/feedback" params={{ draftId: draft.id }} search={{ outcome: "approved" }}>
                  Approve
                </Link>
              </Button>
            </div>
          </SideCard>
        </div>
      </div>
    </div>
  );
}