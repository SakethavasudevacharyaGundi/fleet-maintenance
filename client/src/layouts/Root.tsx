import { NavLink, Outlet, useNavigate } from "react-router";
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../utils/api";
import { usePageTransition } from "../components/StripedTransition";

/* live IST clock — same hook as Login */
function useIST() {
  const fmt = () =>
    new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  const [clock, setClock] = useState(fmt);
  useEffect(() => {
    const id = setInterval(() => setClock(fmt()), 60_000); // update every minute (date label)
    return () => clearInterval(id);
  }, []);
  return clock;
}

export default function Root() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isManager, logout } = useAuth();
  const { trigger } = usePageTransition();
  const navigate = useNavigate();
  const clock = useIST();
  const [activeAlerts, setActiveAlerts] = useState(0);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  useEffect(() => {
    if (isManager) {
      api.get("/api/alerts").then((data: any) => {
        setActiveAlerts(Array.isArray(data) ? data.length : 0);
      }).catch(() => {});
    }
  }, [isManager]);

  const navItems = [
    { to: "/dashboard",   label: "Dashboard",                                           show: true },
    { to: "/vehicles",    label: "Vehicles",                                            show: isManager },
    { to: "/records",     label: "Records",                                             show: true },
    { to: "/alerts",      label: `Alerts${activeAlerts > 0 ? ` · ${activeAlerts}` : ""}`, show: isManager },
    { to: "/bulk-upload", label: "Bulk upload",                                         show: isManager },
    { to: "/profile",     label: "Profile",                                             show: true },
  ].filter(i => i.show);

  const displayName = user?.name || user?.email?.split("@")[0] || "User";
  const roleLabel   = user?.tag ?? (isManager ? "Manager" : "Technician");

  return (
    <div className="flex h-full overflow-hidden" style={{ background: "#F2F0EA" }}>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 flex flex-col shrink-0 transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ width: "220px", background: "#1C1E1A", color: "#F2F0EA" }}
      >
        {/* Nameplate */}
        <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(201,196,180,0.12)" }}>
          <div
            className="text-[10px] tabular-nums mb-1"
            style={{ color: "rgba(242,240,234,0.35)", fontFamily: "'JetBrains Mono', monospace" }}
          >
            {clock}
          </div>
          <div className="flex items-center gap-2 text-[15px] font-bold tracking-widest" style={{ letterSpacing: "0.18em" }}>
            <svg width="21" height="15" viewBox="0 0 21 15" fill="none" aria-hidden="true">
              <path d="M1 2.5h11v8H1zM12 5h4l3 3v2.5h-7zM5 12.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM17 12.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" stroke="#8A9A5B" strokeWidth="1.2" />
            </svg>
            FLEETCO
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
                  isActive ? "font-semibold" : "font-normal"
                }`
              }
              style={({ isActive }) => ({
                color:       isActive ? "#F2F0EA" : "rgba(242,240,234,0.52)",
                height:      "36px",
                background:  isActive ? "rgba(255,255,255,0.09)" : "transparent",
                borderLeft:  isActive ? "2px solid #8A9A5B" : "2px solid transparent",
                paddingLeft: "18px",
                fontFamily:  "'Archivo', sans-serif",
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
        <div style={{ height: "1px", background: "rgba(201,196,180,0.12)", margin: "0 20px 0" }} />

        {/* User info */}
        <div className="px-5 pt-3 pb-2">
          <div
            className="text-[13px] font-semibold"
            style={{ color: "rgba(242,240,234,0.9)", fontFamily: "'Archivo', sans-serif" }}
          >
            {displayName}
          </div>
          <div
            className="text-[11px] mt-0.5"
            style={{ color: "rgba(242,240,234,0.38)", fontFamily: "'Archivo', sans-serif" }}
          >
            {roleLabel}
          </div>
        </div>

        {/* Sign out button — proper, full-width, matches system */}
        <div className="px-4 pb-5 pt-2">
          <button
            onClick={() => setConfirmSignOut(true)}
            className="w-full text-[12px] font-semibold hover:opacity-75 transition-opacity"
            style={{
              height:     "34px",
              background: "rgba(201,196,180,0.12)",
              color:      "rgba(242,240,234,0.7)",
              border:     "1px solid rgba(201,196,180,0.18)",
              borderRadius: 2,
              fontFamily: "'Archivo', sans-serif",
              cursor:     "pointer",
            }}
          >
            Sign out
          </button>
        </div>
      </aside>

      {confirmSignOut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5" style={{ background: "rgba(28,30,26,0.42)" }}>
          <div role="dialog" aria-modal="true" aria-labelledby="signout-title" style={{ width: "100%", maxWidth: 360, background: "#F2F0EA", border: "1px solid #C9C4B4", boxShadow: "0 14px 40px rgba(28,30,26,0.2)" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #C9C4B4" }}>
              <h2 id="signout-title" className="text-[15px] font-semibold" style={{ fontFamily: "'Archivo', sans-serif" }}>Sign out of FleetCo?</h2>
              <p className="text-[12px] mt-1" style={{ color: "#6B6558" }}>Your current session will be closed.</p>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3">
              <button onClick={() => setConfirmSignOut(false)} className="text-[12px] px-3" style={{ height: 32, border: "1px solid #C9C4B4", background: "transparent", borderRadius: 2 }}>Cancel</button>
              <button
                onClick={() => {
                  setConfirmSignOut(false);
                  trigger(() => {
                    logout();
                    navigate("/");
                  });
                }}
                className="text-[12px] font-semibold px-3"
                style={{ height: 32, color: "#F2F0EA", background: "#1C1E1A", borderRadius: 2 }}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────── */}
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
          <span className="text-[13px] font-bold tracking-widest" style={{ color: "#F2F0EA", letterSpacing: "0.18em" }}>
            FLEETCO
          </span>
        </div>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
