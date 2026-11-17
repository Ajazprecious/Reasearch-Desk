import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/workspace/SectionCard";

const fieldClass = "h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[13px] text-slate-500 outline-none";

export function AccountCard({ account, onSignOut }) {
  return (
    <SectionCard title="Account & security" description="Your institutional identity on this workspace.">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium text-slate-600">Full name</span>
          <input value={account?.full_name || "—"} readOnly className={fieldClass} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium text-slate-600">Institutional email</span>
          <input value={account?.email || ""} readOnly className={fieldClass} />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild variant="outline" className="h-10 rounded-xl border-slate-200 text-[13px]">
          <Link to="/forgot-password">Change password</Link>
        </Button>
        <Button variant="outline" onClick={onSignOut} className="h-10 rounded-xl border-slate-200 text-[13px]">
          Sign out of other sessions
        </Button>
      </div>

      <p className="mt-4 text-[11.5px] leading-relaxed text-slate-400">
        Name changes and academic-record corrections are handled by the research office through Reports &amp; Tickets.
      </p>
    </SectionCard>
  );
}