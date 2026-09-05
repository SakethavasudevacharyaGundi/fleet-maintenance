import { useState } from "react";
import { api } from "../utils/api";
import { useAuth } from "../contexts/AuthContext";

interface Props {
  vehicle: any | null;
  onClose: (didChange?: boolean) => void;
}

const DIV = "1px solid #C9C4B4";
const MUTED = "#6B6558";
const UI = "'Archivo', sans-serif";

const inputStyle: React.CSSProperties = {
  border: DIV,
  background: "#F2F0EA",
  borderRadius: "2px",
  fontFamily: UI,
  fontSize: "13px",
  color: "#1C1E1A",
  width: "100%",
  height: "34px",
  padding: "0 10px",
  outline: "none",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
};

export default function VehicleDrawer({ vehicle, onClose }: Props) {
  const { isManager } = useAuth();
  const isNew = !vehicle;
  const [reg, setReg] = useState(vehicle?.reg ?? "");
  const [make, setMake] = useState(vehicle?.make ?? "");
  const [model, setModel] = useState(vehicle?.model ?? "");
  const [year, setYear] = useState(String(vehicle?.year ?? new Date().getFullYear()));
  const [odometer, setOdometer] = useState(String(vehicle?.odometer ?? ""));
  const [dateIntervalDays, setDateIntervalDays] = useState(String(vehicle?.dateIntervalDays ?? "180"));
  const [mileageInterval, setMileageInterval] = useState(String(vehicle?.mileageInterval ?? "10000"));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!reg.trim()) { setError("Registration number is required."); return; }
    if (!make.trim()) { setError("Make is required."); return; }
    if (!model.trim()) { setError("Model is required."); return; }
    const odo = parseInt(odometer);
    if (isNaN(odo)) { setError("Odometer is required."); return; }
    if (vehicle && odo < vehicle.odometer) {
      setError(`Odometer reading can't be lower than the vehicle's last recorded reading (${vehicle.odometer.toLocaleString()}).`);
      return;
    }
    const did = parseInt(dateIntervalDays);
    const mid = parseInt(mileageInterval);

    setError("");
    setLoading(true);

    try {
      const payload = {
        registration: reg,
        make,
        model,
        odometer: odo,
        dateIntervalDays: did,
        mileageInterval: mid,
      };

      if (isNew) {
        await api.post("/api/vehicles", payload);
      } else {
        await api.put(`/api/vehicles/${vehicle.id}`, payload);
      }
      onClose(true);
    } catch (err: any) {
      setError(err.message || "Failed to save vehicle");
    } finally {
      setLoading(false);
    }
  }

  function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div>
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: MUTED }}>{label}</label>
        {children}
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/25" onClick={onClose} />
      <div
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col drawer-slide"
        style={{ width: "min(460px, 100vw)", background: "#F2F0EA", borderLeft: DIV }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: DIV }}>
          <h2 className="text-[16px] font-bold" style={{ fontFamily: UI }}>
            {isNew ? "New vehicle" : vehicle.reg}
          </h2>
          <button onClick={onClose} className="text-[18px] hover:opacity-50 transition-opacity" style={{ color: MUTED }} aria-label="Close">✕</button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Registration">
              <input
                type="text"
                value={reg}
                onChange={(e) => setReg(e.target.value)}
                placeholder="TS01AB1234"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#3E5C76")}
                onBlur={(e) => (e.target.style.borderColor = "#C9C4B4")}
                disabled={!isManager}
              />
            </Field>
            <Field label="Service Interval (Days)">
              <input
                type="number"
                value={dateIntervalDays}
                onChange={(e) => setDateIntervalDays(e.target.value)}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#3E5C76")}
                onBlur={(e) => (e.target.style.borderColor = "#C9C4B4")}
                disabled={!isManager}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Make">
              <input type="text" value={make} onChange={(e) => setMake(e.target.value)} placeholder="Tata" style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#3E5C76")} onBlur={(e) => (e.target.style.borderColor = "#C9C4B4")} disabled={!isManager} />
            </Field>
            <Field label="Model">
              <input type="text" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Ace" style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#3E5C76")} onBlur={(e) => (e.target.style.borderColor = "#C9C4B4")} disabled={!isManager} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Year">
              <input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2021" style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#3E5C76")} onBlur={(e) => (e.target.style.borderColor = "#C9C4B4")} disabled={!isManager} />
            </Field>
            <Field label="Odometer (mi)">
              <input type="number" value={odometer} onChange={(e) => setOdometer(e.target.value)} placeholder="84212" style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#3E5C76")} onBlur={(e) => (e.target.style.borderColor = "#C9C4B4")} disabled={!isManager} />
            </Field>
          </div>

          <Field label="Service Interval (Mileage)">
              <input
                type="number"
                value={mileageInterval}
                onChange={(e) => setMileageInterval(e.target.value)}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#3E5C76")}
                onBlur={(e) => (e.target.style.borderColor = "#C9C4B4")}
                disabled={!isManager}
              />
          </Field>

          {error && (
            <p className="text-[12px]" style={{ color: "#C4622D" }}>{error}</p>
          )}
        </form>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-3.5" style={{ borderTop: DIV }}>
          <button
            type="button"
            onClick={() => onClose()}
            className="flex-1 text-[13px] border hover:opacity-70 transition-opacity"
            style={{ border: DIV, borderRadius: "2px", height: "34px", background: "transparent" }}
          >
            {isManager ? "Cancel" : "Close"}
          </button>
          {isManager && (
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 text-[13px] font-semibold hover:opacity-80 transition-opacity disabled:opacity-50"
              style={{ background: "#1C1E1A", color: "#F2F0EA", borderRadius: "2px", height: "34px" }}
            >
              {loading ? "Saving..." : (isNew ? "Add vehicle" : "Save changes")}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
