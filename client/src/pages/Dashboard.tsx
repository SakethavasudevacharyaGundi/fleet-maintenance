import { useEffect, useState } from "react";
import StatusStamp from "../components/StatusStamp";
import { api } from "../utils/api";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router";
import TechnicianDrawer from "./TechnicianDrawer";

const DIV = "1px solid #C9C4B4";
const MUTED = "#6B6558";
const MONO = "'JetBrains Mono', monospace";
const UI = "'Archivo', sans-serif";

export default function Dashboard() {
  const { isManager } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredWeek, setHoveredWeek] = useState<any>(null);
  const [techDrawerOpen, setTechDrawerOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const [dashRes, alertsRes, techniciansRes] = await Promise.all([
          api.get("/api/dashboard"),
          api.get("/api/alerts").catch(() => []),
          isManager ? api.get("/api/users/technicians").catch(() => []) : Promise.resolve([])
        ]);
        const counts = new Map((dashRes.byTechnician ?? []).map((tech: any) => [tech.technicianId, tech.count]));
        setData({ dashboard: { ...dashRes, byTechnician: (techniciansRes ?? []).map((tech: any) => ({ ...tech, count: counts.get(tech.id) ?? 0 })) }, alerts: alertsRes ?? [] });
      } catch (err) {
        console.error(err);
        setData({ dashboard: { summary: {}, weeklyCompleted: [], byTechnician: [] }, alerts: [] });
      } finally {
        setLoading(false);
      }
    }
    load();
    const refreshId = window.setInterval(load, 30_000);
    return () => window.clearInterval(refreshId);
  }, [isManager, refreshTrigger]);

  if (loading || !data) return <div className="p-6">Loading...</div>;

  const summary = data.dashboard.summary;
  const weeklyCompleted = data.dashboard.weeklyCompleted;
  // The mock had an `overdue` field in WEEKLY_STATS which the backend doesn't provide natively yet.
  const chartMax = Math.max(...weeklyCompleted.map((w: any) => w.count), 1);
  const CHART_H = 88;
  const activeAlerts = data.alerts.filter((a: any) => !a.dismissedAt);
  const now = new Date();
  const hour = now.getHours();
  const shift = hour >= 6 && hour < 12 ? "morning" : hour >= 12 && hour < 18 ? "afternoon" : hour >= 18 && hour < 24 ? "evening" : "night";
  const dateLabel = now.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).replace(",", "");
  return (
    <div className="w-full max-w-[1120px] mx-auto p-4 sm:p-6">

      {/* Shift header */}
      <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:items-baseline sm:justify-between mb-7">
        <h1 className="text-[26px] sm:text-[28px] font-bold" style={{ fontFamily: UI }}>Dashboard</h1>
        <span className="text-[12px] tabular-nums" style={{ color: MUTED, fontFamily: MONO }}>
          {dateLabel} — {shift} shift
        </span>
      </div>

      {/* Gauge cluster — hairline separated, no outer box */}
      <div className="grid grid-cols-2 lg:grid-cols-4 mb-8" style={{ borderTop: DIV, borderLeft: DIV }}>
        {[
          { label: "Completed this week", value: summary.completedThisWeek, color: "#1C1E1A" },
          { label: "Overdue", value: summary.vehiclesOverdue, color: "#C4622D" },
          { label: "Due / Booked", value: summary.vehiclesDue, color: "#3E5C76" },
          { label: "In service now", value: summary.vehiclesInService, color: "#1C1E1A" },
        ].map((g) => (
          <div
            key={g.label}
            className="px-3 sm:px-5 pt-4 pb-5 text-center"
            style={{ borderRight: DIV, borderBottom: DIV }}
          >
            <div className="text-[12px] mb-2" style={{ color: MUTED, fontFamily: UI }}>{g.label}</div>
            <div
              className="text-[40px] font-bold tabular-nums leading-none"
              style={{ fontFamily: MONO, color: g.color }}
            >
              {g.value}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-6 mb-6">

        {/* Chart — services completed per week */}
        <div style={{ border: DIV }}>
          <div className="px-5 pt-4 pb-3" style={{ borderBottom: DIV }}>
            <span className="text-[13px] font-semibold" style={{ fontFamily: UI }}>Services completed — last 8 weeks</span>
          </div>
          <div className="px-5 pt-4 pb-5">
            {/* Y-axis ticks + bars */}
            <div className="flex gap-0" style={{ height: `${CHART_H + 16}px` }}>
              {/* Y-axis */}
              <div className="flex flex-col justify-between pr-2 shrink-0" style={{ height: CHART_H }}>
                {[chartMax, Math.round(chartMax / 2), 0].map((tick) => (
                  <span key={tick} className="text-[10px] tabular-nums" style={{ color: MUTED, fontFamily: MONO, lineHeight: 1 }}>
                    {tick}
                  </span>
                ))}
              </div>
              {/* Bars */}
              <div className="flex-1 flex flex-col">
                {/* Gridlines */}
                <div className="relative flex-1" style={{ height: CHART_H }}>
                  {[0, 0.5, 1].map((frac) => (
                    <div
                      key={frac}
                      className="absolute w-full"
                      style={{ bottom: `${frac * CHART_H}px`, borderTop: `1px solid #E8E4D9` }}
                    />
                  ))}
                  {/* Bar columns */}
                  <div className="absolute inset-0 flex items-end gap-1.5">
                    {weeklyCompleted.map((w: any) => (
                      <div
                        key={w.weekStart}
                        className="relative flex-1 flex flex-col items-stretch justify-end"
                        onMouseEnter={() => setHoveredWeek(w)}
                        onMouseLeave={() => setHoveredWeek(null)}
                      >
                        {hoveredWeek?.weekStart === w.weekStart && (
                          <div
                            className="absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap px-2 py-1.5 text-[10px] text-center"
                            style={{ top: 4, background: "#1C1E1A", color: "#F2F0EA", fontFamily: MONO, boxShadow: "0 3px 8px rgba(28,30,26,0.18)" }}
                          >
                            <div>{w.count} completed</div>
                            <div style={{ color: "#C9C4B4" }}>{new Date(w.weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                          </div>
                        )}
                        <div
                          aria-label={`${w.count} completed service${w.count === 1 ? "" : "s"}`}
                          className="transition-opacity hover:opacity-75"
                          style={{
                            height: `${chartMax > 0 ? (w.count / chartMax) * CHART_H : 0}px`,
                            background: "#8A9A5B",
                            minHeight: w.count > 0 ? "2px" : "0",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                {/* X labels */}
                <div className="flex gap-1.5 mt-1.5">
                  {weeklyCompleted.map((w: any) => {
                    const date = new Date(w.weekStart);
                    const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    return (
                      <div key={w.weekStart} className="flex-1 text-center">
                        <span className="text-[9px]" style={{ color: MUTED, fontFamily: MONO }}>
                          {label.replace(" ", " ")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5" style={{ background: "#8A9A5B" }} />
                <span className="text-[11px]" style={{ color: MUTED }}>Completed services</span>
              </div>
            </div>
          </div>
        </div>

        {/* Roster (Manager Only) */}
        {isManager && (
          <div style={{ border: DIV }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: DIV }}>
              <span className="text-[13px] font-semibold" style={{ fontFamily: UI }}>Technician roster</span>
              <button
                onClick={() => setTechDrawerOpen(true)}
                className="text-[12px] font-semibold px-3 hover:opacity-80 transition-opacity"
                style={{ background: "#1C1E1A", color: "#F2F0EA", borderRadius: "2px", height: "26px" }}
              >
                + New technician
              </button>
            </div>
            <div className="max-h-[320px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0" style={{ background: "#E8E4D9" }}>
                  <tr style={{ borderBottom: DIV }}>
                    <th className="text-left px-4 py-2 text-[12px] font-medium" style={{ color: MUTED }}>Name</th>
                    <th className="text-right px-4 py-2 text-[12px] font-medium" style={{ color: MUTED }}>Records</th>
                  </tr>
                </thead>
                <tbody>
                  {data.dashboard.byTechnician.map((t: any, i: number) => (
                    <tr key={t.id} onClick={() => navigate(`/profile/${t.id}`)} className="cursor-pointer hover:opacity-75" style={{ background: i % 2 === 1 ? "#E8E4D9" : "#F2F0EA", borderBottom: DIV }}>
                      <td className="px-4 py-2.5">
                        <div className="text-[13px]" style={{ fontFamily: UI }}>{t.name}</div>
                        <div className="text-[10px] tabular-nums mt-0.5" style={{ fontFamily: MONO, color: MUTED, letterSpacing: "0.04em" }}>
                          {t.staffId}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[13px]" style={{ fontFamily: MONO }}>{t.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Active alerts */}
      {isManager && activeAlerts.length > 0 && (
        <div style={{ border: DIV }}>
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: DIV }}>
            <span className="text-[13px] font-semibold" style={{ fontFamily: UI }}>Active alerts</span>
            <span className="text-[12px] tabular-nums" style={{ color: MUTED, fontFamily: MONO }}>
              {activeAlerts.length} open
            </span>
          </div>
          {activeAlerts.map((alert: any, i: number) => {
            const bg = i % 2 === 1 ? "#E8E4D9" : "#F2F0EA";
            return (
              <div
                key={alert.id}
                className="px-5 flex items-center gap-4 cursor-pointer"
                style={{
                  height: "38px",
                  background: bg,
                  borderBottom: i < activeAlerts.length - 1 ? DIV : "none",
                }}
                onClick={() => navigate(`/records/${alert.id}`)}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#DEDAD0")}
                onMouseLeave={(e) => (e.currentTarget.style.background = bg)}
              >
                <StatusStamp status={alert.type || "OVERDUE"} size="sm" />
                <span className="text-[13px] font-semibold tabular-nums" style={{ fontFamily: MONO, minWidth: "100px" }}>
                  {alert.vehicle.registration}
                </span>
                <span className="text-[12px] tabular-nums shrink-0" style={{ color: "#C4622D", fontFamily: MONO }}>
                  Cycle start: {new Date(alert.becameDueAt).toLocaleDateString()}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {techDrawerOpen && (
        <TechnicianDrawer
          onClose={(didChange) => {
            setTechDrawerOpen(false);
            if (didChange === true) {
              setRefreshTrigger(prev => prev + 1);
            }
          }}
        />
      )}
    </div>
  );
}
