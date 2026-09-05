import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import StatusStamp from "../components/StatusStamp";
import { api } from "../utils/api";

const DIV = "1px solid #C9C4B4";
const MUTED = "#6B6558";
const MONO = "'JetBrains Mono', monospace";
const UI = "'Archivo', sans-serif";

export default function Alerts() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedLocal, setDismissedLocal] = useState<any[]>([]);

  const fetchAlerts = async () => {
    try {
      const data = await api.get("/api/alerts");
      setAlerts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  async function dismiss(id: string, vehicleId: string, dueCycleStart: string) {
    try {
      await api.post(`/api/alerts/${vehicleId}/dismiss`, { dueCycleStart });
      // Optimistically move to local dismissed state
      const alert = alerts.find(a => a.id === id);
      if (alert) {
        setDismissedLocal(prev => [...prev, alert]);
        setAlerts(prev => prev.filter(a => a.id !== id));
      }
    } catch(e: any) {
      alert("Failed to dismiss alert: " + e.message);
    }
  }

  async function dismissAll() {
    for (const a of alerts) {
      await dismiss(a.id, a.vehicle.id, a.becameDueAt);
    }
  }

  const active = alerts;
  const dismissed = dismissedLocal;

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

      {!loading && active.length === 0 && dismissed.length === 0 && (
        <div className="text-center py-14" style={{ border: DIV }}>
          <p className="text-[13px]" style={{ color: MUTED }}>No alerts. All vehicles are up to date.</p>
        </div>
      )}

      {loading && <div className="text-[13px] mb-4" style={{ color: MUTED }}>Loading alerts...</div>}

      {/* Active */}
      {active.length > 0 && (
        <div style={{ border: DIV, marginBottom: "28px" }}>
          {active.map((alert, i) => {
            const bg = i % 2 === 1 ? "#E8E4D9" : "#F2F0EA";
            return (
            <div
              key={alert.id}
              className="flex items-center gap-4 px-4 cursor-pointer"
              style={{
                height: "52px",
                background: bg,
                borderBottom: i < active.length - 1 ? DIV : "none",
              }}
              onClick={(e) => {
                if ((e.target as HTMLElement).tagName !== 'BUTTON') {
                  navigate(`/records/${alert.id}`);
                }
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#DEDAD0")}
              onMouseLeave={(e) => (e.currentTarget.style.background = bg)}
            >
              <StatusStamp status={alert.type === "OVERDUE" ? "OVERDUE" : "DUE"} size="sm" />

              <div className="flex-1 min-w-0 flex flex-wrap items-baseline gap-x-2">
                <span className="text-[13px] font-semibold tabular-nums" style={{ fontFamily: MONO }}>
                  {alert.vehicle.registration}
                </span>
                <span className="text-[13px]" style={{ color: MUTED }}>{alert.vehicle.make} {alert.vehicle.model}</span>
              </div>

              <span
                className="text-[12px] tabular-nums shrink-0"
                style={{
                  color: "#C4622D",
                  fontFamily: MONO,
                }}
              >
                Due cycle start: {new Date(alert.becameDueAt).toLocaleDateString()}
              </span>

              <button
                onClick={() => dismiss(alert.id, alert.vehicle.id, alert.becameDueAt)}
                className="text-[12px] shrink-0 border px-2.5 hover:opacity-60 transition-opacity"
                style={{ border: DIV, borderRadius: "2px", height: "26px", color: MUTED }}
              >
                Dismiss
              </button>
            </div>
            );
          })}
        </div>
      )}

      {/* Dismissed */}
      {dismissed.length > 0 && (
        <>
          <div className="text-[12px] mb-2" style={{ color: MUTED }}>Dismissed</div>
          <div style={{ border: DIV, opacity: 0.55 }}>
            {dismissed.map((alert, i) => {
              const bg = "#E8E4D9";
              return (
              <div
                key={alert.id}
                className="flex items-center gap-4 px-4 cursor-pointer"
                style={{
                  height: "36px",
                  background: bg,
                  borderBottom: i < dismissed.length - 1 ? DIV : "none",
                }}
                onClick={() => navigate(`/records/${alert.id}`)}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#DEDAD0")}
                onMouseLeave={(e) => (e.currentTarget.style.background = bg)}
              >
                <StatusStamp status="OVERDUE" size="sm" />
                <span className="text-[12px] tabular-nums" style={{ fontFamily: MONO }}>{alert.vehicle.registration}</span>
                <span className="text-[12px]" style={{ color: MUTED }}>{alert.vehicle.make} {alert.vehicle.model}</span>
                <span className="text-[12px] ml-auto" style={{ color: MUTED, fontFamily: MONO }}>Cycle: {new Date(alert.becameDueAt).toLocaleDateString()}</span>
              </div>
            );
            })}
          </div>
        </>
      )}
    </div>
  );
}
