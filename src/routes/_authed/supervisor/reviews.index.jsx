import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ClipboardCheck } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useAsync } from "@/hooks/useAsync";
import { getSupervisorPortal } from "@/lib/supervisor-fns";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/workspace/PageHeader";
import { EmptyState, LoadingBlock } from "@/components/workspace/EmptyState";
import { FilterPills } from "@/components/supervisor/portal/KpiTile";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { KpiTile } from "@/components/supervisor/portal/KpiTile";
import { formatDate, timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authed/supervisor/reviews/")({
  head: () => ({ meta: [{ title: "Review queue — ResearchDesk" }] }),
  component: ReviewQueuePage,
});

function ReviewQueuePage() {
  const { user } = useAuth();
  const load = useServerFn(getSupervisorPortal);
  const { data, loading } = useAsync(() => load(), [user?.email]);
  const [filter, setFilter] = useState("all");

  const pending = data?.pending || [];
  const rows = pending.filter((draft) => filter === "all" || draft.status === filter);
  const revisions = pending.filter((draft) => draft.status === "revision_required").length;
  const reviewedThisWeek = pending.filter((draft) => draft.status === "approved").length;

  return (
    <div className="animate-fade">
      <PageHeader
        eyebrow="Review"
        title="Review queue"
        description="Every submitted version waiting on your decision, oldest first. Open a submission to read it and record an outcome."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Awaiting review" value={pending.length} hint="Oldest: 3 days" tone="gray" />
        <KpiTile label="Due today" value={pending.filter((draft) => draft.status === "submitted").length} hint="Amara Nwosu" tone="amber" />
        <KpiTile label="Revision cycles" value={revisions} hint="Open corrections" tone="rose" />
        <KpiTile label="Reviewed this week" value={reviewedThisWeek} hint="Completed actions" tone="green" />
      </div>

      <FilterPills
        className="mb-4"
        value={filter}
        onChange={setFilter}
        options={[
          { key: "all", label: "All", count: pending.length },
          { key: "submitted", label: "Submitted" },
          { key: "under_review", label: "In review" },
        ]}
      />

      {loading ? (
        <LoadingBlock rows={4} />
      ) : rows.length ? (
        <div className="space-y-2.5">
          {rows.map((draft) => (
            <article key={draft.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-[13.5px] font-semibold text-[#111827]">
                  {draft.student_name} — {draft.milestone_title}
                </h2>
                <p className="mt-0.5 text-[11.5px] text-slate-500">
                  Version {draft.version} • submitted {draft.submitted_date ? formatDate(draft.submitted_date) : "recently"}
                  {draft.submitted_date ? ` (${timeAgo(draft.submitted_date)})` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={draft.status} />
                <Button asChild className="h-8 rounded-lg bg-[#00796B] px-3 text-[11.5px] font-medium hover:bg-[#007D6D]">
                  <Link to="/supervisor/reviews/$draftId" params={{ draftId: draft.id }}>Open review</Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState icon={ClipboardCheck} title="Nothing waiting" description="Submitted drafts from your students appear here the moment they arrive." />
      )}
    </div>
  );
}