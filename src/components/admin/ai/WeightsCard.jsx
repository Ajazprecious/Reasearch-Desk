import { WeightRow } from "@/components/admin/ai/WeightRow";

export function WeightsCard({ config, set }) {
  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white">
      <div className="border-b border-slate-100 px-5 py-4">
        <p className="text-[14px] font-semibold text-[#0A1929]">Match weights</p>
        <p className="mt-0.5 text-[12px] text-slate-500">
          How Gemini relevance, local keyword similarity, and remaining supervisor capacity combine into each score.
        </p>
      </div>
      <div className="space-y-5 px-5 py-5">
        <WeightRow
          label="Gemini relevance weight"
          description="How much Gemini's semantic research-fit score contributes to the final recommendation."
          value={Number(config.similarity_weight)}
          onChange={(value) => set({ similarity_weight: value })}
        />
        <WeightRow
          label="Capacity weight"
          description="How strongly a supervisor's free supervision slots count toward the match."
          value={Number(config.capacity_weight)}
          max={0.6}
          onChange={(value) => set({ capacity_weight: value })}
        />
        <WeightRow
          label="Same-department boost"
          description="Extra score added when the supervisor shares the student's department."
          value={Number(config.department_boost)}
          max={0.2}
          onChange={(value) => set({ department_boost: value })}
        />
        <WeightRow
          label="Level fit boost"
          description="Extra score added when the supervisor supervises the student's level."
          value={Number(config.level_boost)}
          max={0.2}
          onChange={(value) => set({ level_boost: value })}
        />
      </div>
    </section>
  );
}