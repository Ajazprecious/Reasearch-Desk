import { formatDateTime, initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export function TicketThread({ updates }) {
  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <p className="text-[14px] font-semibold text-[#0A1929]">Ticket thread</p>
          <p className="mt-0.5 text-[12px] text-slate-500">Every message stays attached to this record.</p>
        </div>
        <span className="rounded-full bg-[#E0F2F1] px-2.5 py-1 text-[11px] font-medium text-[#00695C]">{updates.length} messages</span>
      </div>
      <ul className="space-y-4 px-5 py-5">
        {updates.map((update) => (
          <li key={update.id} className="flex gap-3">
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                update.author_role === "admin" ? "bg-[#E3F0FB] text-[#1D4ED8]" : "bg-[#E0F2F1] text-[#00695C]",
              )}
            >
              {initials(update.author_name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[12.5px] font-medium text-[#0A1929]">
                  {update.author_role === "admin" ? update.author_name || "Research office" : "Student"}
                </p>
                <span className="text-[11px] text-slate-400">{formatDateTime(update.created_date)}</span>
                {update.is_official && (
                  <span className="rounded-full bg-[#E3F0FB] px-2 py-0.5 text-[10.5px] font-medium text-[#1D4ED8]">
                    Official response
                  </span>
                )}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-[12.8px] leading-relaxed text-slate-600">{update.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}