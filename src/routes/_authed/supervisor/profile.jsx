import { createFileRoute } from "@tanstack/react-router";
import { localClient } from "@/api/localClient";
import { useAuth } from "@/lib/AuthContext";
import { useAsync } from "@/hooks/useAsync";
import { PageHeader } from "@/components/workspace/PageHeader";
import { SectionCard } from "@/components/workspace/SectionCard";
import { LoadingBlock } from "@/components/workspace/EmptyState";
import { ExpertiseForm } from "@/components/supervisor/ExpertiseForm";

export const Route = createFileRoute("/_authed/supervisor/profile")({
  head: () => ({ meta: [{ title: "Expertise & capacity — ResearchDesk" }] }),
  component: SupervisorProfilePage,
});

function SupervisorProfilePage() {
  const { user } = useAuth();
  const { data, loading, reload } = useAsync(async () => {
    const profiles = await localClient.entities.SupervisorProfile.filter({ email: user.email }, { limit: 1 });
    return profiles.items[0] || null;
  }, [user?.email]);

  return (
    <div className="animate-fade">
      <PageHeader
        title="Expertise & capacity"
        description="Your research areas and availability feed the recommendation engine. The research office still makes the final assignment."
      />

      {!loading && (
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5">
            <p className="text-[11.5px] font-medium text-slate-500">Availability</p>
            <p className="mt-1.5 text-[14px] font-semibold text-[#111827]">{data?.availability === "available" ? "Available for new assignments" : "Limited availability"}</p>
            <span className="mt-2 inline-flex rounded-md bg-[#E8F5E9] px-2 py-0.5 text-[11px] font-medium text-[#2E7D32]">Active</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5">
            <p className="text-[11.5px] font-medium text-slate-500">Supervision capacity</p>
            <p className="mt-1.5 text-[14px] font-semibold text-[#111827]">{data?.current_load || 0} of {data?.max_capacity || 8} slots used</p>
            <p className="mt-1 text-[11px] text-slate-400">{Math.max(0, (data?.max_capacity || 8) - (data?.current_load || 0))} slots available</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5">
            <p className="text-[11.5px] font-medium text-slate-500">Assignment status</p>
            <p className="mt-1.5 text-[14px] font-semibold text-[#111827]">Eligible for recommendation</p>
            <p className="mt-1 text-[11px] text-slate-400">Capacity and availability checks passed</p>
          </div>
        </div>
      )}

      <div>
        <SectionCard title="Supervisor profile" description="">
          {loading ? <LoadingBlock rows={5} /> : <ExpertiseForm profile={data} user={user} onSaved={reload} />}
        </SectionCard>
      </div>
    </div>
  );
}