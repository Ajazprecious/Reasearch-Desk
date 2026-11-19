import {
  Bell,
  BarChart3,
  CalendarClock,
  CircleHelp,
  ClipboardCheck,
  Cpu,
  Flag,
  Layers,
  LayoutDashboard,
  NotebookPen,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Ticket,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";

const notifications = { label: "Notifications", to: "/notifications", icon: Bell };
const settings = { label: "Settings", to: "/settings", icon: Settings };
const supervisorSettings = { label: "Settings", to: "/supervisor/settings", icon: Settings };
const help = { label: "Help", to: "/help", icon: CircleHelp };

export const NAVIGATION = {
  student: [
    { label: "Dashboard", to: "/student", icon: LayoutDashboard, exact: true },
    { label: "My Research", to: "/student/profile", icon: NotebookPen },
    { label: "My Workspace", to: "/student/workspace", icon: Layers },
    { label: "Milestones", to: "/student/milestones", icon: Flag },
    { label: "Progress", to: "/student/progress", icon: TrendingUp },
    { label: "Defence Follow-up", to: "/student/defence", icon: CalendarClock },
    { label: "Reports & Tickets", to: "/student/tickets", icon: Ticket },
    notifications,
    settings,
    help,
  ],
  supervisor: [
    { label: "Dashboard", to: "/supervisor", icon: LayoutDashboard, exact: true },
    { label: "Expertise Profile", to: "/supervisor/profile", icon: SlidersHorizontal },
    { label: "Assigned Students", to: "/supervisor/students", icon: Users },
    { label: "Review Queue", to: "/supervisor/reviews", icon: ClipboardCheck, badge: "reviews" },
    { label: "Student Progress", to: "/supervisor/progress", icon: TrendingUp },
    { label: "Timeline & Defences", to: "/supervisor/timeline", icon: CalendarClock },
    notifications,
    supervisorSettings,
  ],
  admin: [
    { label: "Dashboard", to: "/admin", icon: LayoutDashboard, exact: true },
    { label: "Users", to: "/admin/users", icon: Users },
    { label: "Recommendations", to: "/admin/recommendations", icon: Sparkles, badge: "recommendations" },
    { label: "AI Matching Engine", to: "/admin/ai-model", icon: Cpu },
    { label: "Assignments", to: "/admin/assignments", icon: UserCheck },
    { label: "Supervisor Workload", to: "/admin/workload", icon: Users },
    { label: "Supervision Records", to: "/admin/records", icon: ClipboardCheck },
    { label: "Progress Monitoring", to: "/admin/progress", icon: TrendingUp },
    { label: "Analytics", to: "/admin/reports", icon: BarChart3 },
    { label: "Timeline & Defences", to: "/admin/defence", icon: CalendarClock },
    { label: "Reports & Tickets", to: "/admin/tickets", icon: Ticket, badge: "tickets" },
    notifications,
    settings,
  ],
};

export function activeItem(nav, pathname) {
  return [...nav].sort((a, b) => b.to.length - a.to.length).find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));
}