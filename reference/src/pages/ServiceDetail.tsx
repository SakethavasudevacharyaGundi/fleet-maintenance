import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { SERVICE_RECORDS } from "../data/mock";
import StatusStamp from "../components/StatusStamp";

const transitions: Record<string, string | null> = {
  BOOKED: "IN SERVICE",
  "IN SERVICE": "COMPLETED",
  COMPLETED: null,
  OVERDUE: "IN SERVICE",
};

const actionLabels: Record<string, string> = {
  BOOKED: "Start service",
  "IN SERVICE": "Complete service",
  OVERDUE: "Start service",
};

const DIV = "1px solid #C9C4B4";
const MUTED = "#6B6558";
const MONO = "'JetBrains Mono', monospace";
const UI = "'Archivo', sans-serif";

export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const record = SERVICE_RECORDS.find((r) => r.id === id);

  const [status, setStatus] = useState(record?.status ?? "BOOKED");
  const [stampAnimate, setStampAnimate] = useState(false);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState("");
  const [timeline, setTimeline] = useState(record?.timeline ?? []);

  if (!record) {
    return (
      <div className="p-6 max-w-[720px]">
        <p className="text-[13px]" style={{ color: MUTED }}>Record not found.</p>
        <button onClick={() => navigate("/records")} className="mt-3 text-[13px]"
          style={{ color: "#3E5C76", fontFamily: MONO }}>← Records</button>
      </div>
    );
  }

  function handleAction() {
    const next = transitions[status];
    if (!next) return;
    setStampAnimate(true);
    setTimeout(() => setStampAnimate(false), 200);
    setStatus(next as any);
    const now = new Date().toISOString().replace("T", " ").slice(0, 16);
    const isStart = next === "IN SERVICE";
    setTimeline((prev) => [
      ...prev,
      {
        id: `t${Date.now()}`,
        timestamp: now,
        actor: "M. Sharma",
        event: isStart ? "Service started" : "Service completed",
        detail: isStart
          ? "Vehicle checked in. Service started."
          : "All work completed. Record closed.",
      },
    ]);
    setToast(isStart ? "Service started." : "Service completed.");
    setTimeout(() => setToast(""), 3000);
  }

  function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setTimeline((prev) => [
      ...prev,
      {
        id: `t${Date.now()}`,
        timestamp: new Date().toISOString().replace("T", " ").slice(0, 16),
        actor: "M. Sharma",
        event: "Note added",
        detail: note.trim(),
      },
    ]);
    setNote("");
  }

  const canAdvance = transitions[status] !== null;

  return (
    <div className="p-6 max-w-[720px]">
      {/* Back nav */}
      <button
        onClick={() => navigate("/records")}
        className="text-[12px] mb-5 hover:opacity-60 transition-opacity"
        style={{ color: MUTED, fontFamily: MONO }}
      >
        ← Records
      </button>

      {/* Work order header */}
      <div style={{ border: DIV, marginBottom: "20px" }}>
        {/* Top band — work order identity */}
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{ background: "#E8E4D9", borderBottom: DIV }}
        >
          <span className="text-[11px] tabular-nums" style={{ fontFamily: MONO, color: MUTED }}>
            WO-{record.bookedDate.replace(/-/g, "")}-{record.id.replace("sr", "").padStart(3, "0")}
          </span>
          <span className="text-[11px]" style={{ color: MUTED, fontFamily: MONO }}>{record.bookedDate}</span>
        </div>

        {/* Main detail row */}
        <div className="px-4 py-4 flex items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[22px] font-bold" style={{ fontFamily: MONO, letterSpacing: "-0.01em" }}>
                {record.vehicleReg}
              </span>
              <StatusStamp status={status} animate={stampAnimate} />
            </div>
            <div className="text-[13px] mb-1">{record.vehicleName} — {record.type}</div>
            <div className="flex gap-4 flex-wrap">
              <span className="text-[12px]" style={{ color: MUTED }}>
                Technician: <span style={{ color: "#1C1E1A" }}>{record.technician}</span>
              </span>
              <span className="text-[12px] tabular-nums" style={{ color: MUTED, fontFamily: MONO }}>
                {record.odometer.toLocaleString()} mi at booking
              </span>
            </div>
          </div>
          {canAdvance && (
            <button
              onClick={handleAction}
              className="shrink-0 text-[13px] font-semibold px-4 hover:opacity-80 transition-opacity"
              style={{ background: "#1C1E1A", color: "#F2F0EA", borderRadius: "2px", height: "34px" }}
            >
              {actionLabels[status]}
            </button>
          )}
        </div>

        {/* Notes band */}
        {record.notes && (
          <div className="px-4 py-2.5 text-[13px]" style={{ borderTop: DIV, color: MUTED }}>
            <span style={{ color: "#1C1E1A", fontWeight: 500 }}>Note:</span> {record.notes}
          </div>
        )}
      </div>

      {/* Audit log — the physical work order trail */}
      <div className="text-[13px] font-semibold mb-3" style={{ fontFamily: UI }}>Audit log</div>

      <div className="relative mb-5">
        {/* Spine */}
        <div
          className="absolute top-0 bottom-0"
          style={{ left: "13px", width: "1px", background: "#C9C4B4" }}
        />

        <div className="space-y-2">
          {timeline.map((entry, i) => (
            <div key={entry.id} className="flex gap-3">
              {/* Spine marker */}
              <div
                className="shrink-0 relative z-10 flex items-center justify-center"
                style={{
                  width: "27px",
                  height: "27px",
                  background: i === timeline.length - 1 ? "#1C1E1A" : "#F2F0EA",
                  border: DIV,
                  marginTop: "4px",
                }}
              >
                <span
                  className="text-[10px] tabular-nums font-bold"
                  style={{
                    fontFamily: MONO,
                    color: i === timeline.length - 1 ? "#F2F0EA" : MUTED,
                  }}
                >
                  {i + 1}
                </span>
              </div>

              {/* Ticket stub */}
              <div
                className="flex-1 px-3 py-2.5"
                style={{ border: DIV, borderRadius: "2px", background: "#F2F0EA" }}
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 mb-1">
                  <span className="text-[11px] tabular-nums" style={{ fontFamily: MONO, color: MUTED }}>
                    {entry.timestamp}
                  </span>
                  <span className="text-[12px] font-semibold">{entry.actor}</span>
                  <span className="text-[12px]" style={{ color: MUTED }}>— {entry.event}</span>
                </div>
                {entry.detail && (
                  <p className="text-[13px]" style={{ color: "#1C1E1A", lineHeight: "1.45" }}>{entry.detail}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add note */}
      <form onSubmit={handleAddNote} className="flex gap-2">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note to this record…"
          className="flex-1 text-[13px] px-3 border outline-none"
          style={{ border: DIV, background: "#F2F0EA", borderRadius: "2px", height: "34px", fontFamily: UI }}
          onFocus={(e) => (e.target.style.borderColor = "#3E5C76")}
          onBlur={(e) => (e.target.style.borderColor = "#C9C4B4")}
        />
        <button
          type="submit"
          className="text-[13px] px-4 border hover:opacity-70 transition-opacity"
          style={{ border: DIV, borderRadius: "2px", height: "34px", background: "transparent" }}
        >
          Add note
        </button>
      </form>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-5 right-5 px-4 py-2.5 text-[13px] font-medium"
          style={{ background: "#1C1E1A", color: "#F2F0EA", borderRadius: "2px" }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
