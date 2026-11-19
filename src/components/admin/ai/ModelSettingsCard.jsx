import { Switch } from "@/components/ui/switch";
import { MODEL_OPTIONS } from "@/lib/matching-config";
import { WeightRow } from "@/components/admin/ai/WeightRow";

const selectClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-[#0A1929] outline-none focus:border-[#00796B]";

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

export function ModelSettingsCard({ config, set }) {
  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white">
      <div className="border-b border-slate-100 px-5 py-4">
        <p className="text-[14px] font-semibold text-[#0A1929]">Matching configuration</p>
        <p className="mt-0.5 text-[12px] text-slate-500">
          Gemini ranks research relevance; local rules enforce department, level, and supervisor-capacity eligibility.
        </p>
      </div>
      <div className="px-5 py-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-slate-600">Matching provider</span>
            <span className={`${selectClass} flex items-center`}>Google Gemini API</span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-slate-600">Gemini model</span>
            <select value={config.model} disabled className={`${selectClass} disabled:cursor-not-allowed disabled:bg-slate-50`}>
              {MODEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-slate-600">Suggestions per student</span>
            <select
              value={config.top_matches}
              onChange={(event) => set({ top_matches: Number(event.target.value) })}
              className={selectClass}
            >
              {[1, 2, 3, 4, 5].map((count) => (
                <option key={count} value={count}>
                  {count} supervisor{count === 1 ? "" : "s"}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 divide-y divide-slate-100">
          <ToggleRow
            label="Enable Gemini matching"
            description="Use Gemini for semantic research fit, then apply local department, level, and capacity checks."
            checked={config.engine_enabled}
            onChange={(value) => set({ engine_enabled: value })}
          />
        </div>

        <div className="mt-4">
          <WeightRow
            label="Minimum match threshold"
            description="Suggestions below this combined Gemini, keyword, and capacity score are dropped from the shortlist."
            value={Number(config.min_score) / 100}
            max={0.9}
            step={0.05}
            display={`${Math.round(Number(config.min_score))}%`}
            onChange={(value) => set({ min_score: Math.round(value * 100) })}
          />
        </div>
      </div>
    </section>
  );
}