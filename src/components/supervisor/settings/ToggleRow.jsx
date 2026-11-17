import { Switch } from "@/components/ui/switch";

export function ToggleRow({ id, label, description, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-slate-100 py-3.5 first:pt-0 last:border-0 last:pb-0">
      <div className="min-w-0">
        <label htmlFor={id} className="block cursor-pointer text-[12.8px] font-medium text-[#0A1929]">
          {label}
        </label>
        {description && (
          <p id={`${id}-desc`} className="mt-0.5 text-[11.8px] leading-relaxed text-slate-500">
            {description}
          </p>
        )}
      </div>
      <Switch
        id={id}
        checked={!!checked}
        onCheckedChange={onChange}
        aria-label={label}
        aria-describedby={description ? `${id}-desc` : undefined}
        className="mt-0.5 shrink-0"
      />
    </div>
  );
}