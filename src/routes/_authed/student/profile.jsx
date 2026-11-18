import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { localClient } from "@/api/localClient";
import { useAuth } from "@/lib/AuthContext";
import { useAsync } from "@/hooks/useAsync";
import { PageHeader } from "@/components/workspace/PageHeader";
import { SectionCard } from "@/components/workspace/SectionCard";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { LoadingBlock } from "@/components/workspace/EmptyState";
import { ResearchProfileForm } from "@/components/student/ResearchProfileForm";
import { formatDate } from "@/lib/format";
import { useServerFn } from "@tanstack/react-start";
import { generateRecommendations } from "@/lib/server-fns";

export const Route = createFileRoute("/_authed/student/profile")({
  head: () => ({ meta: [{ title: "Research profile — ResearchDesk" }] }),
  component: StudentProfilePage,
});

function StudentProfilePage() {
  const { user } = useAuth();
  const runMatching = useServerFn(generateRecommendations);
  const { data, loading, reload } = useAsync(async () => {
    const profiles = await localClient.entities.ResearchProfile.filter({ student_email: user.email }, { sort: "-created_date", limit: 1 });
    return profiles.items[0] || null;
  }, [user?.email]);

  async function handleSaved(status) {
    if (status === "submitted") {
      // Kick off the ranked match straight away; the admin still confirms the assignment.
      runMatching({ data: { studentEmail: user.email } }).catch(() => null);
    }
    reload();
  }

  return (
    <div className="animate-fade">
      <PageHeader
        title="Research profile"
        description="This information is what the research office matches against supervisor expertise, so keep it specific."
        actions={data ? <StatusBadge status={data.status} /> : null}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <SectionCard title="Research information" description={data?.submitted_date ? `Submitted ${formatDate(data.submitted_date)}` : "Save a draft any time, submit when it is ready."}>
          {loading ? <LoadingBlock rows={5} /> : <ResearchProfileForm profile={data} user={user} onSaved={handleSaved} />}
        </SectionCard>

        <div className="space-y-5">
          <SectionCard title="How matching works">
            <ol className="space-y-3 text-[12.5px] leading-relaxed text-slate-600">
              {[
                "Your title, area, keywords and description are turned into a research fingerprint.",
                "Supervisor expertise is compared against it; anyone already at supervision capacity is excluded.",
                "The closest supervisors are ranked and sent to the research office for confirmation.",
              ].map((step, index) => (
                <li key={step} className="flex gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E0F2F1] text-[11px] font-semibold text-[#00695C]">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-[#F4F7F6] px-3 py-2.5">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#00796B]" aria-hidden="true" />
              <p className="text-[11.5px] leading-relaxed text-slate-500">
                Matching suggests; the research office decides. You will be notified when your supervisor is confirmed.
              </p>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}