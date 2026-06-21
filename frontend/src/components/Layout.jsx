import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import {
  LayoutDashboard, Ticket, BookOpen, Users, Settings,
  Bell, LogOut, ShieldCheck, ChevronDown
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel
} from "@/components/ui/dropdown-menu";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "technician"] },
  { to: "/tickets", label: "Tickets", icon: Ticket, roles: ["admin", "technician", "requester"] },
  { to: "/kb", label: "Knowledge Base", icon: BookOpen, roles: ["admin", "technician", "requester"] },
  { to: "/users", label: "Users", icon: Users, roles: ["admin"] },
  { to: "/settings", label: "Settings", icon: Settings, roles: ["admin"] },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [openBell, setOpenBell] = useState(false);

  const loadNotifs = async () => {
    try {
      const { data } = await api.get("/notifications");
      setNotifications(data);
    } catch {}
  };

  useEffect(() => {
    loadNotifs();
    const id = setInterval(loadNotifs, 30000);
    return () => clearInterval(id);
  }, []);

  const unread = notifications.filter(n => !n.read).length;

  const handleMarkAll = async () => {
    await api.post("/notifications/read-all");
    loadNotifs();
  };

  const handleNotifClick = async (n) => {
    if (!n.read) await api.post(`/notifications/${n.id}/read`);
    if (n.ticket_id) navigate(`/tickets/${n.ticket_id}`);
    setOpenBell(false);
    loadNotifs();
  };

  if (!user) return null;
  const allowed = NAV.filter(n => n.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 fixed left-0 top-0 h-screen bg-slate-950 flex flex-col border-r border-slate-800 z-30">
        <div className="h-16 flex items-center gap-2.5 px-6 border-b border-slate-800">
          <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center">
            <ShieldCheck size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-heading font-bold text-slate-50 text-sm tracking-tight">HELPDESK</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-medium">Ops Console</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-0.5">
          <div className="px-3 pb-2 text-[10px] uppercase tracking-widest font-bold text-slate-500">Workspace</div>
          {allowed.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              data-testid={`nav-${label.toLowerCase().replace(/\s/g, '-')}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all border-l-2 ${
                  isActive
                    ? "bg-slate-900 text-white border-blue-500 font-semibold"
                    : "text-slate-400 hover:text-white hover:bg-slate-900/60 border-transparent"
                }`
              }
            >
              <Icon size={16} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-800 p-3">
          <div className="px-3 py-2 text-xs text-slate-500">
            <div className="font-mono text-[10px] uppercase tracking-widest">Signed in</div>
            <div className="text-slate-200 truncate font-medium text-sm mt-0.5">{user.name}</div>
            <div className="text-slate-500 text-[11px] uppercase tracking-wider">{user.role}</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="ml-64 min-h-screen flex flex-col">
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 sticky top-0 z-20">
          <div className="text-xs uppercase tracking-widest text-slate-500 font-bold font-heading">
            IT Operations / <span className="text-slate-900">{user.role === "requester" ? "Self Service" : "Console"}</span>
          </div>

          <div className="flex items-center gap-3">
            <DropdownMenu open={openBell} onOpenChange={setOpenBell}>
              <DropdownMenuTrigger asChild>
                <button
                  data-testid="notification-bell"
                  className="relative w-9 h-9 rounded-md border border-slate-200 hover:bg-slate-50 flex items-center justify-center"
                >
                  <Bell size={16} className="text-slate-700" />
                  {unread > 0 && (
                    <span
                      data-testid="notification-unread-badge"
                      className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center"
                    >{unread > 9 ? "9+" : unread}</span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex justify-between items-center">
                  <span>Notifications</span>
                  {unread > 0 && (
                    <button
                      data-testid="notification-mark-all-read"
                      onClick={handleMarkAll}
                      className="text-xs text-blue-600 hover:underline font-medium"
                    >Mark all read</button>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-slate-500">No notifications</div>
                  )}
                  {notifications.map(n => (
                    <DropdownMenuItem
                      key={n.id}
                      data-testid={`notification-item-${n.id}`}
                      onClick={() => handleNotifClick(n)}
                      className={`flex flex-col items-start gap-0.5 cursor-pointer ${!n.read ? "bg-blue-50/50" : ""}`}
                    >
                      <div className="text-sm text-slate-900">{n.message}</div>
                      <div className="text-[11px] text-slate-500">{new Date(n.created_at).toLocaleString()}</div>
                    </DropdownMenuItem>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button data-testid="user-menu-trigger" className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-slate-50">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
                    {user.name.slice(0,1).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-slate-900">{user.name}</span>
                  <ChevronDown size={14} className="text-slate-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="text-sm">{user.email}</div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider">{user.role}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  data-testid="logout-button"
                  onClick={async () => { await logout(); navigate("/login"); }}
                  className="cursor-pointer"
                >
                  <LogOut size={14} className="mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="p-8 max-w-7xl mx-auto w-full flex-1">{children}</main>
      </div>
    </div>
  );
}
