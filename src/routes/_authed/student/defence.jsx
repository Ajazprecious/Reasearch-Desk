import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, MapPin, Users } from "lucide-react";
import { localClient } from "@/api/localClient";
import { useAuth } from "@/lib/AuthContext";
import { useAsync } from "@/hooks/useAsync";
import { PageHeader } from "@/components/workspace/PageHeader";
import { SectionCard } from "@/components/workspace/SectionCard";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { EmptyState, LoadingBlock } from "@/components/workspace/EmptyState";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authed/student/defence")({
  head: () => ({ meta: [{ title: "Defence Follow-up — ResearchDesk" }] }),
  component: StudentDefencePage,
});

function StudentDefencePage() {
  const { user } = useAuth();
  const { data, loading } = useAsync(async () => {
    const defences = await localClient.entities.Defence.list({ sort: "scheduled_date", limit: 20 });
    const visible = defences.items.filter((defence) =>
      defence.student_email === user.email ||
      (defence.scope === "department" && defence.department === user.department),
    );
    return visible;
  }, [user?.email]);

  return (
    <div className="animate-fade">
      <PageHeader
        title="Defence Follow-up"
        description="Your defence schedule, venue, panel and any changes the research office records."
      />
      {loading ? (
        <LoadingBlock rows={3} />
      ) : data?.length ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {data.map((defence) => (
            <SectionCard
              key={defence.id}
              title={defence.status === "completed" ? "Defence completed" : "Defence scheduled"}
              action={<StatusBadge status={defence.status} />}
            >
              <ul className="space-y-2.5 text-[12.8px] text-slate-600">
                <li className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-[#00796B]" aria-hidden="true" />
                  {formatDate(defence.scheduled_date)}
                  {defence.scheduled_time ? ` • ${defence.scheduled_time}` : ""}
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#00796B]" aria-hidden="true" />
                  {defence.venue || "Venue to be confirmed"}
                </li>
                <li className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#00796B]" aria-hidden="true" />
                  {defence.panel || "Panel to be confirmed"}
                </li>
              </ul>
              {defence.notes && (
                <p className="mt-3 rounded-xl bg-[#F4FAF8] px-3.5 py-2.5 text-[12.3px] leading-relaxed text-slate-600">{defence.notes}</p>
              )}
            </SectionCard>
          ))}
        </div>
      ) : (
        <SectionCard bodyClassName="px-5 py-8 sm:px-6">
          <EmptyState
            icon={CalendarClock}
            title="No defence scheduled yet"
            description="When the research office sets your defence date, it appears here with the venue and panel."
          />
        </SectionCard>
      )}
    </div>
  );
}