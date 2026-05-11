import { useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard, GraduationCap, Users, BookOpen, Wallet, CalendarCheck,
  User, LogOut, HeartPulse, Menu, X, Bell
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "principal", "faculty", "student", "parent"] },
  { to: "/students", label: "Students", icon: GraduationCap, roles: ["admin", "principal", "faculty"] },
  { to: "/faculty", label: "Faculty", icon: Users, roles: ["admin", "principal"] },
  { to: "/courses", label: "Courses", icon: BookOpen, roles: ["admin", "principal", "faculty", "student"] },
  { to: "/fees", label: "Fees", icon: Wallet, roles: ["admin", "principal", "student", "parent"] },
  { to: "/attendance", label: "Attendance", icon: CalendarCheck, roles: ["admin", "principal", "faculty", "student", "parent"] },
  { to: "/profile", label: "Profile", icon: User, roles: ["admin", "principal", "faculty", "student", "parent"] },
];

function Sidebar({ user, onClose }) {
  const items = NAV_ITEMS.filter((n) => n.roles.includes(user.role));
  return (
    <aside className="h-full w-64 bg-[#0F2C59] text-white/85 flex flex-col" data-testid="sidebar">
      <div className="px-5 py-5 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-md bg-white/10 backdrop-blur flex items-center justify-center">
            <HeartPulse className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-display">Nursing</div>
            <div className="font-display text-sm font-medium text-white">College ERP</div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-white/70" data-testid="sidebar-close">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold px-3 py-2">
          Main Menu
        </div>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            data-testid={`nav-${item.label.toLowerCase()}`}
            onClick={onClose}
            className={({ isActive }) =>
              `sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-md text-sm ${isActive ? "active" : ""}`
            }
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <div className="px-3 py-2 mb-1">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold">Signed in as</div>
          <div className="text-sm text-white font-medium mt-0.5 truncate">{user.name}</div>
          <div className="text-xs text-white/60 capitalize">{user.role}</div>
        </div>
      </div>
    </aside>
  );
}

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const initials = (user?.name || "U").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const pageTitle = NAV_ITEMS.find((n) => location.pathname.startsWith(n.to))?.label || "Dashboard";

  return (
    <div className="min-h-screen flex bg-[#F4F7F9]">
      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar user={user} onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
      <div className="hidden lg:block lg:fixed lg:inset-y-0 lg:left-0">
        <Sidebar user={user} />
      </div>

      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-xl border-b border-slate-200">
          <div className="flex items-center justify-between px-5 sm:px-8 h-16">
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-2 rounded-md hover:bg-slate-100"
                onClick={() => setMobileOpen(true)}
                data-testid="sidebar-toggle"
              >
                <Menu className="h-5 w-5 text-slate-700" />
              </button>
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-semibold">
                  {user.role.toUpperCase()} PORTAL
                </div>
                <h1 className="font-display text-lg font-medium text-slate-900">{pageTitle}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button className="p-2 rounded-md hover:bg-slate-100 relative" data-testid="notifications-bell">
                <Bell className="h-4.5 w-4.5 text-slate-600" />
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 bg-rose-500 rounded-full" />
              </button>
              <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-slate-100">
                <Avatar className="h-8 w-8 border border-slate-200">
                  <AvatarFallback className="bg-blue-50 text-blue-700 text-xs font-medium">{initials}</AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <div className="text-sm font-medium text-slate-900 leading-tight">{user.name}</div>
                  <div className="text-xs text-slate-500 capitalize leading-tight">{user.role}</div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="border-slate-200 text-slate-700 hover:bg-slate-100"
                data-testid="logout-button"
              >
                <LogOut className="h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 sm:p-8" data-testid="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
