import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useAsync } from "@/hooks/useAsync";
import { getSupervisorPortal } from "@/lib/supervisor-fns";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/workspace/PageHeader";
import { ProgressBar } from "@/components/workspace/ProgressBar";
import { EmptyState, LoadingBlock } from "@/components/workspace/EmptyState";
import { KpiTile } from "@/components/supervisor/portal/KpiTile";
import { DaysPill, TrackStatusPill } from "@/components/supervisor/portal/SideCard";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authed/supervisor/timeline")({
  head: () => ({ meta: [{ title: "Timeline & defences — ResearchDesk" }] }),
  component: TimelinePage,
});

function TimelinePage() {
  const { user } = useAuth();
  const load = useServerFn(getSupervisorPortal);
  const { data, loading } = useAsync(() => load(), [user?.email]);
  const totals = data?.totals || {};
  const nearest = data?.nearestDefence;

  const rows = (data?.students || [])
    .slice()
    .sort((a, b) => (a.days_left ?? 9999) - (b.days_left ?? 9999));

  return (
    <div className="animate-fade">
      <PageHeader
        eyebrow="Calendar"
        title="Timeline & defences"
        description="See how much time remains for each supervised student's key milestones, defence and expected project completion."
      />

      {loading ? (
        <LoadingBlock rows={4} />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiTile
              label="Nearest defence"
              value={nearest ? `${nearest.days_left} days` : "—"}
              hint={nearest ? formatDate(nearest.scheduled_date) : "No defence scheduled"}
              tone="amber"
            />
            <KpiTile label="Due within 30 days" value={`${totals.dueWithin30 ?? 0} students`} hint="Defence or major milestone" tone="blue" />
            <KpiTile label="Needs attention" value={`${totals.needsAttention ?? 0} student${totals.needsAttention === 1 ? "" : "s"}`} hint="Less than 10 days to milestone" tone="rose" />
            <KpiTile label="On schedule" value={`${totals.onTrack ?? 0} students`} hint="No immediate deadline risk" tone="green" />
          </div>

          {rows.length ? (
            <div className="space-y-2.5">
              {rows.map((student) => (
                <article key={student.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3.5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="text-[13.5px] font-semibold text-[#111827]">{student.student_name}</h2>
                      <p className="mt-0.5 text-[11.5px] text-slate-500">
                        {student.stage}
                        {student.next_milestone ? ` • Next: ${student.next_milestone.title}` : ""}
                        {student.defence?.scheduled_date ? ` • Defence ${formatDate(student.defence.scheduled_date)}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <DaysPill days={student.days_left} />
                      <TrackStatusPill status={student.status} />
                      <Button asChild variant="outline" className="h-8 rounded-lg border-slate-300 px-3 text-[11.5px] font-medium text-slate-700">
                        <Link to="/supervisor/students/$studentId" params={{ studentId: student.student_email }}>
                          Open student
                        </Link>
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center gap-3">
                    <ProgressBar value={student.progress} className="max-w-md" />
                    <span className="shrink-0 text-[11px] text-slate-500">{student.progress}% complete</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CalendarClock}
              title="No timelines yet"
              description="Once students are assigned, their milestone and defence dates appear here."
            />
          )}
        </div>
      )}
    </div>
  );
}