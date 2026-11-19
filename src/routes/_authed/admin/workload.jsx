import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Users } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useAsync } from "@/hooks/useAsync";
import { PageHeader } from "@/components/workspace/PageHeader";
import { SectionCard } from "@/components/workspace/SectionCard";
import { ProgressBar } from "@/components/workspace/ProgressBar";
import { EmptyState, LoadingBlock } from "@/components/workspace/EmptyState";
import { getAdminSupervision } from "@/lib/server-fns";

export const Route = createFileRoute("/_authed/admin/workload")({
  head: () => ({ meta: [{ title: "Supervisor workload — ResearchDesk" }] }),
  component: AdminWorkloadPage,
});

function AdminWorkloadPage() {
  const load = useServerFn(getAdminSupervision);
  const { data, loading, error } = useAsync(() => load(), []);
  const [faculty, setFaculty] = useState("all");
  const [department, setDepartment] = useState("all");
  const [availability, setAvailability] = useState("all");
  const supervisors = data?.supervisors || [];
  const faculties = useMemo(() => [...new Set(supervisors.map((item) => item.faculty).filter(Boolean))].sort(), [supervisors]);
  const departments = useMemo(
    () => [...new Set(supervisors.filter((item) => faculty === "all" || item.faculty === faculty).map((item) => item.department).filter(Boolean))].sort(),
    [supervisors, faculty],
  );
  const visible = supervisors.filter(
    (item) => (faculty === "all" || item.faculty === faculty) &&
      (department === "all" || item.department === department) &&
      (availability === "all" || item.availability === availability),
  );
  const byDepartment = useMemo(() => {
    const groups = new Map();
    visible.forEach((item) => {
      const current = groups.get(item.department || "Department not set") || { supervisors: 0, load: 0, max: 0 };
      current.supervisors += 1;
      current.load += item.load;
      current.max += item.max;
      groups.set(item.department || "Department not set", current);
    });
    return [...groups.entries()].map(([name, value]) => ({ name, ...value }));
  }, [visible]);

  return (
    <div className="animate-fade">
      <PageHeader title="Supervisor Workload" description="See supervision pressure by department before opening individual supervisor records." />
      {loading ? (
        <LoadingBlock rows={5} />
      ) : error ? (
        <EmptyState icon={AlertTriangle} title="Could not load supervisor workload" description={error.message} />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-[10.5px] font-medium text-slate-500">Faculty / School</span>
              <select value={faculty} onChange={(event) => { setFaculty(event.target.value); setDepartment("all"); }} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-[#00796B]">
                <option value="all">All faculties</option>
                {faculties.map((name) => <option key={name}>{name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10.5px] font-medium text-slate-500">Department</span>
              <select value={department} onChange={(event) => setDepartment(event.target.value)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-[#00796B]">
                <option value="all">All departments</option>
                {departments.map((name) => <option key={name}>{name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10.5px] font-medium text-slate-500">Availability</span>
              <select value={availability} onChange={(event) => setAvailability(event.target.value)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-[#00796B]">
                <option value="all">All availability</option>
                <option value="available">Available</option>
                <option value="limited">Limited</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </label>
          </div>

          <SectionCard title="Department capacity" description="Each bar shows how much of the department's combined supervision capacity is already in use." bodyClassName="px-5 py-3 sm:px-6">
            {byDepartment.length ? byDepartment.map((item) => {
              const percent = item.max ? Math.round((item.load / item.max) * 100) : 0;
              const remaining = Math.max(0, item.max - item.load);
              return (
                <div key={item.name} className="grid gap-3 border-b border-slate-100 py-3.5 last:border-0 md:grid-cols-[1fr_1.2fr_160px] md:items-center">
                  <div>
                    <p className="text-[12.5px] font-semibold text-[#22343A]">{item.name}</p>
                    <p className="mt-0.5 text-[10.8px] text-slate-400">{item.supervisors} supervisor{item.supervisors === 1 ? "" : "s"} available</p>
                  </div>
                  <div>
                    <p className="mb-1 text-[10.8px] text-slate-500">Department supervision capacity used <strong className="text-[#293C41]">{percent}%</strong></p>
                    <ProgressBar value={percent} tone={percent >= 80 ? "amber" : "teal"} />
                  </div>
                  <div className="flex items-center justify-between gap-2 md:justify-end">
                    <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-medium ${remaining <= 5 ? "bg-[#FFF3E0] text-[#A15D00]" : "bg-[#E8F5E9] text-[#367C55]"}`}>
                      {remaining} slots remaining
                    </span>
                    <Link to="/admin/records" className="text-[10.5px] font-medium text-[#53676B] hover:text-[#00796B]">View supervisors</Link>
                  </div>
                </div>
              );
            }) : (
              <div className="py-4">
                <EmptyState icon={Users} title="No supervisors match these filters" description="Adjust the department or availability filter." />
              </div>
            )}
          </SectionCard>

          <SectionCard title={`${department === "all" ? "Supervisor" : department + " supervisor"} capacity`} description="Current load compared with each supervisor's declared maximum." bodyClassName="px-5 py-3 sm:px-6">
            {visible.length ? visible.map((item) => {
              const percent = item.max ? Math.round((item.load / item.max) * 100) : 0;
              return (
                <div key={item.email} className="grid gap-2 border-b border-slate-100 py-3 last:border-0 sm:grid-cols-[1fr_1.2fr_auto] sm:items-center">
                  <div>
                    <p className="text-[12px] font-semibold text-[#22343A]">{item.name}</p>
                    <p className="text-[10.5px] text-slate-400">{item.rank || item.department}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-[10.5px] text-slate-500">{item.load} / {item.max} students</p>
                    <ProgressBar value={percent} tone={percent >= 90 ? "amber" : "teal"} />
                  </div>
                  <span className="text-[10.5px] text-slate-500">{item.availability || "Availability not set"}</span>
                </div>
              );
            }) : <p className="py-3 text-[12px] text-slate-500">No supervisor profiles are available.</p>}
          </SectionCard>
        </div>
      )}
    </div>
  );
}
