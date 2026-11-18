import { AlertTriangle } from "lucide-react";
import { SectionCard } from "@/components/workspace/SectionCard";
import { Switch } from "@/components/ui/switch";
import { CAPACITY_OPTIONS } from "@/lib/supervisor-settings";

export function AvailabilityCard({ prefs, set, load }) {
  const atCapacity = Number(load || 0) >= Number(prefs.max_capacity || 0);

  return (
    <SectionCard title="Availability & workload" description="Availability and capacity decide whether the matching engine suggests you.">
      <div className="flex items-start justify-between gap-6 pb-4">
        <div className="min-w-0">
          <label htmlFor="supervisor-available" className="block cursor-pointer text-[12.8px] font-medium text-[#0A1929]">
            Available for new supervisions
          </label>
          <p id="supervisor-available-desc" className="mt-0.5 text-[11.8px] leading-relaxed text-slate-500">
            Unavailable supervisors are removed from the recommendation pool until switched back on.
          </p>
        </div>
        <Switch
          id="supervisor-available"
          checked={!!prefs.available}
          onCheckedChange={(value) => set({ available: value })}
          aria-describedby="supervisor-available-desc"
          className="mt-0.5 shrink-0"
        />
      </div>

      <div className="max-w-xs">
        <label htmlFor="supervisor-capacity" className="mb-1.5 block text-[12px] font-medium text-slate-600">
          Maximum supervisions this session
        </label>
        <select
          id="supervisor-capacity"
          value={prefs.max_capacity}
          onChange={(event) => set({ max_capacity: Number(event.target.value) })}
          aria-describedby="supervisor-capacity-desc"
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-[#0A1929] outline-none focus:border-[#00796B] focus-visible:ring-2 focus-visible:ring-[#00796B]/30"
        >
          {CAPACITY_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value} students
            </option>
          ))}
        </select>
        <p id="supervisor-capacity-desc" className="mt-1.5 text-[11.5px] text-slate-400">
          Includes students already assigned to you.
        </p>
      </div>

      <div
        role={atCapacity ? "alert" : "status"}
        className={
          atCapacity
            ? "mt-4 flex items-start gap-2.5 rounded-xl border border-[#F2D9A6] bg-[#FFF8E1] px-3.5 py-3 text-[11.8px] leading-relaxed text-[#7A5B00]"
            : "mt-4 flex items-start gap-2.5 rounded-xl border border-[#CDE7E4] bg-[#E6F4F1] px-3.5 py-3 text-[11.8px] leading-relaxed text-[#00635A]"
        }
      >
        {atCapacity && <AlertTriangle className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />}
        <span>
          {atCapacity
            ? `You are supervising ${load || 0} of ${prefs.max_capacity} students. At capacity, new students are matched to another supervisor until a slot frees up.`
            : `You are supervising ${load || 0} of ${prefs.max_capacity} students, leaving ${Math.max(Number(prefs.max_capacity || 0) - Number(load || 0), 0)} slot(s) open.`}
        </span>
      </div>
    </SectionCard>
  );
}