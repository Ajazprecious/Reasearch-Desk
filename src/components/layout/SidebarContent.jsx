import { Link } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { ResearchDeskMark } from "@/components/Logo";
import { useAuth } from "@/lib/AuthContext";
import { formatDate, initials } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/roles";
import { cn } from "@/lib/utils";

const PORTAL = {
  admin: "Administrator portal",
  supervisor: "Supervisor portal",
  student: "Student portal",
};

function NavLink({ item, pathname, badge, onNavigate }) {
  const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
        active
          ? "bg-[#00796B] text-white shadow-[0_8px_20px_-12px_rgba(0,121,107,1)]"
          : "text-white/60 hover:bg-white/[0.06] hover:text-white",
      )}
    >
      <Icon
        className={cn("h-[16px] w-[16px] shrink-0", active ? "text-white" : "text-white/40 group-hover:text-white/85")}
        aria-hidden="true"
      />
      <span className="flex-1 truncate">{item.label}</span>
      {badge ? (
        <span
          className={cn(
            "flex h-[18px] min-w-[18px] items-center justify-center rounded-md px-1 text-[10.5px] font-semibold tabular-nums",
            active ? "bg-white/25 text-white" : "bg-white/[0.09] text-white/70",
          )}
        >
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

/** The sidebar itself — rendered in the fixed rail on desktop and inside the mobile sheet. */
export function SidebarContent({ role, nav, pathname, badges = {}, onNavigate }) {
  const { user, logout } = useAuth();
  return (
    <div className="flex h-full flex-col bg-[#0A1929]">
      <div className="px-5 pt-6">
        <ResearchDeskMark tone="light" />
      </div>

      <div className="mx-5 my-4 h-px bg-white/10" aria-hidden="true" />

      <div className="px-5 pb-4">
        <p className="text-[14px] font-semibold leading-tight tracking-[-0.01em] text-white">Postgraduate Workspace</p>
        <p className="mt-1 text-[10.5px] font-medium uppercase tracking-[0.15em] text-[#7FD6C9]/80">{PORTAL[role]}</p>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4 scrollbar-slim" aria-label="Workspace navigation">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            item={item}
            pathname={pathname}
            badge={item.badge ? badges[item.badge] : 0}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-2.5 rounded-[10px] bg-white/[0.05] px-3 py-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#00796B] text-[11.5px] font-semibold text-white">
            {initials(user?.full_name, user?.email)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-medium leading-tight text-white">
              {user?.full_name || "ResearchDesk member"}
            </p>
            <p className="mt-0.5 truncate text-[10.5px] leading-tight text-white/40">{ROLE_LABEL[role]}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <p className="mt-2.5 px-1 text-[10px] text-white/25">Today · {formatDate(new Date().toISOString())}</p>
      </div>
    </div>
  );
}