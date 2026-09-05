import { useState, useEffect } from "react";
import { api } from "../utils/api";
import { useAuth } from "../contexts/AuthContext";

interface Props {
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

  function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div className="mb-4">
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: MUTED }}>{label}</label>
        {children}
      </div>
    );
  }

export default function ServiceDrawer({ onClose }: Props) {
  const { isManager } = useAuth();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [description, setDescription] = useState("");
  const [becameDueAt, setBecameDueAt] = useState(new Date().toISOString().split("T")[0]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isManager) {
      api.get("/api/vehicles")
        .then((data) => setVehicles(data))
        .catch((err) => console.error("Failed to load vehicles", err));
    }
  }, [isManager]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!vehicleId) { setError("Vehicle is required."); return; }
    if (!description.trim()) { setError("Description is required."); return; }
    if (!becameDueAt) { setError("Due date is required."); return; }

    setError("");
    setLoading(true);

    try {
      await api.post("/api/service-records", {
        vehicleId,
        description,
        becameDueAt,
      });
      onClose(true);
    } catch (err: any) {
      setError(err.message || "Failed to create service record");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/25" onClick={() => onClose()} />
      <div
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col drawer-slide"
        style={{ width: "min(460px, 100vw)", background: "#F2F0EA", borderLeft: DIV }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: DIV }}>
          <h2 className="text-[16px] font-bold" style={{ fontFamily: UI }}>
            Book service
          </h2>
          <button onClick={() => onClose()} className="text-[18px] hover:opacity-50 transition-opacity" style={{ color: MUTED }} aria-label="Close">✕</button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-5 py-4">
          <Field label="Vehicle">
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "#3E5C76")}
              onBlur={(e) => (e.target.style.borderColor = "#C9C4B4")}
              disabled={!isManager}
            >
              <option value="">Select vehicle...</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.registration} — {v.make} {v.model}</option>
              ))}
            </select>
          </Field>

          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="E.g. 10k mile service..."
              style={{ ...inputStyle, height: "80px", paddingTop: "8px", resize: "none" }}
              onFocus={(e) => (e.target.style.borderColor = "#3E5C76")}
              onBlur={(e) => (e.target.style.borderColor = "#C9C4B4")}
              disabled={!isManager}
            />
          </Field>

          <Field label="Became Due At">
            <input
              type="date"
              value={becameDueAt}
              onChange={(e) => setBecameDueAt(e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "#3E5C76")}
              onBlur={(e) => (e.target.style.borderColor = "#C9C4B4")}
              disabled={!isManager}
            />
          </Field>

          {error && (
            <p className="text-[12px] mt-2" style={{ color: "#C4622D" }}>{error}</p>
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
              {loading ? "Saving..." : "Book service"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
