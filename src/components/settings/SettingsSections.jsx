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

export const ADMIN_DEFAULT_SETTINGS = {
  restrict_department: true,
  require_admin_confirmation: true,
  recheck_capacity: true,
  flag_unmatched: true,
  notify_unassigned: true,
  notify_capacity: true,
  notify_progress: true,
  notify_admin_defence: true,
  notify_assignment_changes: true,
  notify_new_ticket: true,
  escalation_reminder: true,
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

export function AdminSettingsSections({ user, prefs, set, onSignOut }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Supervisor recommendation rules">
        <p className="mb-3 rounded-lg bg-[#F6F8F8] px-3 py-2 text-[10.8px] leading-relaxed text-slate-600">
          Recommendation method: department eligibility + research relevance ranking.
        </p>
        <div className="divide-y divide-slate-100">
          <ToggleRow label="Restrict recommendations to the student's department" description="Only compare supervisors from the student's department." checked={prefs.restrict_department} onChange={(value) => set({ restrict_department: value })} />
          <ToggleRow label="Administrator confirmation required" description="Prevent the system from assigning supervisors automatically." checked={prefs.require_admin_confirmation} onChange={(value) => set({ require_admin_confirmation: value })} />
          <ToggleRow label="Repeat capacity check before confirmation" description="Recheck the selected supervisor immediately before assignment." checked={prefs.recheck_capacity} onChange={(value) => set({ recheck_capacity: value })} />
          <ToggleRow label="Flag when no supervisor is eligible" description="Create an administrator action when all matches fail eligibility." checked={prefs.flag_unmatched} onChange={(value) => set({ flag_unmatched: value })} />
        </div>
      </Card>

      <Card title="Administrative notifications">
        <div className="divide-y divide-slate-100">
          <ToggleRow label="Unassigned student alerts" description="Notify when a student is ready for supervisor matching." checked={prefs.notify_unassigned} onChange={(value) => set({ notify_unassigned: value })} />
          <ToggleRow label="Capacity alerts" description="Notify when a supervisor reaches high or full capacity." checked={prefs.notify_capacity} onChange={(value) => set({ notify_capacity: value })} />
          <ToggleRow label="Progress exceptions" description="Notify about overdue milestones and prolonged review delays." checked={prefs.notify_progress} onChange={(value) => set({ notify_progress: value })} />
          <ToggleRow label="Defence reminders" description="Notify about upcoming proposal and final defences." checked={prefs.notify_admin_defence} onChange={(value) => set({ notify_admin_defence: value })} />
          <ToggleRow label="Assignment changes" description="Notify when a supervisor is reassigned or an assignment is cancelled." checked={prefs.notify_assignment_changes} onChange={(value) => set({ notify_assignment_changes: value })} />
        </div>
      </Card>

      <Card title="Reports & ticket handling">
        <div className="divide-y divide-slate-100">
          <ToggleRow label="Notify on new student ticket" description="Alert administrators when an academic or supervision issue is submitted." checked={prefs.notify_new_ticket} onChange={(value) => set({ notify_new_ticket: value })} />
          <ToggleRow label="Escalation reminder" description="Remind the assigned team when an open ticket has no update." checked={prefs.escalation_reminder} onChange={(value) => set({ escalation_reminder: value })} />
        </div>
      </Card>

      <Card title="Account & security">
        <p className="text-[12px] font-medium text-[#273A3F]">{user?.full_name || "Postgraduate Admin"} · Administrator</p>
        <p className="mt-1 text-[11.5px] text-slate-500">{user?.email}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild variant="outline" className="h-9 rounded-lg border-slate-200 text-[11.5px]">
            <Link to="/forgot-password">Change password</Link>
          </Button>
          <Button variant="outline" onClick={onSignOut} className="h-9 rounded-lg border-slate-200 text-[11.5px]">
            Sign out
          </Button>
        </div>
      </Card>
    </div>
  );
}