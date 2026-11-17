import {
  BarChart3,
  Bell,
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

const notifications = { label: "Notifications", to: "/notifications", icon: Bell, badge: "notifications" };
const settings = { label: "Settings", to: "/settings", icon: Settings };
const supervisorSettings = { label: "Settings", to: "/supervisor/settings", icon: Settings };
const help = { label: "Help", to: "/help", icon: CircleHelp };

export const NAVIGATION = {
  student: [
    { label: "Dashboard", to: "/student", icon: LayoutDashboard },
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
    { label: "Dashboard", to: "/supervisor", icon: LayoutDashboard },
    { label: "Expertise Profile", to: "/supervisor/profile", icon: SlidersHorizontal },
    { label: "Assigned Students", to: "/supervisor/students", icon: Users },
    { label: "Review Queue", to: "/supervisor/reviews", icon: ClipboardCheck, badge: "reviews" },
    { label: "Student Progress", to: "/supervisor/progress", icon: TrendingUp },
    { label: "Timeline & Defences", to: "/supervisor/timeline", icon: CalendarClock },
    notifications,
    supervisorSettings,
    help,
  ],
  admin: [
    { label: "Overview", to: "/admin", icon: LayoutDashboard },
    { label: "Supervisor matches", to: "/admin/recommendations", icon: Sparkles },
    { label: "Assignments", to: "/admin/assignments", icon: UserCheck },
    { label: "Progress monitoring", to: "/admin/progress", icon: TrendingUp },
    { label: "People", to: "/admin/users", icon: Users },
    { label: "Defences & timeline", to: "/admin/defence", icon: CalendarClock },
    { label: "Reports & tickets", to: "/admin/tickets", icon: Ticket },
    { label: "Local matching engine", to: "/admin/ai-model", icon: Cpu },
    { label: "Analytics", to: "/admin/reports", icon: BarChart3 },
    notifications,
    settings,
    help,
  ],
};

export function activeItem(nav, pathname) {
  return [...nav].sort((a, b) => b.to.length - a.to.length).find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));
}