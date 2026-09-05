import { useState } from "react";
import { api } from "../utils/api";

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

export default function TechnicianDrawer({ onClose }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required."); return; }
    if (!email.trim()) { setError("Email is required."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }

    setError("");
    setLoading(true);

    try {
      await api.post("/api/users/technicians", {
        name,
        email,
        password,
      });
      onClose(true);
    } catch (err: any) {
      setError(err.message || "Failed to add technician");
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
            New technician
          </h2>
          <button onClick={() => onClose()} className="text-[18px] hover:opacity-50 transition-opacity" style={{ color: MUTED }} aria-label="Close">✕</button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-5 py-4">
          <Field label="Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jane Doe"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "#3E5C76")}
              onBlur={(e) => (e.target.style.borderColor = "#C9C4B4")}
            />
          </Field>

          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "#3E5C76")}
              onBlur={(e) => (e.target.style.borderColor = "#C9C4B4")}
            />
          </Field>

          <Field label="Password">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "#3E5C76")}
              onBlur={(e) => (e.target.style.borderColor = "#C9C4B4")}
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
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 text-[13px] font-semibold hover:opacity-80 transition-opacity disabled:opacity-50"
            style={{ background: "#1C1E1A", color: "#F2F0EA", borderRadius: "2px", height: "34px" }}
          >
            {loading ? "Saving..." : "Add technician"}
          </button>
        </div>
      </div>
    </>
  );
}
