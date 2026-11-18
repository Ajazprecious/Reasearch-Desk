import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/workspace/SectionCard";
import { EmptyState, LoadingBlock } from "@/components/workspace/EmptyState";
import { DraftVersionRow } from "@/components/student/DraftVersionRow";
import { useStudentWorkspace } from "@/hooks/useStudentWorkspace";
import { cn } from "@/lib/utils";

const FILTERS = [
  { key: "all", label: "All versions" },
  { key: "submitted", label: "Submitted" },
  { key: "under_review", label: "Seen" },
  { key: "revision_required", label: "Feedback received" },
  { key: "approved", label: "Approved" },
];

export const Route = createFileRoute("/_authed/student/workspace/drafts")({
  head: () => ({ meta: [{ title: "Drafts & Versions — ResearchDesk" }] }),
  component: DraftsTab,
});

function DraftsTab() {
  const { data, loading } = useStudentWorkspace();
  const [filter, setFilter] = useState("all");

  if (loading) return <LoadingBlock rows={4} />;

  const drafts = data?.drafts || [];
  const feedbacks = data?.feedbacks || [];
  const visible = filter === "all" ? drafts : drafts.filter((draft) => draft.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                filter === item.key
                  ? "border-[#00796B] bg-[#00796B]/[0.08] text-[#00574C]"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <Button asChild className="h-10 rounded-xl bg-[#00796B] px-4 text-[13px] font-medium hover:bg-[#007D6D]">
          <Link to="/student/workspace/submit">
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" /> Submit new draft
          </Link>
        </Button>
      </div>

      <SectionCard bodyClassName="px-4 py-4 sm:px-5">
        {visible.length ? (
          <div className="space-y-3">
            {visible.map((draft) => (
              <DraftVersionRow key={draft.id} draft={draft} feedback={feedbacks.find((item) => item.draft_id === draft.id)} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FileText}
            title={drafts.length ? "No versions match this filter" : "No drafts submitted yet"}
            description={
              drafts.length
                ? "Try another status, or submit a new version from the workspace."
                : "Upload a chapter draft and it appears here with its status, feedback and full history."
            }
            action={
              drafts.length ? null : (
                <Button asChild className="h-10 rounded-xl bg-[#00796B] px-4 text-[13px] font-medium hover:bg-[#007D6D]">
                  <Link to="/student/workspace/submit">Submit new draft</Link>
                </Button>
              )
            }
          />
        )}
      </SectionCard>

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5">
        <p className="text-[12.5px] font-semibold text-[#0A1929]">Submission tracking</p>
        <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
          Relative time helps you scan quickly (for example, 2 hours ago or 7 days ago), while the exact date and time remain
          visible for a reliable supervision record. Submitted versions remain in history.
        </p>
      </div>
    </div>
  );
}