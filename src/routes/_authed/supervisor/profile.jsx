import { createFileRoute } from "@tanstack/react-router";
import { localClient } from "@/api/localClient";
import { useAuth } from "@/lib/AuthContext";
import { useAsync } from "@/hooks/useAsync";
import { PageHeader } from "@/components/workspace/PageHeader";
import { SectionCard } from "@/components/workspace/SectionCard";
import { LoadingBlock } from "@/components/workspace/EmptyState";
import { ExpertiseForm } from "@/components/supervisor/ExpertiseForm";
import { SupervisorCard } from "@/components/student/SupervisorCard";

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

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <SectionCard title="Supervisor profile" description="Keep this current — it is the record students are matched against.">
          {loading ? <LoadingBlock rows={5} /> : <ExpertiseForm profile={data} user={user} onSaved={reload} />}
        </SectionCard>

        <SectionCard title="Preview" description="How students see you.">
          {loading ? (
            <LoadingBlock rows={2} />
          ) : data ? (
            <SupervisorCard supervisor={data} />
          ) : (
            <p className="text-[12.5px] leading-relaxed text-slate-500">
              Fill in your expertise and capacity, then save — the preview appears here.
            </p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}