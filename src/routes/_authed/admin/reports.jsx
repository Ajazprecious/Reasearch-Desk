import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, GraduationCap, Loader2, Sparkles, TrendingUp } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useAsync } from "@/hooks/useAsync";
import { PageHeader } from "@/components/workspace/PageHeader";
import { StatCard } from "@/components/workspace/StatCard";
import { SectionCard } from "@/components/workspace/SectionCard";
import { ProgressBar } from "@/components/workspace/ProgressBar";
import { EmptyState, LoadingBlock } from "@/components/workspace/EmptyState";
import { DepartmentCompletionChart } from "@/components/admin/charts/DepartmentCompletionChart";
import { StageCompletionChart } from "@/components/admin/charts/StageCompletionChart";
import { StatusMixChart } from "@/components/admin/charts/StatusMixChart";
import { getAdminReports } from "@/lib/server-fns";
import { generateAdminAnalyticsInsights } from "@/lib/ai-fns";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authed/admin/reports")({
  head: () => ({ meta: [{ title: "Progress dashboard — ResearchDesk" }] }),
  component: AdminReportsPage,
});

function AdminReportsPage() {
  const load = useServerFn(getAdminReports);
  const generateInsights = useServerFn(generateAdminAnalyticsInsights);
  const { data, loading, error } = useAsync(() => load(), []);
  const [insights, setInsights] = useState(null);
  const [insightError, setInsightError] = useState("");
  const [generating, setGenerating] = useState(false);

  const departments = data?.byDepartment || [];
  const statusCounts = data?.statusCounts || [];
  const overdue = departments.reduce((sum, department) => sum + department.overdue, 0);

  async function requestInsights() {
    if (!data) return;
    setGenerating(true);
    setInsightError("");
    try {
      const result = await generateInsights({
        data: {
          totals: data.totals,
          byDepartment: departments.map(({ department, students, supervisors, progress, overdue: departmentOverdue }) => ({
            department,
            students,
            supervisors,
            progress,
            overdue: departmentOverdue,
          })),
          stages: data.stages,
        },
      });
      setInsights(result);
    } catch (requestError) {
      setInsightError(requestError?.message || "Gemini could not generate analytics insights.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="animate-fade space-y-5">
      <PageHeader
        title="Progress dashboard"
        description="Completion rates across departments and through the research cycle, measured from confirmed milestones."
      />

      {loading ? (
        <LoadingBlock rows={5} />
      ) : error ? (
        <EmptyState icon={AlertTriangle} title="Could not build the dashboard" description={error.message} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Students"
              value={data?.totals?.students || 0}
              hint={`${data?.totals?.users || 0} accounts in total`}
              icon={GraduationCap}
              tone="teal"
            />
            <StatCard
              label="Completion rate"
              value={`${data?.totals?.averageProgress || 0}%`}
              hint="Mean confirmed progress"
              icon={TrendingUp}
              tone="blue"
            />
            <StatCard
              label="Milestones confirmed"
              value={data?.totals?.completed || 0}
              hint={`${data?.totals?.revisions || 0} awaiting revision`}
              icon={CheckCircle2}
              tone="mint"
            />
            <StatCard
              label="Overdue work"
              value={overdue}
              hint="Milestones past their deadline"
              icon={AlertTriangle}
              tone={overdue ? "rose" : "mint"}
            />
          </div>

          <SectionCard
            title="Gemini analytics insights"
            description="AI-generated observations from aggregate programme data; verify them against the charts before acting."
            action={
              <Button type="button" variant="outline" onClick={requestInsights} disabled={generating} className="h-9 border-slate-300 text-[12px]">
                {generating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="mr-1.5 h-4 w-4" aria-hidden="true" />}
                {generating ? "Analyzing…" : "Generate insights"}
              </Button>
            }
          >
            {insightError ? (
              <p role="alert" className="text-[12.5px] text-red-700">{insightError}</p>
            ) : insights ? (
              <div aria-live="polite" className="space-y-3">
                <p className="text-[13px] font-medium text-[#0A1929]">{insights.headline}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Findings</p>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-[12px] text-slate-600">{insights.findings.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Suggested actions</p>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-[12px] text-slate-600">{insights.suggested_actions.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[12.5px] text-slate-500">Generate an on-demand summary of department progress and milestone trends.</p>
            )}
          </SectionCard>

          <div className="grid gap-5 lg:grid-cols-2">
            <SectionCard
              title="Completion by department"
              description="Approved milestones as a share of every milestone tracked."
            >
              {departments.length ? (
                <DepartmentCompletionChart departments={departments} />
              ) : (
                <p className="text-[12.5px] text-slate-500">No department data yet.</p>
              )}
            </SectionCard>

            <SectionCard title="Milestone status mix" description="Where supervision work currently sits.">
              <StatusMixChart statusCounts={statusCounts} />
            </SectionCard>
          </div>

          <SectionCard
            title="Completion by cycle stage"
            description="How many students have cleared each core milestone, across all departments."
          >
            {data?.stages?.length ? (
              <StageCompletionChart stages={data.stages} />
            ) : (
              <p className="text-[12.5px] text-slate-500">No milestones tracked yet.</p>
            )}
          </SectionCard>

          <SectionCard title="Department detail" description="Progress and overdue work per department." bodyClassName="px-5 py-4 sm:px-6">
            {departments.length ? (
              <div className="space-y-4">
                {departments.map((department) => (
                  <div key={department.department}>
                    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
                      <span className="font-medium text-[#0A1929]">{department.department}</span>
                      <span className="text-[11.5px] text-slate-500">
                        {department.students} students · {department.supervisors} supervisors
                        {department.overdue > 0 && <span className="ml-2 font-medium text-[#C62828]">{department.overdue} overdue</span>}
                      </span>
                    </div>
                    <ProgressBar value={department.progress} showLabel tone={department.progress < 35 ? "rose" : "teal"} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12.5px] text-slate-500">No department data yet.</p>
            )}
          </SectionCard>

          <SectionCard title="Summary" description="Snapshot for the research office." bodyClassName="px-5 py-4 sm:px-6">
            <dl className="grid gap-4 sm:grid-cols-3">
              {[
                { term: "Defences recorded", value: data?.totals?.defences || 0 },
                { term: "Revisions outstanding", value: data?.totals?.revisions || 0 },
                { term: "Active assignments", value: data?.totals?.assignments || 0 },
              ].map((entry) => (
                <div key={entry.term} className="rounded-xl bg-[#FBFCFC] px-4 py-3">
                  <dt className="text-[11.5px] uppercase tracking-[0.08em] text-slate-400">{entry.term}</dt>
                  <dd className="mt-1 text-[20px] font-semibold text-[#0A1929]">{entry.value}</dd>
                </div>
              ))}
            </dl>
          </SectionCard>
        </>
      )}
    </div>
  );
}