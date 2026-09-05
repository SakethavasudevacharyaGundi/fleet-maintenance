import { VEHICLES, SERVICE_RECORDS, ALERTS, WEEKLY_STATS } from "../data/mock";
import StatusStamp from "../components/StatusStamp";

const totalVehicles = VEHICLES.length;
const overdueCount = VEHICLES.filter((v) => v.status === "OVERDUE").length;
const inServiceCount = VEHICLES.filter((v) => v.status === "IN SERVICE").length;
const dueCount = VEHICLES.filter((v) => v.status === "DUE").length;
const inServiceVehicles = VEHICLES.filter((v) => v.status === "IN SERVICE");

const technicianStats = ["M. Rajan", "P. Venkat", "S. Anand"].map((name) => ({
  name,
  total: VEHICLES.filter((v) => v.technician === name).length,
  overdue: VEHICLES.filter((v) => v.technician === name && v.status === "OVERDUE").length,
  due: VEHICLES.filter((v) => v.technician === name && v.status === "DUE").length,
  inService: VEHICLES.filter((v) => v.technician === name && v.status === "IN SERVICE").length,
  ok: VEHICLES.filter((v) => v.technician === name && v.status === "OK").length,
}));

const chartMax = Math.max(...WEEKLY_STATS.map((w) => w.completed));
const CHART_H = 88;

const DIV = "1px solid #C9C4B4";
const MUTED = "#6B6558";
const MONO = "'JetBrains Mono', monospace";
const UI = "'Archivo', sans-serif";

export default function Dashboard() {
  return (
    <div className="p-6 max-w-[960px]">

      {/* Shift header */}
      <div className="flex items-baseline justify-between mb-7">
        <h1 className="text-[28px] font-bold" style={{ fontFamily: UI }}>Dashboard</h1>
        <span className="text-[12px] tabular-nums" style={{ color: MUTED, fontFamily: MONO }}>
          Sat 05 Sep 2026 — morning shift
        </span>
      </div>

      {/* Gauge cluster — hairline separated, no outer box */}
      <div className="grid grid-cols-2 lg:grid-cols-4 mb-8" style={{ borderTop: DIV, borderLeft: DIV }}>
        {[
          { label: "Fleet size", value: totalVehicles, color: "#1C1E1A" },
          { label: "Overdue", value: overdueCount, color: "#C4622D" },
          { label: "Due this month", value: dueCount, color: "#3E5C76" },
          { label: "In service now", value: inServiceCount, color: "#1C1E1A" },
        ].map((g) => (
          <div
            key={g.label}
            className="px-5 pt-4 pb-5"
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

      <div className="grid lg:grid-cols-[1fr_260px] gap-6 mb-6">

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
                    {WEEKLY_STATS.map((w) => (
                      <div key={w.week} className="flex-1 flex flex-col items-stretch justify-end">
                        <div
                          style={{
                            height: `${chartMax > 0 ? (w.completed / chartMax) * CHART_H : 0}px`,
                            background: w.overdue > 0 ? "#C4622D" : "#8A9A5B",
                            minHeight: w.completed > 0 ? "2px" : "0",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                {/* X labels */}
                <div className="flex gap-1.5 mt-1.5">
                  {WEEKLY_STATS.map((w) => (
                    <div key={w.week} className="flex-1 text-center">
                      <span className="text-[9px]" style={{ color: MUTED, fontFamily: MONO }}>
                        {w.week.replace(" ", " ")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5" style={{ background: "#8A9A5B" }} />
                <span className="text-[11px]" style={{ color: MUTED }}>On time</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5" style={{ background: "#C4622D" }} />
                <span className="text-[11px]" style={{ color: MUTED }}>Completed overdue</span>
              </div>
            </div>
          </div>
        </div>

        {/* Roster */}
        <div style={{ border: DIV }}>
          <div className="px-4 pt-4 pb-3" style={{ borderBottom: DIV }}>
            <span className="text-[13px] font-semibold" style={{ fontFamily: UI }}>Technician roster</span>
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: DIV }}>
                <th className="text-left px-4 py-2 text-[12px] font-medium" style={{ color: MUTED }}>Name</th>
                <th className="text-right px-3 py-2 text-[12px] font-medium" style={{ color: MUTED }}>Veh</th>
                <th className="text-right px-3 py-2 text-[12px] font-medium" style={{ color: "#C4622D" }}>Ovd</th>
                <th className="text-right px-4 py-2 text-[12px] font-medium" style={{ color: MUTED }}>Svc</th>
              </tr>
            </thead>
            <tbody>
              {technicianStats.map((t, i) => (
                <tr key={t.name} style={{ background: i % 2 === 1 ? "#E8E4D9" : "#F2F0EA", borderBottom: DIV }}>
                  <td className="px-4 py-2.5 text-[13px]">{t.name}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-[13px]" style={{ fontFamily: MONO }}>{t.total}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-[13px] font-bold" style={{ fontFamily: MONO, color: t.overdue > 0 ? "#C4622D" : MUTED }}>{t.overdue}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-[13px]" style={{ fontFamily: MONO }}>{t.inService}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* In-service detail */}
          {inServiceVehicles.length > 0 && (
            <div className="px-4 pt-3 pb-4" style={{ borderTop: DIV }}>
              <div className="text-[11px] mb-2" style={{ color: MUTED }}>In bay now</div>
              {inServiceVehicles.map((v) => (
                <div key={v.id} className="flex items-center gap-2 py-1">
                  <span className="text-[11px] tabular-nums" style={{ fontFamily: MONO }}>{v.reg}</span>
                  <span className="text-[11px]" style={{ color: MUTED }}>·</span>
                  <span className="text-[11px]" style={{ color: MUTED }}>{v.technician}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active alerts */}
      {ALERTS.filter((a) => !a.dismissed).length > 0 && (
        <div style={{ border: DIV }}>
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: DIV }}>
            <span className="text-[13px] font-semibold" style={{ fontFamily: UI }}>Active alerts</span>
            <span className="text-[12px] tabular-nums" style={{ color: MUTED, fontFamily: MONO }}>
              {ALERTS.filter((a) => !a.dismissed).length} open
            </span>
          </div>
          {ALERTS.filter((a) => !a.dismissed).map((alert, i) => (
            <div
              key={alert.id}
              className="px-5 flex items-center gap-4"
              style={{
                height: "38px",
                background: i % 2 === 1 ? "#E8E4D9" : "#F2F0EA",
                borderBottom: i < ALERTS.filter((a) => !a.dismissed).length - 1 ? DIV : "none",
              }}
            >
              <StatusStamp status={alert.type === "OVERDUE" ? "OVERDUE" : "DUE"} size="sm" />
              <span className="text-[13px] font-semibold tabular-nums" style={{ fontFamily: MONO, minWidth: "100px" }}>
                {alert.vehicleReg}
              </span>
              <span className="text-[13px]" style={{ color: MUTED, flex: 1 }}>{alert.vehicleName}</span>
              <span
                className="text-[12px] tabular-nums shrink-0"
                style={{ color: alert.type === "OVERDUE" ? "#C4622D" : "#3E5C76", fontFamily: MONO }}
              >
                {alert.message}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
