export function WeightRow({ label, description, value, min = 0, max = 1, step = 0.01, onChange, display }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12.5px] font-medium text-[#0A1929]">{label}</p>
        <span className="rounded-md bg-[#F1F5F9] px-2 py-0.5 text-[11.5px] font-semibold tabular-nums text-slate-600">
          {display ?? `${Math.round(value * 100)}%`}
        </span>
      </div>
      <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-500">{description}</p>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
        className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-[#00796B]"
      />
    </div>
  );
}