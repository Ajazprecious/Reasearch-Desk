import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Search } from "lucide-react";

// Where a typed name goes in each workspace.
const PEOPLE_TARGET = {
  supervisor: { to: "/supervisor/students", label: "students" },
  admin: { to: "/admin/users", label: "students, supervisors, and administrators" },
};

/** Topbar search: jumps to a workspace screen, and searches people in the admin and supervisor portals. */
export function TopbarSearch({ role, nav = [] }) {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const needle = term.trim().toLowerCase();
    if (!needle) return [];
    const pages = nav
      .filter((item) => item.label.toLowerCase().includes(needle))
      .slice(0, 3)
      .map((item) => ({ key: item.to, label: item.label, hint: "Page", to: item.to }));
    const people = PEOPLE_TARGET[role];
    if (people) {
      pages.push({
        key: "people",
        label: `Search ${people.label} for “${term.trim()}”`,
        hint: "Directory",
        to: people.to,
        search: { q: term.trim() },
      });
    }
    return pages.slice(0, 4);
  }, [term, nav, role]);

  function go(result) {
    if (!result) return;
    setOpen(false);
    setTerm("");
    if (result.search) navigate({ to: result.to, search: result.search });
    else navigate({ to: result.to });
  }

  function submit(event) {
    event.preventDefault();
    go(results[0]);
  }

  return (
    <form onSubmit={submit} className="relative min-w-0 flex-1 lg:max-w-[400px]" role="search">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      <input
        type="search"
        value={term}
        onChange={(event) => {
          setTerm(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 140)}
        placeholder={role === "admin" ? "Search students, supervisors, projects…" : PEOPLE_TARGET[role] ? "Search students, pages…" : "Search workspace…"}
        aria-label="Search the workspace"
        className="h-10 w-full rounded-xl border border-slate-200 bg-[#FBFCFC] pl-9 pr-3 text-[13px] text-[#0A1929] outline-none transition-colors placeholder:text-slate-400 focus:border-[#00796B]/50 focus:bg-white focus:ring-2 focus:ring-[#00796B]/10"
      />
      {open && results.length > 0 && (
        <ul className="absolute left-0 right-0 top-[46px] z-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-[0_18px_38px_-22px_rgba(15,23,42,0.45)]">
          {results.map((result) => (
            <li key={result.key}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => go(result)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] text-slate-600 transition-colors hover:bg-slate-50 hover:text-[#0A1929]"
              >
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{result.label}</span>
                <span className="shrink-0 text-[10.5px] uppercase tracking-[0.08em] text-slate-400">{result.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}