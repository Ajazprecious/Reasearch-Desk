import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, FileText, Layers, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/workspace/SectionCard";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { EmptyState, LoadingBlock } from "@/components/workspace/EmptyState";
import { useStudentWorkspace, versionsFor } from "@/hooks/useStudentWorkspace";
import { dueLabel, formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/student/workspace/chapters")({
  head: () => ({ meta: [{ title: "Chapter workspace — ResearchDesk" }] }),
  component: ChaptersTab,
});

function ChaptersTab() {
  const { data, loading } = useStudentWorkspace();
  const [selectedId, setSelectedId] = useState(null);

  if (loading) return <LoadingBlock rows={4} />;

  const milestones = data?.milestones || [];
  const drafts = data?.drafts || [];
  const feedbacks = data?.feedbacks || [];
  const selected = milestones.find((milestone) => milestone.id === selectedId) || milestones.find((milestone) => milestone.status !== "approved") || milestones[0];

  if (!milestones.length) {
    return (
      <EmptyState
        icon={Layers}
        title="Your chapter list opens with supervision"
        description="Once the research office confirms your supervisor, the standard chapters and their deadlines appear here."
      />
    );
  }

  const versions = selected ? versionsFor(drafts, selected.id) : [];
  const milestoneFeedback = feedbacks.filter((feedback) => feedback.milestone_id === selected?.id);
  const latestNote = milestoneFeedback[0];

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
      <SectionCard title="Chapters" description="Your dissertation structure">
        <ol className="space-y-1.5">
          {milestones.map((milestone, index) => {
            const active = milestone.id === selected?.id;
            return (
              <li key={milestone.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(milestone.id)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2.5 text-left transition-colors",
                    active ? "border-[#00796B] bg-[#00796B]/[0.06]" : "border-slate-200/70 bg-white hover:border-slate-300",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-400">Chapter {index + 1}</p>
                      <p className={cn("truncate text-[12.8px] font-medium", active ? "text-[#00574C]" : "text-[#0A1929]")}>{milestone.title}</p>
                    </div>
                    <StatusBadge status={milestone.status} className="shrink-0" />
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      </SectionCard>

      {selected && (
        <SectionCard
          title={selected.title}
          description={selected.description}
          action={<StatusBadge status={selected.status} />}
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF3E0] px-2.5 py-1 text-[11.5px] font-medium text-[#92400E]">
                <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                {selected.due_date ? `Due ${formatDate(selected.due_date)}` : "No date set"}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11.5px] font-medium text-slate-600">
                {versions.length ? `Current version: V${versions[0].version}` : "Not submitted yet"}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11.5px] font-medium text-slate-600">
                {versions.length} version{versions.length === 1 ? "" : "s"} on record
              </span>
            </div>

            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-400">Version history</p>
              {versions.length ? (
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200/70">
                  {versions.slice(0, 3).map((draft) => (
                    <li key={draft.id} className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-[12.8px] font-medium text-[#0A1929]">Version {draft.version}</p>
                        <p className="text-[11.5px] text-slate-500">{formatDateTime(draft.submitted_date)}</p>
                      </div>
                      <StatusBadge status={draft.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3.5 py-3 text-[12.5px] text-slate-500">
                  Nothing submitted for this chapter yet.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-[#E6F4F1] bg-[#F4FAF8] px-3.5 py-3">
              <p className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[#00796B]">
                <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" /> Latest supervisor note
              </p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-600">
                {latestNote ? latestNote.comments : "No supervisor note on this chapter yet."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="h-10 rounded-xl border-slate-200 text-[13px]">
                <Link to="/student/workspace/feedback">Open feedback</Link>
              </Button>
              <Button asChild className="h-10 rounded-xl bg-[#00796B] px-4 text-[13px] font-medium hover:bg-[#007D6D]">
                <Link to="/student/workspace/submit" search={{ chapter: selected.id }}>
                  <FileText className="mr-1.5 h-4 w-4" aria-hidden="true" /> Submit chapter draft
                </Link>
              </Button>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  );
}