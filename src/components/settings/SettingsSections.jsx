import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

export const DEFAULT_SETTINGS = {
  timezone: "West Africa Time (WAT)",
  autosave: true,
  tracked_revisions: true,
  version_reminder: true,
  default_writing: "Write in workspace",
  notify_viewed: true,
  notify_feedback: true,
  notify_milestones: true,
  notify_admin: true,
  notify_defence: true,
};

const TIMEZONES = ["West Africa Time (WAT)", "Central Africa Time (CAT)", "East Africa Time (EAT)", "South Africa Standard Time (SAST)", "UTC", "GMT"];

const inputClass = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-[#0A1929] outline-none focus:border-[#00796B]";

function Card({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white">
      <div className="border-b border-slate-100 px-5 py-4">
        <p className="text-[14px] font-semibold text-[#0A1929]">{title}</p>
        {description && <p className="mt-0.5 text-[12px] text-slate-500">{description}</p>}
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div>
        <p className="text-[12.8px] font-medium text-[#0A1929]">{label}</p>
        <p className="mt-0.5 text-[11.8px] leading-relaxed text-slate-500">{description}</p>
      </div>
      <Switch checked={!!checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

export function GeneralSection({ user, profile, prefs, set }) {
  return (
    <Card title="Account & research profile" description="Your identity as the research office records it.">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium text-slate-600">Name</span>
          <input value={user?.full_name || "—"} readOnly className={`${inputClass} bg-slate-50 text-slate-500`} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium text-slate-600">Programme</span>
          <input value={profile?.programme || "Not set"} readOnly className={`${inputClass} bg-slate-50 text-slate-500`} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium text-slate-600">Student email</span>
          <input value={user?.email || ""} readOnly className={`${inputClass} bg-slate-50 text-slate-500`} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium text-slate-600">Time zone</span>
          <select value={prefs.timezone} onChange={(event) => set({ timezone: event.target.value })} className={inputClass}>
            {TIMEZONES.map((zone) => (
              <option key={zone}>{zone}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-4 text-[11.5px] text-slate-400">Programme and institutional identity fields may be managed by the university.</p>
    </Card>
  );
}

export function WritingSection({ prefs, set }) {
  return (
    <Card title="Writing & document preferences">
      <div className="divide-y divide-slate-100">
        <ToggleRow
          label="Autosave collaborative writing"
          description="Save changes automatically while writing in the workspace."
          checked={prefs.autosave}
          onChange={(value) => set({ autosave: value })}
        />
        <ToggleRow
          label="Show tracked revisions"
          description="Keep suggested changes visible when reviewing collaborative edits."
          checked={prefs.tracked_revisions}
          onChange={(value) => set({ tracked_revisions: value })}
        />
        <ToggleRow
          label="Version reminder before submission"
          description="Prompt before replacing a working draft with a submitted version."
          checked={prefs.version_reminder}
          onChange={(value) => set({ version_reminder: value })}
        />
      </div>
      <label className="mt-4 block">
        <span className="mb-1.5 block text-[12px] font-medium text-slate-600">Default writing option</span>
        <span className="mb-1.5 block text-[11.5px] text-slate-400">Choose what opens first inside Collaborative Writing.</span>
        <select value={prefs.default_writing} onChange={(event) => set({ default_writing: event.target.value })} className={inputClass}>
          <option>Write in workspace</option>
          <option>Open latest submitted version</option>
        </select>
      </label>
    </Card>
  );
}

export function NotificationsSection({ prefs, set }) {
  return (
    <Card title="Notifications">
      <div className="divide-y divide-slate-100">
        <ToggleRow
          label="Supervisor viewed my draft"
          description="Notify me when my supervisor opens a submitted version."
          checked={prefs.notify_viewed}
          onChange={(value) => set({ notify_viewed: value })}
        />
        <ToggleRow
          label="Feedback and revision requests"
          description="Notify me when comments or revision requests are added."
          checked={prefs.notify_feedback}
          onChange={(value) => set({ notify_feedback: value })}
        />
        <ToggleRow
          label="Milestone reminders"
          description="Send reminders before research deadlines and milestones."
          checked={prefs.notify_milestones}
          onChange={(value) => set({ notify_milestones: value })}
        />
        <ToggleRow
          label="Administrator updates"
          description="Notify me about assignment, escalations and administrative responses."
          checked={prefs.notify_admin}
          onChange={(value) => set({ notify_admin: value })}
        />
        <ToggleRow
          label="Defence updates"
          description="Notify me about defence dates, documents and follow-up items."
          checked={prefs.notify_defence}
          onChange={(value) => set({ notify_defence: value })}
        />
      </div>
    </Card>
  );
}

export function SecuritySection({ lastChanged, onSignOut }) {
  return (
    <Card title="Security & session">
      <p className="text-[12.5px] text-slate-600">Password last changed {lastChanged}.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild variant="outline" className="h-10 rounded-xl border-slate-200 text-[13px]">
          <Link to="/forgot-password">Change password</Link>
        </Button>
        <Button variant="outline" onClick={onSignOut} className="h-10 rounded-xl border-slate-200 text-[13px]">
          Sign out of this device
        </Button>
      </div>
      <p className="mt-4 text-[11.5px] leading-relaxed text-slate-400">
        For institutional account or academic-record corrections, use Reports &amp; Tickets. For system guidance, use Help.
      </p>
    </Card>
  );
}