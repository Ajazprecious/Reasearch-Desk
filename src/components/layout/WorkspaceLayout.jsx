import { useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { SidebarContent } from "@/components/layout/SidebarContent";
import { TopbarSearch } from "@/components/layout/TopbarSearch";
import { useNavBadges } from "@/components/layout/useNavBadges";
import { NAVIGATION } from "@/lib/navigation";
import { initials } from "@/lib/format";
import { useAuth } from "@/lib/AuthContext";

const ROLE_PILL = {
  supervisor: "Supervisor",
  student: "Student",
  admin: "Administrator",
};

/** App shell: navy sidebar, sticky topbar with search, role pill and notifications. */
export function WorkspaceLayout({ role, children }) {
  const { user } = useAuth();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = NAVIGATION[role] || [];
  const badges = useNavBadges(role);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[#F6F8F8]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[180px] lg:block">
        <SidebarContent role={role} nav={nav} pathname={pathname} badges={badges} />
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-[#0A1929]/50 backdrop-blur-sm" onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 w-[280px] animate-fade shadow-2xl">
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close navigation"
              className="absolute right-3 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
            <SidebarContent role={role} nav={nav} pathname={pathname} badges={badges} onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      )}

      <div className="lg:pl-[180px]">
        <header className="sticky top-0 z-20 flex h-[68px] items-center gap-3 border-b border-slate-200/70 bg-white/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 lg:hidden"
          >
            <Menu className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>

          <TopbarSearch role={role} nav={nav} />

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <span className="hidden rounded-full bg-[#E8F5E9] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#2E7D32] sm:inline-flex">
              {ROLE_PILL[role]}
            </span>
            <NotificationBell withLabel />
            <span
              title={user?.email}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0A1929] text-[11.5px] font-semibold text-white ring-2 ring-white"
            >
              {initials(user?.full_name, user?.email)}
            </span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1260px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}