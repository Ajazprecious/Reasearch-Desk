import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, LifeBuoy, Search } from "lucide-react";
import { PageHeader } from "@/components/workspace/PageHeader";
import { SectionCard } from "@/components/workspace/SectionCard";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { useAuth } from "@/lib/AuthContext";
import { resolveRole } from "@/lib/roles";
import { Button } from "@/components/ui/button";

const TOPICS = [
  {
    title: "Collaborative Writing",
    to: "/student/workspace/writing",
    description: "Write directly in the editor, add images or tables, comment and submit a version.",
  },
  {
    title: "Drafts & version history",
    to: "/student/workspace/drafts",
    description: "Upload Word/PDF files and understand submitted, seen, reviewed and revised states.",
  },
  {
    title: "Feedback & revisions",
    to: "/student/workspace/feedback",
    description: "Open supervisor comments and submit a corrected version without losing history.",
  },
  {
    title: "Defence follow-up",
    to: "/student/defence",
    description: "Find defence details, panel feedback, corrections and documents.",
  },
  {
    title: "Reports & Tickets",
    to: "/student/tickets",
    description: "Report delays or record issues and follow the response in one thread.",
  },
];

const SHORTCUTS = [
  ["Save current work", "Ctrl / Cmd + S"],
  ["Submit for review", "Ctrl / Cmd + Enter"],
  ["Open notifications", "Alt + N"],
  ["Jump to search", "/"],
];

export const Route = createFileRoute("/_authed/help")({
  head: () => ({ meta: [{ title: "Help — ResearchDesk" }] }),
  component: HelpPage,
});

function HelpPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");

  const topics = TOPICS.filter((topic) =>
    `${topic.title} ${topic.description}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <WorkspaceLayout role={resolveRole(user) || "student"}>
    <div className="animate-fade">
      <PageHeader
        eyebrow="Support"
        title="Help"
        description="Find quick guidance for using the workspace, learn useful shortcuts, and contact technical support if the system itself is not working."
      />

      <div className="mb-5 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
        <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder='Search help: "How do I submit a revised draft?"'
          className="w-full bg-transparent text-[13px] text-[#0A1929] outline-none placeholder:text-slate-400"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          <SectionCard title="Popular help topics">
            {topics.length ? (
              <ul className="divide-y divide-slate-100">
                {topics.map((topic) => (
                  <li key={topic.to}>
                    <Link to={topic.to} className="flex items-start justify-between gap-3 py-3 hover:opacity-80">
                      <div>
                        <p className="text-[12.8px] font-medium text-[#0A1929]">{topic.title}</p>
                        <p className="mt-0.5 text-[11.8px] leading-relaxed text-slate-500">{topic.description}</p>
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12.5px] text-slate-500">No help topic matches “{query}”.</p>
            )}
          </SectionCard>

          <SectionCard title="Useful shortcuts">
            <ul className="divide-y divide-slate-100">
              {SHORTCUTS.map(([action, keys]) => (
                <li key={action} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-[12.5px] text-slate-600">{action}</span>
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600">{keys}</span>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Accessibility & easier navigation">
            <p className="text-[12.5px] leading-relaxed text-slate-600">
              Use your browser zoom (Ctrl / Cmd and + / −) to enlarge the workspace, and Tab to move between controls. Every page opens
              from the sidebar, so you never need to use the browser back button.
            </p>
          </SectionCard>
        </div>

        <div className="space-y-5">
          <SectionCard title="Quick start">
            <ol className="space-y-2.5 text-[12.5px] text-slate-600">
              {["Set up My Research", "Open My Workspace", "Write or upload a draft", "Submit for review", "Track feedback and progress"].map(
                (step, index) => (
                  <li key={step} className="flex gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E0F2F1] text-[10.5px] font-semibold text-[#00695C]">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ),
              )}
            </ol>
          </SectionCard>

          <SectionCard title="Contact technical support">
            <p className="text-[12.3px] leading-relaxed text-slate-600">
              If the system itself is not working — you cannot sign in, or uploads and downloads fail — send a technical ticket.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild variant="outline" className="h-9 rounded-xl border-slate-200 text-[12px]">
                <Link to="/student/tickets">Login / access problem</Link>
              </Button>
              <Button asChild variant="outline" className="h-9 rounded-xl border-slate-200 text-[12px]">
                <Link to="/student/tickets">Upload or download error</Link>
              </Button>
            </div>
            <Button asChild className="mt-2 h-10 w-full rounded-xl bg-[#00796B] text-[13px] font-medium hover:bg-[#007D6D]">
              <Link to="/student/tickets">
                <LifeBuoy className="mr-1.5 h-4 w-4" aria-hidden="true" /> Contact technical support
              </Link>
            </Button>
          </SectionCard>

          <SectionCard title="Help or Reports & Tickets?">
            <p className="text-[12.3px] leading-relaxed text-slate-600">
              Use Help when you need guidance on how the workspace works. Use Reports &amp; Tickets when something in your record or
              supervision needs an official action.
            </p>
          </SectionCard>
        </div>
      </div>
    </div>
    </WorkspaceLayout>
  );
}