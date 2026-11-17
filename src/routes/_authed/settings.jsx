import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { localClient } from "@/api/localClient";
import { useAuth } from "@/lib/AuthContext";
import { useAsync } from "@/hooks/useAsync";
import { PageHeader } from "@/components/workspace/PageHeader";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { resolveRole } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_SETTINGS,
  GeneralSection,
  NotificationsSection,
  SecuritySection,
  WritingSection,
} from "@/components/settings/SettingsSections";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "general", label: "General" },
  { key: "notifications", label: "Notifications" },
  { key: "writing", label: "Writing & documents" },
  { key: "security", label: "Security" },
];

export const Route = createFileRoute("/_authed/settings")({
  head: () => ({ meta: [{ title: "Settings — ResearchDesk" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, refresh, logout } = useAuth();
  const [tab, setTab] = useState("general");
  const [prefs, setPrefs] = useState({ ...DEFAULT_SETTINGS, ...(user?.settings || {}) });
  const [busy, setBusy] = useState(false);

  const { data: profile } = useAsync(async () => {
    if (!user?.email) return null;
    const page = await localClient.entities.ResearchProfile.filter({ student_email: user.email }, { limit: 1 });
    return page.items[0] || null;
  }, [user?.email]);

  useEffect(() => {
    setPrefs({ ...DEFAULT_SETTINGS, ...(user?.settings || {}) });
  }, [user?.id]);

  const set = (patch) => setPrefs((current) => ({ ...current, ...patch }));

  async function save() {
    setBusy(true);
    try {
      await localClient.auth.updateMe({ settings: prefs });
      await refresh();
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err?.message || "Could not save your settings");
    } finally {
      setBusy(false);
    }
  }

  return (
    <WorkspaceLayout role={resolveRole(user) || "student"}>
    <div className="animate-fade">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Manage account preferences, research notifications, document behaviour and security."
      />

      <nav className="mb-5 flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-3" aria-label="Settings sections">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              "rounded-full px-3.5 py-2 text-[12.5px] font-medium transition-colors",
              tab === item.key ? "bg-[#00796B] text-white" : "text-slate-600 hover:bg-slate-100",
            )}
            aria-current={tab === item.key ? "page" : undefined}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="max-w-3xl space-y-5">
        {tab === "general" && <GeneralSection user={user} profile={profile} prefs={prefs} set={set} />}
        {tab === "notifications" && <NotificationsSection prefs={prefs} set={set} />}
        {tab === "writing" && <WritingSection prefs={prefs} set={set} />}
        {tab === "security" && <SecuritySection lastChanged="42 days ago" onSignOut={logout} />}

        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={busy} className="h-10 rounded-xl bg-[#00796B] px-4 text-[13px] font-medium hover:bg-[#007D6D]">
            {busy ? "Saving…" : "Save settings"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setPrefs(DEFAULT_SETTINGS);
              toast.message("Defaults restored — save to apply");
            }}
            className="h-10 rounded-xl border-slate-200 text-[13px]"
          >
            Restore defaults
          </Button>
        </div>
      </div>
    </div>
    </WorkspaceLayout>
  );
}