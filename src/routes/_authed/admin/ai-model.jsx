import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Cpu, Loader2, Play, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAsync } from "@/hooks/useAsync";
import { PageHeader } from "@/components/workspace/PageHeader";
import { TintedStat } from "@/components/workspace/TintedStat";
import { SectionCard } from "@/components/workspace/SectionCard";
import { ProgressBar } from "@/components/workspace/ProgressBar";
import { EmptyState, LoadingBlock } from "@/components/workspace/EmptyState";
import { Button } from "@/components/ui/button";
import { ModelSettingsCard } from "@/components/admin/ai/ModelSettingsCard";
import { WeightsCard } from "@/components/admin/ai/WeightsCard";
import { RunHistoryCard } from "@/components/admin/ai/RunHistoryCard";
import { generateRecommendations, getMatchingEngine, saveMatchingEngine } from "@/lib/server-fns";
import { MATCHING_DEFAULTS, modelLabel } from "@/lib/matching-config";
import { timeAgo } from "@/lib/format";

const PIPELINE = [
  "The student's title, research area, keywords and description are sent without name or email.",
  "Gemini compares research relevance against available supervisors in the same department.",
  "Local keyword similarity adds a transparent signal to Gemini's semantic ranking.",
  "Local rules apply level fit, department boosts, capacity and the minimum score.",
];

export const Route = createFileRoute("/_authed/admin/ai-model")({
  head: () => ({ meta: [{ title: "Gemini matching engine — ResearchDesk" }] }),
  component: AiModelPage,
});

function AiModelPage() {
  const load = useServerFn(getMatchingEngine);
  const save = useServerFn(saveMatchingEngine);
  const run = useServerFn(generateRecommendations);
  const { data, loading, error, reload } = useAsync(() => load(), []);
  const [config, setConfig] = useState(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (data?.config) setConfig(data.config);
  }, [data]);

  const set = (patch) => setConfig((current) => ({ ...current, ...patch }));

  async function saveConfig() {
    if (!config) return;
    setSaving(true);
    try {
      const result = await save({
        data: {
          engine_enabled: !!config.engine_enabled,
          provider: config.provider,
          model: config.model,
          similarity_weight: Number(config.similarity_weight),
          capacity_weight: Number(config.capacity_weight),
          department_boost: Number(config.department_boost),
          level_boost: Number(config.level_boost),
          min_score: Number(config.min_score),
          top_matches: Number(config.top_matches),
          auto_run: !!config.auto_run,
        },
      });
      setConfig(result.config);
      toast.success("Matching engine configuration saved");
      await reload();
    } catch (err) {
      toast.error(err?.message || "Could not save the configuration");
    } finally {
      setSaving(false);
    }
  }

  async function runNow() {
    setRunning(true);
    try {
      const result = await run({ data: {} });
      if (result?.reason === "no-capacity") {
        toast.warning("Every eligible supervisor is at capacity", {
          description: "Free up capacity or add supervisors, then run matching again.",
        });
      } else if (result?.reason === "disabled") {
        toast.info("Gemini matching is paused", { description: "Enable Gemini matching in its configuration to continue." });
      } else if (!result?.processed) {
        toast.info("No eligible profiles to match", {
          description: result?.unmatched?.length ? "No available supervisor is in the same department for these profiles." : "Submitted research profiles already have suggestions.",
        });
      } else {
        toast.success(`${result.processed} student${result.processed === 1 ? "" : "s"} ranked`, {
          description: `${result.confidence}% average top match · Gemini semantic ranking${
            result.durationMs ? ` · ${(result.durationMs / 1000).toFixed(1)}s` : ""
          }`,
        });
      }
      await reload();
    } catch (err) {
      toast.error(err?.message || "Matching could not run");
    } finally {
      setRunning(false);
    }
  }

  const corpus = data?.corpus || { coverage: 0, indexed: 0, supervisors: 0, pendingMatches: 0, averageConfidence: 0 };
  const lastRun = data?.runs?.[0] || null;

  return (
    <div className="animate-fade">
      <PageHeader
        title="Gemini matching engine"
        description="Use Gemini 3.8 Flash to rank research relevance, while local rules enforce department and capacity eligibility."
        actions={
          <>
            <Button
              variant="outline"
              asChild
              className="h-10 rounded-xl border-slate-200 bg-white text-[13px] font-medium text-slate-600"
            >
              <Link to="/admin/recommendations">Supervisor matches</Link>
            </Button>
            <Button
              onClick={runNow}
              disabled={running || !data?.geminiConfigured || !config?.engine_enabled}
              title={!data?.geminiConfigured ? "Set GEMINI_API_KEY on the API server to enable matching." : undefined}
              className="h-10 rounded-xl bg-[#00796B] px-4 text-[13px] font-medium hover:bg-[#007D6D]"
            >
              {running ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" /> : <Play className="mr-1.5 h-4 w-4" aria-hidden="true" />}
              {running ? "Matching…" : "Run matching now"}
            </Button>
          </>
        }
      />

      {loading || !config ? (
        <LoadingBlock rows={5} />
      ) : error ? (
        <EmptyState icon={AlertTriangle} title="Could not load the matching engine" description={error.message} />
      ) : (
        <div className="space-y-5">
          {!data.geminiConfigured && (
            <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-900">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>Gemini is not configured. Set <code className="font-semibold">GEMINI_API_KEY</code> in the API server environment and restart the server to enable AI features.</p>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <TintedStat
              label="Engine status"
              value={!data.geminiConfigured ? "Key required" : config.engine_enabled ? "Active" : "Paused"}
              hint={`${modelLabel(config.model)} · ${data.geminiConfigured ? "API key configured" : "API key missing"}`}
              tone={data.geminiConfigured && config.engine_enabled ? "mint" : "cream"}
            />
            <TintedStat
              label="Expertise indexed"
              value={`${corpus.coverage}%`}
              hint={`${corpus.indexed} of ${corpus.supervisors} supervisors have indexed expertise`}
              tone="blue"
            />
            <TintedStat
              label="Last run"
              value={lastRun ? timeAgo(lastRun.created_date) : "Not run yet"}
              hint={lastRun ? `${lastRun.students_processed} students · ${lastRun.status}` : "Run matching to build the first shortlist"}
              tone="teal"
            />
            <TintedStat
              label="Average top match"
              value={`${corpus.averageConfidence}%`}
              hint={`${corpus.pendingMatches} stored suggestions to review`}
              tone="slate"
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
            <div className="space-y-5">
              <ModelSettingsCard config={config} set={set} />
              <WeightsCard config={config} set={set} />

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={saveConfig}
                  disabled={saving}
                  className="h-10 rounded-xl bg-[#00796B] px-4 text-[13px] font-medium hover:bg-[#007D6D]"
                >
                  {saving ? "Saving…" : "Save configuration"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setConfig({ ...MATCHING_DEFAULTS });
                    toast.message("Defaults restored — save to apply");
                  }}
                  className="h-10 rounded-xl border-slate-200 text-[13px]"
                >
                  <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden="true" /> Restore defaults
                </Button>
                {config.updated_by && (
                  <span className="text-[11.5px] text-slate-400">Last changed by {config.updated_by}</span>
                )}
              </div>
            </div>

            <div className="space-y-5">
              <SectionCard title="How the engine scores" description="The same pipeline runs for every student.">
                <ol className="space-y-3">
                  {PIPELINE.map((step, index) => (
                    <li key={step} className="flex gap-2.5 text-[12.3px] leading-relaxed text-slate-600">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E0F2F1] text-[10.5px] font-semibold text-[#00695C]">
                        {index + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </SectionCard>

              <RunHistoryCard runs={data?.runs} />

              <SectionCard title="Indexed corpus" description="What the engine compares against.">
                <div className="space-y-4">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-[12px]">
                      <span className="text-slate-600">Supervisor expertise</span>
                      <span className="tabular-nums text-slate-500">
                        {corpus.indexed}/{corpus.supervisors}
                      </span>
                    </div>
                    <ProgressBar value={corpus.coverage} tone={corpus.coverage >= 70 ? "teal" : "amber"} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="rounded-xl bg-[#F1F5F9] px-3 py-2.5">
                      <p className="text-[17px] font-semibold text-[#0F172A]">{corpus.profiles}</p>
                      <p className="text-[11px] text-slate-500">Research profiles</p>
                    </div>
                    <div className="rounded-xl bg-[#ECFDF5] px-3 py-2.5">
                      <p className="text-[17px] font-semibold text-[#0F172A]">{corpus.awaiting}</p>
                      <p className="text-[11px] text-slate-500">Awaiting a supervisor</p>
                    </div>
                  </div>
                  <Link to="/admin/recommendations" className="inline-flex text-[12.5px] font-medium text-[#00796B] hover:underline">
                    Review the match queue →
                  </Link>
                </div>
              </SectionCard>

              <SectionCard title="Gemini note">
                <p className="text-[12.3px] leading-relaxed text-slate-600">
                  <Cpu className="mr-1 inline h-3.5 w-3.5 text-[#00796B]" aria-hidden="true" />
                  Matching calls Gemini 3.8 Flash on demand. Only research details and anonymized candidate expertise are sent; student names and emails stay local.
                </p>
              </SectionCard>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}