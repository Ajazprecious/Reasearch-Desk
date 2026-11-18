import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS_TICK, TOOLTIP_STYLE } from "@/components/admin/charts/chartTheme";

const tone = (rate) => (rate >= 60 ? "#2E7D32" : rate >= 30 ? "#00796B" : "#EF6C00");

/** Completion rate (approved milestones ÷ all milestones) for each department. */
export function DepartmentCompletionChart({ departments }) {
  const data = departments.map((department) => ({
    label: department.department?.length > 14 ? `${department.department.slice(0, 13)}…` : department.department || "Unassigned",
    full: department.department || "Unassigned",
    rate: department.progress,
    students: department.students,
    overdue: department.overdue,
  }));

  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#EEF2F4" />
          <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} interval={0} />
          <YAxis domain={[0, 100]} tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}%`} />
          <Tooltip
            cursor={{ fill: "rgba(0, 121, 107, 0.05)" }}
            contentStyle={TOOLTIP_STYLE}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.full}
            formatter={(value) => [`${value}% completion`, ""]}
          />
          <Bar dataKey="rate" radius={[6, 6, 0, 0]} maxBarSize={46}>
            {data.map((entry) => (
              <Cell key={entry.full} fill={tone(entry.rate)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}