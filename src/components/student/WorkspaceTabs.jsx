import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export const WORKSPACE_TABS = [
  { label: "Overview", to: "/student/workspace" },
  { label: "Collaborative Writing", to: "/student/workspace/writing" },
  { label: "Chapters", to: "/student/workspace/chapters" },
  { label: "Drafts & Versions", to: "/student/workspace/drafts" },
  { label: "Feedback & Revision", to: "/student/workspace/feedback" },
  { label: "Reports & Tickets", to: "/student/tickets" },
];

export function WorkspaceTabs({ pathname }) {
  return (
    <nav className="mb-5 flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-3" aria-label="Workspace sections">
      {WORKSPACE_TABS.map((tab) => {
        const active = tab.to === "/student/workspace" ? pathname === tab.to : pathname.startsWith(tab.to);
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={cn(
              "rounded-full px-3.5 py-2 text-[12.5px] font-medium transition-colors",
              active ? "bg-[#00796B] text-white" : "text-slate-600 hover:bg-slate-100",
            )}
            aria-current={active ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}