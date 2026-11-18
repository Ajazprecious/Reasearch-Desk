import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  "Methodology is clearly explained",
  "Requirements are linked to evidence",
  "System design is sufficiently detailed",
  "Citations and references are complete",
];

/** Supervisor's personal review checklist for the open draft (kept for the session). */
export function ReviewChecklist() {
  const [checked, setChecked] = useState([]);

  function toggle(item) {
    setChecked((current) => (current.includes(item) ? current.filter((entry) => entry !== item) : [...current, item]));
  }

  return (
    <div>
      <ul className="space-y-2">
        {ITEMS.map((item) => {
          const active = checked.includes(item);
          return (
            <li key={item}>
              <button
                type="button"
                onClick={() => toggle(item)}
                className="flex w-full items-start gap-2 text-left text-[11.5px] leading-snug text-slate-600"
              >
                <span
                  className={cn(
                    "mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                    active ? "border-[#00796B] bg-[#00796B] text-white" : "border-slate-300 bg-white text-transparent",
                  )}
                >
                  <Check className="h-3 w-3" aria-hidden="true" />
                </span>
                <span className={active ? "text-[#111827]" : ""}>{item}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2.5 text-[11px] text-slate-400">
        {checked.length} of {ITEMS.length} checked
      </p>
    </div>
  );
}