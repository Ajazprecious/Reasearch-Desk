import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CornerUpLeft, MessageSquare, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/workspace/SectionCard";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { EmptyState, LoadingBlock } from "@/components/workspace/EmptyState";
import { useStudentWorkspace } from "@/hooks/useStudentWorkspace";
import { formatDateTime, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/student/workspace/feedback")({
  head: () => ({ meta: [{ title: "Feedback & Revision — ResearchDesk" }] }),
  component: FeedbackTab,
});

function FeedbackTab() {
  const { data, loading } = useStudentWorkspace();
  const [selectedId, setSelectedId] = useState(null);

  if (loading) return <LoadingBlock rows={4} />;

  const feedbacks = data?.feedbacks || [];
  const drafts = data?.drafts || [];
  const selected = feedbacks.find((feedback) => feedback.id === selectedId) || feedbacks[0];
  const draft = selected ? drafts.find((item) => item.id === selected.draft_id) || null : null;

  if (!feedbacks.length) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No feedback yet"
        description="When your supervisor reviews a version, their comments and corrections appear here."
        action={
          <Button asChild className="h-10 rounded-xl bg-[#00796B] px-4 text-[13px] font-medium hover:bg-[#007D6D]">
            <Link to="/student/workspace/drafts">See submitted versions</Link>
          </Button>
        }
      />
    );
  }

  const timeline = [
    { label: "Submitted", date: draft?.submitted_date },
    { label: "Feedback received", date: selected.reviewed_date },
    {
      label: "Revised",
      date: drafts
        .filter((item) => item.milestone_id === selected.milestone_id && (item.version || 0) > (selected.version || 0))
        .sort((a, b) => (a.version || 0) - (b.version || 0))[0]?.submitted_date,
    },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
      <SectionCard title="Feedback inbox" bodyClassName="px-3 py-3">
        <ul className="space-y-1.5">
          {feedbacks.map((feedback) => {
            const active = feedback.id === selected.id;
            return (
              <li key={feedback.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(feedback.id)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2.5 text-left transition-colors",
                    active ? "border-[#00796B] bg-[#00796B]/[0.06]" : "border-slate-200/70 bg-white hover:border-slate-300",
                  )}
                >
                  <p className={cn("truncate text-[12.8px] font-medium", active ? "text-[#00574C]" : "text-[#0A1929]")}>
                    {feedback.milestone_title} • Version {feedback.version}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-slate-500">Feedback received {timeAgo(feedback.reviewed_date)}</p>
                  <div className="mt-1.5">
                    <StatusBadge
                      status={feedback.outcome}
                      label={feedback.outcome === "approved" ? "Approved" : "Revision required"}
                    />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </SectionCard>

      <SectionCard
        title={`${selected.milestone_title} • Version ${selected.version}`}
        action={
          <StatusBadge
            status={selected.outcome}
            label={selected.outcome === "approved" ? "Approved" : "Revision required"}
          />
        }
      >
        <div className="space-y-5">
          <p className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-[#FBFCFC] px-4 py-3 text-[12.8px] leading-relaxed text-slate-700">
            {selected.comments}
          </p>
          {selected.corrections_required && (
            <div className="rounded-xl border border-[#FFE0B2] bg-[#FFF8F1] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#EF6C00]">Corrections required</p>
              <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-relaxed text-[#8A4B00]">{selected.corrections_required}</p>
            </div>
          )}

          <p className="text-[12px] text-slate-500">
            Supervisor: {selected.supervisor_name || "—"} • Feedback received {timeAgo(selected.reviewed_date)} •{" "}
            {formatDateTime(selected.reviewed_date)}
          </p>

          <div className="flex flex-wrap gap-2">
            <Button asChild className="h-10 rounded-xl bg-[#00796B] px-4 text-[13px] font-medium hover:bg-[#007D6D]">
              <Link to="/student/workspace/submit" search={{ chapter: selected.milestone_id }}>
                <Upload className="mr-1.5 h-4 w-4" aria-hidden="true" /> Upload revised version
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-10 rounded-xl border-slate-200 text-[13px]">
              <Link to="/student/workspace">
                <CornerUpLeft className="mr-1.5 h-4 w-4" aria-hidden="true" /> Back to workspace
              </Link>
            </Button>
          </div>

          <div>
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-400">Submission activity</p>
            <ol className="flex flex-wrap items-start gap-x-6 gap-y-3">
              {timeline.map((entry) => (
                <li key={entry.label} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex h-2.5 w-2.5 rounded-full",
                      entry.date ? "bg-[#00796B]" : "bg-slate-200",
                    )}
                    aria-hidden="true"
                  />
                  <span className={cn("text-[12px]", entry.date ? "text-slate-600" : "text-slate-400")}>
                    {entry.label}
                    {entry.date ? ` • ${formatDateTime(entry.date)}` : ""}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}