import { useState } from "react";
import { ALERTS, type Alert } from "../data/mock";
import StatusStamp from "../components/StatusStamp";

const DIV = "1px solid #C9C4B4";
const MUTED = "#6B6558";
const MONO = "'JetBrains Mono', monospace";
const UI = "'Archivo', sans-serif";

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>(ALERTS);

  function dismiss(id: string) {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, dismissed: true } : a)));
  }

  function dismissAll() {
    setAlerts((prev) => prev.map((a) => ({ ...a, dismissed: true })));
  }

  const active = alerts.filter((a) => !a.dismissed);
  const dismissed = alerts.filter((a) => a.dismissed);

  return (
    <div className="p-6 max-w-[720px]">
      <div className="flex items-baseline justify-between mb-5">
        <h1 className="text-[28px] font-bold" style={{ fontFamily: UI }}>Alerts</h1>
        {active.length > 0 && (
          <button
            onClick={dismissAll}
            className="text-[12px] border px-3 hover:opacity-70 transition-opacity"
            style={{ border: DIV, borderRadius: "2px", height: "30px", color: MUTED }}
          >
            Dismiss all
          </button>
        )}
      </div>

      {active.length === 0 && dismissed.length === 0 && (
        <div className="text-center py-14" style={{ border: DIV }}>
          <p className="text-[13px]" style={{ color: MUTED }}>No alerts. All vehicles are up to date.</p>
        </div>
      )}

      {/* Active */}
      {active.length > 0 && (
        <div style={{ border: DIV, marginBottom: "28px" }}>
          {active.map((alert, i) => (
            <div
              key={alert.id}
              className="flex items-center gap-4 px-4"
              style={{
                height: "52px",
                background: i % 2 === 1 ? "#E8E4D9" : "#F2F0EA",
                borderBottom: i < active.length - 1 ? DIV : "none",
              }}
            >
              <StatusStamp status={alert.type === "OVERDUE" ? "OVERDUE" : "DUE"} size="sm" />

              <div className="flex-1 min-w-0 flex flex-wrap items-baseline gap-x-2">
                <span className="text-[13px] font-semibold tabular-nums" style={{ fontFamily: MONO }}>
                  {alert.vehicleReg}
                </span>
                <span className="text-[13px]" style={{ color: MUTED }}>{alert.vehicleName}</span>
              </div>

              <span
                className="text-[12px] tabular-nums shrink-0"
                style={{
                  color: alert.type === "OVERDUE" ? "#C4622D" : "#3E5C76",
                  fontFamily: MONO,
                }}
              >
                {alert.message}
              </span>

              <button
                onClick={() => dismiss(alert.id)}
                className="text-[12px] shrink-0 border px-2.5 hover:opacity-60 transition-opacity"
                style={{ border: DIV, borderRadius: "2px", height: "26px", color: MUTED }}
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dismissed */}
      {dismissed.length > 0 && (
        <>
          <div className="text-[12px] mb-2" style={{ color: MUTED }}>Dismissed</div>
          <div style={{ border: DIV, opacity: 0.55 }}>
            {dismissed.map((alert, i) => (
              <div
                key={alert.id}
                className="flex items-center gap-4 px-4"
                style={{
                  height: "36px",
                  background: "#E8E4D9",
                  borderBottom: i < dismissed.length - 1 ? DIV : "none",
                }}
              >
                <StatusStamp status={alert.type === "OVERDUE" ? "OVERDUE" : "DUE"} size="sm" />
                <span className="text-[12px] tabular-nums" style={{ fontFamily: MONO }}>{alert.vehicleReg}</span>
                <span className="text-[12px]" style={{ color: MUTED }}>{alert.vehicleName}</span>
                <span className="text-[12px] ml-auto" style={{ color: MUTED, fontFamily: MONO }}>{alert.message}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
