import { Award, Building2, CalendarClock, Users } from "lucide-react";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { ProgressBar } from "@/components/workspace/ProgressBar";
import { initials } from "@/lib/format";

/** The assigned supervisor's expertise and capacity, as the student and admin see it. */
export function SupervisorCard({ supervisor, supervisorName, compact = false }) {
  const name = supervisor?.full_name || supervisorName || "Supervisor";
  const load = Number(supervisor?.current_load || 0);
  const max = Number(supervisor?.max_capacity || 0);
  const capacity = max ? Math.round((load / max) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E0F2F1] text-[13px] font-semibold text-[#00695C]">
          {initials(name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-[#0A1929]">{name}</p>
          <p className="truncate text-[12px] text-slate-500">{supervisor?.academic_rank || "Research supervisor"}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          {supervisor?.department || "—"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Award className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          {supervisor?.preferred_level || "Both levels"}
        </span>
        {supervisor?.office_hours && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            {supervisor.office_hours}
          </span>
        )}
      </div>

      {supervisor?.research_areas && (
        <div className="flex flex-wrap gap-1.5">
          {supervisor.research_areas
            .split(",")
            .map((area) => area.trim())
            .filter(Boolean)
            .slice(0, 6)
            .map((area) => (
              <span key={area} className="rounded-full bg-[#F1F5F4] px-2.5 py-1 text-[11.5px] font-medium text-[#3F5D59]">
                {area}
              </span>
            ))}
        </div>
      )}

      {max > 0 && (
        <div>
          <div className="mb-1.5 flex items-center justify-between text-[11.5px] text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              Supervision load
            </span>
            <span className="tabular-nums">
              {load}/{max}
            </span>
          </div>
          <ProgressBar value={capacity} tone={capacity >= 90 ? "rose" : capacity >= 70 ? "amber" : "teal"} />
        </div>
      )}

      {!compact && supervisor?.availability && <StatusBadge status={supervisor.availability} />}
    </div>
  );
}