import { cn } from "@/lib/utils";

export function SectionCard({ title, description, action, children, className, bodyClassName }) {
  return (
    <section className={cn("rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]", className)}>
      {(title || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            {title && <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[#0A1929]">{title}</h2>}
            {description && <p className="mt-0.5 text-[12.5px] text-slate-500">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={cn("px-5 py-5 sm:px-6", bodyClassName)}>{children}</div>
    </section>
  );
}