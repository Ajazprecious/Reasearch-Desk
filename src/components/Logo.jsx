import { cn } from "@/lib/utils";

/** The shared ResearchDesk logo and wordmark used throughout the app. */
export function ResearchDeskMark({ className, tone = "dark" }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <img
        src="/brand/researchdesk-logo.png"
        alt=""
        aria-hidden="true"
        className="rd-logo-mark h-9 w-9 shrink-0 object-contain"
      />
      <div className="leading-none">
        <p className={cn("text-[16px] font-semibold tracking-[-0.015em]", tone === "light" ? "text-white" : "text-[#0A1929]")}>
          ResearchDesk
        </p>
        <p
          className={cn(
            "mt-1 text-[8.5px] font-medium uppercase tracking-[0.19em]",
            tone === "light" ? "text-white/45" : "text-slate-400",
          )}
        >
          Research Workspace
        </p>
      </div>
    </div>
  );
}