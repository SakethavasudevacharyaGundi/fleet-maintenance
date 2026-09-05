import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import StatusStamp from "../components/StatusStamp";
import { api } from "../utils/api";
import { useAuth } from "../contexts/AuthContext";

const transitions: Record<string, string | null> = {
  DUE: "BOOKED",
  OVERDUE: "BOOKED",
  BOOKED: "IN_SERVICE",
  "IN_SERVICE": "COMPLETED",
  COMPLETED: null,
};

const actionLabels: Record<string, string> = {
  DUE: "Book service",
  OVERDUE: "Book service",
  BOOKED: "Start service",
  "IN_SERVICE": "Complete service",
};

const DIV = "1px solid #C9C4B4";
const MUTED = "#6B6558";
const MONO = "'JetBrains Mono', monospace";
const UI = "'Archivo', sans-serif";

export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isManager } = useAuth();
  
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stampAnimate, setStampAnimate] = useState(false);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState("");
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState("");
  const [odometerModal, setOdometerModal] = useState(false);
  const [odometerInput, setOdometerInput] = useState("");
  const [odometerError, setOdometerError] = useState("");
  const [bookingModal, setBookingModal] = useState(false);
  const [scheduledDateInput, setScheduledDateInput] = useState(new Date().toISOString().split("T")[0]);

  const fetchRecord = async () => {
    try {
      const data = await api.get(`/api/service-records/${id}`);
      setRecord(data);
    } catch (e) {
      console.error(e);
      setRecord(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecord();
  }, [id]);

  useEffect(() => {
    if (isManager) api.get("/api/users/technicians").then(setTechnicians).catch(console.error);
  }, [isManager]);

  if (loading) {
    return <div className="p-6 text-[13px]" style={{ color: MUTED }}>Loading...</div>;
  }

  if (!record) {
    return (
      <div className="p-6 max-w-[720px]">
        <p className="text-[13px]" style={{ color: MUTED }}>Record not found.</p>
        <button onClick={() => navigate("/records")} className="mt-3 text-[13px]"
          style={{ color: "#3E5C76", fontFamily: MONO }}>← Records</button>
      </div>
    );
  }

  const status = record.status;
  const technicianLabel = (technicianId: string) => {
    const assignment = record.assignments.find((item: any) => item.technicianId === technicianId);
    if (!assignment) return "Assigned technician";
    const match = assignment.technician.email.match(/tech([a-j])/i);
    return `${assignment.technician.name}${match ? ` (${match[0].toUpperCase()})` : ""}`;
  };

  async function handleAction() {
    const next = transitions[status];
    if (!next) return;

    let action = "";
    let payload: any = {};

    if (next === "BOOKED") {
      if (!record.assignments || record.assignments.length === 0) {
        alert("Please assign a technician before booking.");
        return;
      }
      setScheduledDateInput(new Date().toISOString().split("T")[0]);
      setBookingModal(true);
      return;
    } else if (next === "IN_SERVICE") {
      action = "start";
    } else if (next === "COMPLETED") {
      setOdometerInput(String(record.vehicle.odometer));
      setOdometerError("");
      setOdometerModal(true);
      return;
    }

    try {
      setStampAnimate(true);
      setTimeout(() => setStampAnimate(false), 200);
      await api.patch(`/api/service-records/${id}/transition`, { action, ...payload });
      setToast(actionLabels[status] + " successful.");
      setTimeout(() => setToast(""), 3000);
      fetchRecord();
    } catch (e: any) {
      alert("Transition failed: " + e.message);
    }
  }

  async function handleComplete() {
    const odometer = parseInt(odometerInput, 10);
    if (!odometerInput.trim() || isNaN(odometer)) {
      setOdometerError("Enter a valid odometer reading.");
      return;
    }
    if (odometer < record.vehicle.odometer) {
      setOdometerError(`Reading must be at least ${record.vehicle.odometer.toLocaleString()} mi.`);
      return;
    }

    try {
      setOdometerModal(false);
      setStampAnimate(true);
      setTimeout(() => setStampAnimate(false), 200);
      await api.patch(`/api/service-records/${id}/transition`, { action: "complete", odometerReading: odometer });
      setToast("Complete service successful.");
      setTimeout(() => setToast(""), 3000);
      fetchRecord();
    } catch (e: any) {
      alert("Transition failed: " + e.message);
    }
  }

  async function handleBook() {
    if (!scheduledDateInput.trim()) return;

    try {
      setBookingModal(false);
      setStampAnimate(true);
      setTimeout(() => setStampAnimate(false), 200);
      const payload = {
        action: "book",
        scheduledDate: scheduledDateInput,
        technicianIds: record.assignments.map((a: any) => a.technicianId)
      };
      await api.patch(`/api/service-records/${id}/transition`, payload);
      setToast("Book service successful.");
      setTimeout(() => setToast(""), 3000);
      fetchRecord();
    } catch (e: any) {
      alert("Transition failed: " + e.message);
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    try {
      await api.post(`/api/service-records/${id}/notes`, { text: note.trim() });
      setNote("");
      fetchRecord();
    } catch (e: any) {
      alert("Failed to add note: " + e.message);
    }
  }

  async function handleAssign() {
    if (!selectedTechnician) return;
    try {
      await api.post(`/api/service-records/${id}/assignments`, { technicianId: selectedTechnician });
      setSelectedTechnician("");
      setToast("Technician assigned.");
      fetchRecord();
      setTimeout(() => setToast(""), 2500);
    } catch (e: any) {
      alert("Assignment failed: " + e.message);
    }
  }

  async function handleUnassign(technicianId: string) {
    try {
      await api.delete(`/api/service-records/${id}/assignments/${technicianId}`);
      fetchRecord();
    } catch (e: any) {
      alert("Unable to remove technician: " + e.message);
    }
  }

  // A Manager can advance anything. A Technician can only start and complete.
  let canAdvance = transitions[status] !== null;
  if (!isManager && (status === "DUE" || status === "OVERDUE")) {
    canAdvance = false; // Technicians cannot book
  }

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
            WO-{record.vehicle.registration}-{record.scheduledDate ? record.scheduledDate.substring(0, 10).replace(/-/g, "") : "TBD"}
          </span>
          <span className="text-[11px]" style={{ color: MUTED, fontFamily: MONO }}>
            {record.scheduledDate ? record.scheduledDate.substring(0, 10) : "TBD"}
          </span>
        </div>

        {/* Main detail row */}
        <div className="px-4 py-4 flex items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[22px] font-bold" style={{ fontFamily: MONO, letterSpacing: "-0.01em" }}>
                {record.vehicle.registration}
              </span>
              <StatusStamp status={status === "IN_SERVICE" ? "IN SERVICE" : status} animate={stampAnimate} />
            </div>
            <div className="text-[13px] mb-1">{record.vehicle.make} {record.vehicle.model} — {record.description}</div>
            <div className="flex gap-4 flex-wrap">
              <span className="text-[12px]" style={{ color: MUTED }}>
                Technician: <span style={{ color: "#1C1E1A" }}>
                  {record.assignments.length > 0 ? record.assignments.map((a: any) => a.technician.email.split('@')[0]).join(', ') : "Unassigned"}
                </span>
              </span>
              <span className="text-[12px] tabular-nums" style={{ color: MUTED, fontFamily: MONO }}>
                {record.vehicle.odometer.toLocaleString()} mi current
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
      </div>

      {isManager && (
        <div className="mb-5" style={{ border: DIV }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: DIV }}>
            <span className="text-[13px] font-semibold" style={{ fontFamily: UI }}>Assigned technicians</span>
            <span className="text-[11px]" style={{ color: MUTED }}>Manager controls</span>
          </div>
          <div className="px-4 py-3 flex flex-wrap items-center gap-2" style={{ borderBottom: record.assignments.length ? DIV : "none" }}>
            <select value={selectedTechnician} onChange={e => setSelectedTechnician(e.target.value)} className="text-[13px] px-3" style={{ border: DIV, background: "#F2F0EA", borderRadius: 2, height: 34, minWidth: 230 }}>
              <option value="">Select technician...</option>
              {technicians.filter(tech => !record.assignments.some((assignment: any) => assignment.technicianId === tech.id)).map(tech => (
                <option key={tech.id} value={tech.id}>{tech.name} · {tech.staffId}</option>
              ))}
            </select>
            <button onClick={handleAssign} disabled={!selectedTechnician} className="text-[13px] font-semibold px-4 disabled:opacity-40" style={{ height: 34, background: "#1C1E1A", color: "#F2F0EA", borderRadius: 2 }}>Assign</button>
          </div>
          {record.assignments.map((assignment: any, index: number) => (
            <div key={assignment.technicianId} className="flex items-center justify-between px-4 py-2.5" style={{ background: index % 2 ? "#E8E4D9" : "#F2F0EA", borderBottom: index < record.assignments.length - 1 ? DIV : "none" }}>
              <span className="text-[13px]">{assignment.technician.name} <span className="text-[11px]" style={{ color: MUTED, fontFamily: MONO }}>{assignment.technician.email.match(/tech([a-j])/i)?.[0]?.toUpperCase()}</span></span>
              <button onClick={() => handleUnassign(assignment.technicianId)} className="text-[12px]" style={{ color: "#C4622D" }}>Remove</button>
            </div>
          ))}
        </div>
      )}

      {/* Audit log — the physical work order trail */}
      <div className="text-[13px] font-semibold mb-3" style={{ fontFamily: UI }}>Audit log</div>

      <div className="relative mb-5">
        {/* Spine */}
        <div
          className="absolute top-0 bottom-0"
          style={{ left: "13px", width: "1px", background: "#C9C4B4" }}
        />

        <div className="space-y-2">
          {record.events.map((entry: any, i: number) => (
            <div key={entry.id} className="flex gap-3">
              {/* Spine marker */}
              <div
                className="shrink-0 relative z-10 flex items-center justify-center"
                style={{
                  width: "27px",
                  height: "27px",
                  background: i === record.events.length - 1 ? "#1C1E1A" : "#F2F0EA",
                  border: DIV,
                  marginTop: "4px",
                }}
              >
                <span
                  className="text-[10px] tabular-nums font-bold"
                  style={{
                    fontFamily: MONO,
                    color: i === record.events.length - 1 ? "#F2F0EA" : MUTED,
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
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                  <span className="text-[12px] font-semibold">{entry.actor.email.split('@')[0]}</span>
                  <span className="text-[12px]" style={{ color: MUTED }}>— {entry.type}</span>
                </div>
                {entry.newValue && (
                  <p className="text-[13px]" style={{ color: "#1C1E1A", lineHeight: "1.45" }}>
                    {entry.type === 'STATUS_CHANGE'
                      ? `${entry.oldValue || ''} → ${entry.newValue}`
                      : entry.type === 'ASSIGNED' || entry.type === 'UNASSIGNED'
                        ? technicianLabel(entry.newValue || entry.oldValue || "")
                        : entry.newValue}
                  </p>
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

      {odometerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5" style={{ background: "rgba(28,30,26,0.42)" }}>
          <form
            onSubmit={(event) => { event.preventDefault(); handleComplete(); }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="odometer-title"
            style={{ width: "100%", maxWidth: 390, background: "#F2F0EA", border: DIV, boxShadow: "0 14px 40px rgba(28,30,26,0.2)" }}
          >
            <div className="px-5 py-4" style={{ borderBottom: DIV }}>
              <h2 id="odometer-title" className="text-[15px] font-semibold" style={{ fontFamily: UI }}>Complete service</h2>
              <p className="text-[12px] mt-1" style={{ color: MUTED, lineHeight: 1.45 }}>
                We record the vehicle's latest mileage here so future service intervals stay accurate.
              </p>
            </div>
            <div className="px-5 py-4">
              <label htmlFor="odometer-reading" className="block text-[12px] font-medium mb-1.5" style={{ color: MUTED }}>Current odometer reading</label>
              <div className="flex items-center gap-2">
                <input
                  id="odometer-reading"
                  type="number"
                  min={record.vehicle.odometer}
                  value={odometerInput}
                  onChange={(event) => { setOdometerInput(event.target.value); setOdometerError(""); }}
                  autoFocus
                  className="flex-1 text-[13px] px-3 outline-none"
                  style={{ height: 34, border: `1px solid ${odometerError ? "#C4622D" : "#C9C4B4"}`, background: "#F2F0EA", borderRadius: 2, fontFamily: MONO }}
                />
                <span className="text-[12px]" style={{ color: MUTED }}>mi</span>
              </div>
              {odometerError && <p className="text-[12px] mt-1.5" style={{ color: "#C4622D" }}>{odometerError}</p>}
            </div>
            <div className="flex justify-end gap-2 px-5 py-3" style={{ borderTop: DIV }}>
              <button type="button" onClick={() => setOdometerModal(false)} className="text-[12px] px-3" style={{ height: 32, border: DIV, background: "transparent", borderRadius: 2 }}>Cancel</button>
              <button type="submit" className="text-[12px] font-semibold px-3" style={{ height: 32, color: "#F2F0EA", background: "#1C1E1A", borderRadius: 2 }}>Complete service</button>
            </div>
          </form>
        </div>
      )}

      {bookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5" style={{ background: "rgba(28,30,26,0.42)" }}>
          <form
            onSubmit={(event) => { event.preventDefault(); handleBook(); }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-title"
            style={{ width: "100%", maxWidth: 390, background: "#F2F0EA", border: DIV, boxShadow: "0 14px 40px rgba(28,30,26,0.2)" }}
          >
            <div className="px-5 py-4" style={{ borderBottom: DIV }}>
              <h2 id="booking-title" className="text-[15px] font-semibold" style={{ fontFamily: UI }}>Schedule service</h2>
              <p className="text-[12px] mt-1" style={{ color: MUTED, lineHeight: 1.45 }}>
                Select a date for this service to begin.
              </p>
            </div>
            <div className="px-5 py-4">
              <label htmlFor="scheduled-date" className="block text-[12px] font-medium mb-1.5" style={{ color: MUTED }}>Scheduled date</label>
              <input
                id="scheduled-date"
                type="date"
                value={scheduledDateInput}
                onChange={(event) => setScheduledDateInput(event.target.value)}
                autoFocus
                className="w-full text-[13px] px-3 outline-none"
                style={{ height: 34, border: DIV, background: "#F2F0EA", borderRadius: 2, fontFamily: MONO }}
              />
            </div>
            <div className="flex justify-end gap-2 px-5 py-3" style={{ borderTop: DIV }}>
              <button type="button" onClick={() => setBookingModal(false)} className="text-[12px] px-3" style={{ height: 32, border: DIV, background: "transparent", borderRadius: 2 }}>Cancel</button>
              <button type="submit" className="text-[12px] font-semibold px-3" style={{ height: 32, color: "#F2F0EA", background: "#1C1E1A", borderRadius: 2 }}>Book service</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
