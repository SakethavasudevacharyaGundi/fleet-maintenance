import { NavLink, Outlet } from "react-router";
import { useState } from "react";
import { ALERTS } from "../data/mock";

const activeAlerts = ALERTS.filter((a) => !a.dismissed).length;

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/vehicles", label: "Vehicles" },
  { to: "/records", label: "Records" },
  { to: "/alerts", label: `Alerts${activeAlerts > 0 ? ` · ${activeAlerts}` : ""}` },
  { to: "/bulk-upload", label: "Bulk upload" },
];

const today = new Date().toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" });

export default function Root() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-full overflow-hidden" style={{ background: "#F2F0EA" }}>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — the tool chassis */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 flex flex-col shrink-0 transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ width: "220px", background: "#1C1E1A", color: "#F2F0EA" }}
      >
        {/* Nameplate */}
        <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(201,196,180,0.12)" }}>
          <div className="text-[11px] tabular-nums mb-1" style={{ color: "rgba(242,240,234,0.35)", fontFamily: "'JetBrains Mono', monospace" }}>
            HYD-01 · {today}
          </div>
          <div className="text-[15px] font-bold tracking-widest" style={{ letterSpacing: "0.18em" }}>
            FLEET
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: "rgba(242,240,234,0.4)", fontFamily: "'Archivo', sans-serif" }}>
            Fleet maintenance
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 pt-3 pb-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center px-5 text-[13px] transition-colors ${
                  isActive
                    ? "text-paper font-semibold"
                    : "font-normal hover:text-white/90"
                }`
              }
              style={({ isActive }) => ({
                color: isActive ? "#F2F0EA" : "rgba(242,240,234,0.52)",
                height: "36px",
                background: isActive ? "rgba(255,255,255,0.09)" : "transparent",
                borderLeft: isActive ? "2px solid #8A9A5B" : "2px solid transparent",
                paddingLeft: isActive ? "18px" : "18px",
                fontFamily: "'Archivo', sans-serif",
              })}
            >
              {item.label}
              {item.to === "/alerts" && activeAlerts > 0 && (
                <span
                  className="ml-auto text-[10px] tabular-nums"
                  style={{ color: "#C4622D", fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {activeAlerts}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Hairline */}
        <div style={{ height: "1px", background: "rgba(201,196,180,0.12)", margin: "0 20px 12px" }} />

        {/* User */}
        <div className="px-5 pb-5">
          <div className="text-[13px] font-medium" style={{ color: "rgba(242,240,234,0.85)" }}>M. Sharma</div>
          <div className="text-[11px] mt-0.5" style={{ color: "rgba(242,240,234,0.35)", fontFamily: "'Archivo', sans-serif" }}>
            Manager · sign out
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile bar */}
        <div
          className="lg:hidden flex items-center gap-3 px-4"
          style={{ background: "#1C1E1A", height: "44px", borderBottom: "1px solid rgba(201,196,180,0.12)" }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ color: "rgba(242,240,234,0.7)" }}
            aria-label="Open menu"
          >
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
              <rect width="16" height="1.5" fill="currentColor" />
              <rect y="5.25" width="16" height="1.5" fill="currentColor" />
              <rect y="10.5" width="16" height="1.5" fill="currentColor" />
            </svg>
          </button>
          <span className="text-[13px] font-bold tracking-widest" style={{ color: "#F2F0EA", letterSpacing: "0.18em" }}>FLEET</span>
        </div>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
