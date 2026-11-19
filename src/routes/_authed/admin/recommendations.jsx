import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useAsync } from "@/hooks/useAsync";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/workspace/PageHeader";
import { SectionCard } from "@/components/workspace/SectionCard";
import { ProgressBar } from "@/components/workspace/ProgressBar";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { EmptyState, LoadingBlock } from "@/components/workspace/EmptyState";
import { ConfirmAssignmentDialog } from "@/components/admin/ConfirmAssignmentDialog";
import { generateRecommendations, getAdminRecommendations } from "@/lib/server-fns";

export const Route = createFileRoute("/_authed/admin/recommendations")({
  head: () => ({ meta: [{ title: "Supervisor matches — ResearchDesk" }] }),
  component: AdminRecommendationsPage,
});

function AdminRecommendationsPage() {
  const load = useServerFn(getAdminRecommendations);
  const runMatching = useServerFn(generateRecommendations);
  const { data, loading, error, reload } = useAsync(() => load(), []);
  const [matching, setMatching] = useState(false);
  const [dialog, setDialog] = useState({ open: false, candidate: null, student: null });

  async function match() {
    setMatching(true);
    try {
      const result = await runMatching({ data: {} });
      if (result?.reason === "no-capacity") {
        toast.warning("Every eligible supervisor is at capacity", { description: "Free up capacity or add supervisors, then run matching again." });
      } else if (!result?.processed) {
        toast.info("Nothing to match right now", { description: "Submitted research profiles already have suggestions." });
      } else {
        toast.success(`Ranked matches ready for ${result.processed} student${result.processed === 1 ? "" : "s"}`, {
          description: "Review the suggestions and confirm the assignment.",
        });
      }
      reload();
    } catch (err) {
      toast.error(err?.message || "Matching could not run");
    } finally {
      setMatching(false);
    }
  }

  const queue = data?.queue || [];
  const awaiting = queue.filter((item) => !item.assigned);

  return (
    <div className="animate-fade">
      <PageHeader
        title="Supervisor Recommendations"
        description="Review students department by department. The department defines the eligible supervisor pool before research relevance is ranked."
        actions={
          <Button onClick={match} disabled={matching} className="h-10 rounded-xl bg-[#00796B] px-4 text-[13px] font-medium hover:bg-[#007D6D]">
            <Sparkles className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {matching ? "Matching…" : "Run matching"}
          </Button>
        }
      />

      {loading ? (
        <LoadingBlock rows={4} />
      ) : error ? (
        <EmptyState icon={AlertTriangle} title="Could not load the queue" description={error.message} />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 rounded-2xl border border-slate-200/70 bg-white px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[13px] font-semibold text-[#22343A]">Department boundary applied before AI matching</p>
              <p className="mt-1 max-w-3xl text-[11.5px] leading-relaxed text-slate-500">
                The system limits candidates to supervisors in the student's department, then checks availability and supervision capacity before ranking relevance.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-[#E8F5E9] px-2.5 py-1 text-[10.5px] font-medium text-[#367C55]">Required</span>
          </div>
          <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          <div className="space-y-5">
            {!awaiting.length && (
              <EmptyState
                icon={CheckCircle2}
                title="No students waiting for a supervisor"
                description="Every submitted research profile is either matched already or confirmed. New submissions arrive here automatically."
                action={
                  <Button onClick={match} disabled={matching} variant="outline" className="h-10 rounded-xl border-slate-200 text-[13px]">
                    Check for new profiles
                  </Button>
                }
              />
            )}

            {awaiting.map((item) => (
              <SectionCard key={item.profile.student_email} bodyClassName="px-5 py-5 sm:px-6">
                <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[14.5px] font-semibold text-[#0A1929]">{item.profile.student_name || item.profile.student_email}</p>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate-600">{item.profile.research_title}</p>
                    <p className="mt-1 text-[11.5px] text-slate-500">
                      {item.profile.research_area || "Research area not set"} · {item.profile.department || "Department not set"} · {item.profile.level || "Masters"}
                    </p>
                    {item.profile.keywords && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {item.profile.keywords
                          .split(",")
                          .map((keyword) => keyword.trim())
                          .filter(Boolean)
                          .slice(0, 6)
                          .map((keyword) => (
                            <span key={keyword} className="rounded-full bg-[#F1F5F4] px-2 py-0.5 text-[10.8px] font-medium text-[#3F5D59]">
                              {keyword}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                  <StatusBadge status={item.profile.status} />
                </div>

                {item.candidates.length ? (
                  <div className="divide-y divide-slate-100">
                    {item.candidates.map((candidate) => (
                      <div key={candidate.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 gap-3">
                          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0A1929] text-[11.5px] font-semibold text-white">
                            {candidate.rank}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-[13.5px] font-medium text-[#0A1929]">{candidate.supervisor_name}</p>
                            <p className="mt-0.5 text-[11.5px] text-slate-500">
                              {candidate.academic_rank} · {candidate.supervisor_department} · load {candidate.capacity_snapshot}
                            </p>
                            <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-slate-500">{candidate.rationale}</p>
                            {candidate.matched_keywords && (
                              <p className="mt-1 text-[11px] text-[#00796B]">Matched: {candidate.matched_keywords}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3 sm:pl-3">
                          <div className="w-[92px]">
                            <div className="mb-1 flex items-center justify-between text-[10.5px] text-slate-400">
                              <span>Match</span>
                              <span className="font-semibold tabular-nums text-[#0A1929]">{candidate.match_score}%</span>
                            </div>
                            <ProgressBar value={candidate.match_score} />
                          </div>
                          {item.assigned || candidate.status !== "pending" ? (
                            <StatusBadge status={candidate.status} />
                          ) : (
                            <Button
                              onClick={() => setDialog({ open: true, candidate, student: item.profile })}
                              className="h-9 rounded-lg bg-[#00796B] px-3.5 text-[12.5px] font-medium hover:bg-[#007D6D]"
                            >
                              Confirm
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-4">
                    <p className="text-[12.5px] text-slate-500">
                      No ranked suggestions stored for this profile yet — run matching to compare it against supervisor expertise.
                    </p>
                    <Button onClick={match} disabled={matching} variant="outline" className="mt-3 h-9 rounded-lg border-slate-200 text-[12.5px]">
                      {matching ? "Matching…" : "Run matching now"}
                    </Button>
                  </div>
                )}
              </SectionCard>
            ))}

            {queue.some((item) => item.assigned) && (
              <SectionCard title="Recently confirmed" description="Students whose supervisor is already in place." bodyClassName="px-5 py-2 sm:px-6">
                {queue
                  .filter((item) => item.assigned)
                  .map((item) => (
                    <div key={item.profile.student_email} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-3.5 last:border-0">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-[#0A1929]">{item.profile.student_name || item.profile.student_email}</p>
                        <p className="truncate text-[11.5px] text-slate-500">{item.profile.research_title}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-slate-600">{item.profile.supervisor_name}</span>
                        <StatusBadge status="approved" label="Assigned" />
                      </div>
                    </div>
                  ))}
              </SectionCard>
            )}
          </div>

          <SectionCard title="Supervisor workload" description="Capacity snapshot used by the matcher." className="h-fit">
            {data?.supervisors?.length ? (
              <ul className="space-y-3.5">
                {data.supervisors.map((supervisor) => {
                  const used = supervisor.max ? Math.round((supervisor.load / supervisor.max) * 100) : 0;
                  return (
                    <li key={supervisor.email}>
                      <div className="mb-1 flex items-center justify-between gap-2 text-[12px]">
                        <span className="truncate font-medium text-[#0A1929]">{supervisor.name}</span>
                        <span className="shrink-0 tabular-nums text-slate-500">
                          {supervisor.load}/{supervisor.max}
                        </span>
                      </div>
                      <ProgressBar value={used} tone={used >= 100 ? "rose" : used >= 70 ? "amber" : "teal"} />
                      <p className="mt-1 truncate text-[10.8px] text-slate-400">{supervisor.department}</p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState icon={Users} title="No supervisors" description="Supervisor profiles appear once they complete their expertise setup." />
            )}
            <Link to="/admin/workload" className="mt-4 inline-flex text-[12.5px] font-medium text-[#00796B] hover:underline">
              Supervisor workload →
            </Link>
          </SectionCard>
        </div>
        </div>
      )}

      <ConfirmAssignmentDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((previous) => ({ ...previous, open }))}
        candidate={dialog.candidate}
        student={dialog.student || {}}
        onConfirmed={reload}
      />
    </div>
  );
}