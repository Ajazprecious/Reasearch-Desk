import { cn } from "@/lib/utils";

export function PageHeader({ eyebrow, title, description, actions, className }) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#00796B]">{eyebrow}</p>
        )}
        <h1 className="text-[25px] font-semibold leading-tight tracking-[-0.025em] text-[#0A1929] sm:text-[27px]">
          {title}
        </h1>
        {description && <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}