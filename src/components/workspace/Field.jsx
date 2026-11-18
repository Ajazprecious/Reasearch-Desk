import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const CONTROL =
  "h-11 w-full rounded-xl border-slate-200 bg-white text-[13.5px] text-slate-700 shadow-none transition-colors placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-[#00796B]";

export function Field({ label, hint, htmlFor, children, className }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <Label htmlFor={htmlFor} className="text-[12.5px] font-medium text-slate-600">
          {label}
        </Label>
      )}
      {children}
      {hint && <p className="text-[11.5px] leading-snug text-slate-400">{hint}</p>}
    </div>
  );
}

export function TextField({ label, hint, id, className, ...props }) {
  return (
    <Field label={label} hint={hint} htmlFor={id} className={className}>
      <Input id={id} className={CONTROL} {...props} />
    </Field>
  );
}

export function TextAreaField({ label, hint, id, rows = 4, className, ...props }) {
  return (
    <Field label={label} hint={hint} htmlFor={id} className={className}>
      <Textarea id={id} rows={rows} className="rounded-xl border-slate-200 bg-white text-[13.5px] leading-relaxed shadow-none focus-visible:ring-1 focus-visible:ring-[#00796B]" {...props} />
    </Field>
  );
}

export function SelectField({ label, hint, id, options = [], className, ...props }) {
  return (
    <Field label={label} hint={hint} htmlFor={id} className={className}>
      <select id={id} className={cn(CONTROL, "px-3 pr-8 focus:outline-none focus:ring-1 focus:ring-[#00796B]")} {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}