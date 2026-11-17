import { GraduationCap, ShieldCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "student", label: "Student", icon: GraduationCap },
  { value: "supervisor", label: "Supervisor", icon: Users },
  { value: "admin", label: "Administrator", icon: ShieldCheck },
];

/** The Student / Supervisor / Administrator choice shown on the sign-in and sign-up screens. */
export function RoleSelector({ value, onChange, label = "Continue as", variant = "cards" }) {
  if (variant === "tabs") {
    return (
      <div className="rd-auth-role-tabs" role="group" aria-label={label}>
        {OPTIONS.map(({ value: role, label: roleLabel }) => (
          <button
            key={role}
            type="button"
            onClick={() => onChange(role)}
            aria-pressed={value === role}
            className={value === role ? "is-active" : ""}
          >
            {roleLabel}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="mb-6">
      <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map(({ value: role, label: roleLabel, icon: Icon }) => {
          const active = value === role;
          return (
            <button
              key={role}
              type="button"
              onClick={() => onChange(role)}
              aria-pressed={active}
              className={cn(
                "group flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-[12.5px] font-medium transition-all duration-200",
                active
                  ? "border-[#00796B] bg-[#00796B]/[0.07] text-[#00574C] shadow-[0_2px_10px_-6px_rgba(0,121,107,0.6)]"
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700",
              )}
            >
              <Icon className={cn("h-[18px] w-[18px] transition-colors", active ? "text-[#00796B]" : "text-slate-400")} aria-hidden="true" />
              {roleLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}