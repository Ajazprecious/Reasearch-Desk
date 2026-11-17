import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { STATUS_COLORS, STATUS_LABELS, TOOLTIP_STYLE } from "@/components/admin/charts/chartTheme";

const SHORT = ["Proposal", "Literature", "Methodology", "Data", "Analysis", "Discussion", "Thesis"];

/** How much of the cohort has cleared each stage of the core research cycle. */
export function StageCompletionChart({ stages }) {
  const data = stages.map((stage, index) => ({
    label: SHORT[index] || stage.stage,
    full: stage.stage,
    rate: stage.rate,
    approved: stage.approved,
    total: stage.total,
  }));

  return (
    <div className="h-[230px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 6, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke="#EEF2F4" />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}%`} />
          <YAxis type="category" dataKey="label" width={78} tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(0, 121, 107, 0.05)" }}
            contentStyle={TOOLTIP_STYLE}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.full}
            formatter={(value, _name, item) => [`${value}% · ${item.payload.approved}/${item.payload.total} confirmed`, ""]}
          />
          <Bar dataKey="rate" radius={[0, 6, 6, 0]} maxBarSize={18}>
            {data.map((entry) => (
              <Cell key={entry.full} fill={STATUS_COLORS.approved} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}