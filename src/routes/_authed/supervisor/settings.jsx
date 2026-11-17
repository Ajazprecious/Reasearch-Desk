import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { useAsync } from "@/hooks/useAsync";
import { getSupervisorSettings, saveSupervisorSettings } from "@/lib/supervisor-fns";
import { DEFAULT_SUPERVISOR_SETTINGS, NOTIFICATION_PREFERENCES, REVIEW_PREFERENCES } from "@/lib/supervisor-settings";
import { PageHeader } from "@/components/workspace/PageHeader";
import { LoadingBlock } from "@/components/workspace/EmptyState";
import { Button } from "@/components/ui/button";
import { AvailabilityCard } from "@/components/supervisor/settings/AvailabilityCard";
import { PreferenceCard } from "@/components/supervisor/settings/PreferenceCard";
import { AccountCard } from "@/components/supervisor/settings/AccountCard";

export const Route = createFileRoute("/_authed/supervisor/settings")({
  head: () => ({ meta: [{ title: "Settings — ResearchDesk" }] }),
  component: SupervisorSettingsPage,
});

function SupervisorSettingsPage() {
  const { logout } = useAuth();
  const fetchSettings = useServerFn(getSupervisorSettings);
  const persist = useServerFn(saveSupervisorSettings);
  const { data, loading, reload } = useAsync(() => fetchSettings(), []);

  const [prefs, setPrefs] = useState(DEFAULT_SUPERVISOR_SETTINGS);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data?.settings) setPrefs({ ...DEFAULT_SUPERVISOR_SETTINGS, ...data.settings });
  }, [data]);

  const set = (patch) => setPrefs((current) => ({ ...current, ...patch }));

  async function save() {
    setBusy(true);
    try {
      await persist({ data: prefs });
      await reload();
      toast.success("Settings saved");
    } catch (error) {
      toast.error(error?.message || "Could not save your settings");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="animate-fade">
      <PageHeader
        title="Settings"
        description="Manage your supervision availability, review preferences and account security."
      />

      {loading ? (
        <div className="max-w-3xl">
          <LoadingBlock rows={4} label="Loading your settings" />
        </div>
      ) : (
        <div className="max-w-3xl space-y-5">
          <AvailabilityCard prefs={prefs} set={set} load={data?.load || 0} />

          <PreferenceCard
            title="Review preferences"
            description="How drafts arrive in your review queue and how they are presented."
            items={REVIEW_PREFERENCES}
            prefs={prefs}
            set={set}
            idPrefix="review"
          />

          <PreferenceCard
            title="Notifications"
            description="Choose what reaches your notifications list."
            items={NOTIFICATION_PREFERENCES}
            prefs={prefs}
            set={set}
            idPrefix="notify"
          />

          <AccountCard account={data?.account} onSignOut={logout} />

          <div className="flex flex-wrap items-center gap-2 pb-2">
            <Button
              onClick={save}
              disabled={busy}
              className="h-10 rounded-xl bg-[#00796B] px-4 text-[13px] font-medium hover:bg-[#007D6D]"
            >
              {busy ? "Saving…" : "Save settings"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setPrefs(DEFAULT_SUPERVISOR_SETTINGS);
                toast.message("Defaults restored — save to apply");
              }}
              disabled={busy}
              className="h-10 rounded-xl border-slate-200 text-[13px]"
            >
              Restore defaults
            </Button>
            <span aria-live="polite" className="text-[11.5px] text-slate-400">
              {busy ? "Saving your preferences…" : ""}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}