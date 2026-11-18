import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { STATUS_COLORS, STATUS_LABELS, TOOLTIP_STYLE } from "@/components/admin/charts/chartTheme";

/** The overall mix of milestone states across every department. */
export function StatusMixChart({ statusCounts }) {
  const total = statusCounts.reduce((sum, entry) => sum + entry.count, 0);
  const data = statusCounts
    .filter((entry) => entry.count > 0)
    .map((entry) => ({
      name: STATUS_LABELS[entry.status] || entry.status,
      value: entry.count,
      color: STATUS_COLORS[entry.status] || "#94A3B8",
    }));

  if (!total) return <p className="text-[12.5px] text-slate-500">No milestones tracked yet.</p>;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative h-[190px] w-[190px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={56} outerRadius={80} paddingAngle={2} stroke="none">
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value, name) => [`${value} milestones`, name]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[22px] font-semibold leading-none text-[#0A1929]">{total}</span>
          <span className="mt-1 text-[10px] uppercase tracking-[0.08em] text-slate-400">milestones</span>
        </div>
      </div>

      <ul className="w-full space-y-2">
        {statusCounts.map((entry) => (
          <li key={entry.status} className="flex items-center justify-between gap-3 text-[12px]">
            <span className="flex items-center gap-2 text-slate-600">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[entry.status] || "#94A3B8" }}
                aria-hidden="true"
              />
              {STATUS_LABELS[entry.status] || entry.status}
            </span>
            <span className="tabular-nums text-slate-500">
              {entry.count} · {Math.round((entry.count / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}