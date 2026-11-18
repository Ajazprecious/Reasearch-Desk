import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Clock, UserRoundCheck } from "lucide-react";
import { localClient } from "@/api/localClient";
import { useAuth } from "@/lib/AuthContext";
import { useAsync } from "@/hooks/useAsync";
import { PageHeader } from "@/components/workspace/PageHeader";
import { SectionCard } from "@/components/workspace/SectionCard";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { EmptyState, LoadingBlock } from "@/components/workspace/EmptyState";
import { SupervisorCard } from "@/components/student/SupervisorCard";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/student/supervisor")({
  head: () => ({ meta: [{ title: "My supervisor — ResearchDesk" }] }),
  component: StudentSupervisorPage,
});

function StudentSupervisorPage() {
  const { user } = useAuth();
  const { data, loading } = useAsync(async () => {
    const profiles = await localClient.entities.ResearchProfile.filter({ student_email: user.email }, { sort: "-created_date", limit: 1 });
    const assignments = await localClient.entities.Assignment.filter({ student_email: user.email }, { sort: "-created_date", limit: 1 });
    const profile = profiles.items[0] || null;
    const recommendations = profile
      ? await localClient.entities.Recommendation.filter({ student_email: user.email }, { sort: "rank", limit: 3 })
      : { items: [] };
    let supervisor = null;
    if (profile?.supervisor_email) {
      const supervisors = await localClient.entities.SupervisorProfile.filter({ email: profile.supervisor_email }, { limit: 1 });
      supervisor = supervisors.items[0] || null;
    }
    return { profile, assignment: assignments.items[0] || null, supervisor, recommendationCount: recommendations.items.length };
  }, [user?.email]);

  const assigned = Boolean(data?.profile?.supervisor_email);
  const steps = [
    { label: "Research profile submitted", done: data?.profile?.status === "submitted" || assigned },
    { label: "Supervisor matches reviewed", done: assigned || Boolean(data?.recommendationCount) },
    { label: "Supervisor confirmed", done: assigned },
  ];

  return (
    <div className="animate-fade">
      <PageHeader title="My supervisor" description="Assignment status, plus your confirmed supervisor's expertise and availability." />

      {loading ? (
        <LoadingBlock rows={3} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <SectionCard title={assigned ? "Confirmed supervisor" : "Supervision status"}>
            {assigned ? (
              <div className="space-y-5">
                <SupervisorCard supervisor={data.supervisor} supervisorName={data.profile.supervisor_name} />
                <div className="grid gap-3 rounded-xl bg-[#F8FAF9] p-4 text-[12.5px] text-slate-600 sm:grid-cols-2">
                  <p>
                    <span className="block text-[11px] uppercase tracking-[0.08em] text-slate-400">Assigned on</span>
                    {formatDate(data.assignment?.assigned_date)}
                  </p>
                  <p>
                    <span className="block text-[11px] uppercase tracking-[0.08em] text-slate-400">Research title</span>
                    {data.profile.research_title}
                  </p>
                </div>
                <Link to="/student/drafts" className="inline-flex text-[12.5px] font-medium text-[#00796B] hover:underline">
                  Submit your next chapter draft →
                </Link>
              </div>
            ) : (
              <EmptyState
                icon={UserRoundCheck}
                title="No supervisor confirmed yet"
                description="The research office reviews the ranked matches for your profile and confirms the final assignment. You will be notified here and in your notifications."
                action={
                  data?.profile?.status !== "submitted" ? (
                    <Link to="/student/profile" className="text-[12.5px] font-medium text-[#00796B] hover:underline">
                      Complete your research profile
                    </Link>
                  ) : null
                }
              />
            )}
          </SectionCard>

          <SectionCard title="Assignment steps">
            <ol className="space-y-3">
              {steps.map((step, index) => (
                <li key={step.label} className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                      step.done ? "bg-[#E8F5E9] text-[#2E7D32]" : "bg-slate-100 text-slate-400",
                    )}
                  >
                    {step.done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : index + 1}
                  </span>
                  <div>
                    <p className={cn("text-[12.5px] font-medium", step.done ? "text-[#0A1929]" : "text-slate-500")}>{step.label}</p>
                    {!step.done && index === steps.findIndex((entry) => !entry.done) && (
                      <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-[#EF6C00]">
                        <Clock className="h-3 w-3" aria-hidden="true" /> In progress
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
            {data?.profile && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="mb-2 text-[11px] uppercase tracking-[0.08em] text-slate-400">Profile status</p>
                <StatusBadge status={data.profile.status} />
              </div>
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
}