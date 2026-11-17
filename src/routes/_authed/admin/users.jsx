import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Search, Users } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useAsync } from "@/hooks/useAsync";
import { PageHeader } from "@/components/workspace/PageHeader";
import { SectionCard } from "@/components/workspace/SectionCard";
import { EmptyState, LoadingBlock } from "@/components/workspace/EmptyState";
import { formatDate, initials } from "@/lib/format";
import { getAdminDirectory } from "@/lib/server-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/admin/users")({
  validateSearch: (search) => ({ q: typeof search.q === "string" ? search.q : undefined }),
  head: () => ({ meta: [{ title: "People — ResearchDesk" }] }),
  component: AdminUsersPage,
});

const ROLE_STYLE = {
  student: "bg-[#E3F2FD] text-[#1565C0]",
  supervisor: "bg-[#F3E8FD] text-[#6A1B9A]",
  admin: "bg-[#E8F5E9] text-[#2E7D32]",
};
const ROLE_LABEL = { student: "Student", supervisor: "Supervisor", admin: "Administrator" };

function AdminUsersPage() {
  const search = Route.useSearch();
  const load = useServerFn(getAdminDirectory);
  const { data, loading, error } = useAsync(() => load(), []);
  const [role, setRole] = useState("all");
  const [query, setQuery] = useState(search.q || "");

  const people = data || [];
  const counts = useMemo(
    () => ({
      all: people.length,
      student: people.filter((person) => person.role === "student").length,
      supervisor: people.filter((person) => person.role === "supervisor").length,
      admin: people.filter((person) => person.role === "admin").length,
    }),
    [people],
  );
  const visible = people.filter((person) => {
    const matchesRole = role === "all" || person.role === role;
    const needle = query.trim().toLowerCase();
    const matchesQuery =
      !needle ||
      [person.full_name, person.email, person.department].filter(Boolean).some((value) => String(value).toLowerCase().includes(needle));
    return matchesRole && matchesQuery;
  });

  return (
    <div className="animate-fade">
      <PageHeader title="People" description="Students, supervisors and administrators by faculty and department." />

      {loading ? (
        <LoadingBlock rows={5} />
      ) : error ? (
        <EmptyState icon={AlertTriangle} title="Could not load the directory" description={error.message} />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            {["all", "student", "supervisor", "admin"].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setRole(option)}
                className={cn(
                  "h-9 rounded-xl border px-3.5 text-[12.5px] font-medium transition-colors",
                  role === option
                    ? "border-[#00796B] bg-[#00796B]/[0.07] text-[#00574C]"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                )}
              >
                {option === "all" ? "Everyone" : ROLE_LABEL[option]} · {counts[option]}
              </button>
            ))}
            <div className="relative ml-auto">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, email or department"
                className="h-10 w-full min-w-[240px] rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-[13px] text-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#00796B]"
              />
            </div>
          </div>

          <SectionCard title="Directory" description={`${visible.length} record(s)`} bodyClassName="px-5 py-3 sm:px-6">
            {visible.length ? (
              <div className="overflow-x-auto scrollbar-slim">
                <table className="w-full min-w-[820px] text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] uppercase tracking-[0.08em] text-slate-400">
                      <th className="py-2.5 pr-4 font-medium">Name</th>
                      <th className="py-2.5 pr-4 font-medium">Role</th>
                      <th className="py-2.5 pr-4 font-medium">Department</th>
                      <th className="py-2.5 pr-4 font-medium">Details</th>
                      <th className="py-2.5 font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((person) => (
                      <tr key={person.id} className="border-b border-slate-50 text-[13px] last:border-0">
                        <td className="py-3.5 pr-4">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F1F5F4] text-[11px] font-semibold text-[#3F5D59]">
                              {initials(person.full_name, person.email)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-[#0A1929]">{person.full_name}</p>
                              <p className="truncate text-[11.5px] text-slate-400">{person.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 pr-4">
                          <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium", ROLE_STYLE[person.role] || ROLE_STYLE.student)}>
                            {ROLE_LABEL[person.role] || person.role}
                          </span>
                        </td>
                        <td className="py-3.5 pr-4 text-slate-500">
                          <p>{person.department}</p>
                          <p className="text-[11px] text-slate-400">{person.faculty}</p>
                        </td>
                        <td className="max-w-[280px] py-3.5 pr-4">
                          <p className="truncate text-[12.5px] text-slate-600">{person.detail}</p>
                        </td>
                        <td className="py-3.5 text-[12px] text-slate-400">{formatDate(person.created_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-3">
                <EmptyState icon={Users} title="Nobody matches" description="Adjust the role filter or the search term." />
              </div>
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
}