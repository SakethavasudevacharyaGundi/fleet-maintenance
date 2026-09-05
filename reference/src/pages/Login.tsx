import { useState } from "react";
import { useNavigate } from "react-router";

const DIV = "1px solid #C9C4B4";
const MUTED = "#6B6558";
const MONO = "'JetBrains Mono', monospace";
const UI = "'Archivo', sans-serif";

// Snapshot stats visible before sign-in — dispatch office bulletin
const snapshot = [
  { label: "Fleet", value: "73", sub: "registered vehicles" },
  { label: "Overdue", value: "2", sub: "need immediate service", warn: true },
  { label: "In service", value: "1", sub: "in bay now" },
  { label: "Completed YTD", value: "32", sub: "service records" },
];

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("m.sharma@fleetco.in");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }
    navigate("/dashboard");
  }

  return (
    <div className="min-h-screen flex" style={{ background: "#F2F0EA" }}>

      {/* Left panel — depot bulletin / dispatch status board */}
      <div
        className="hidden lg:flex flex-col w-[320px] shrink-0"
        style={{ background: "#1C1E1A", borderRight: "1px solid rgba(201,196,180,0.1)" }}
      >
        {/* Depot header */}
        <div className="px-6 pt-7 pb-5" style={{ borderBottom: "1px solid rgba(201,196,180,0.1)" }}>
          <div className="text-[11px] mb-1.5" style={{ color: "rgba(242,240,234,0.35)", fontFamily: MONO }}>
            HYD-01 · Sat 05 Sep 2026
          </div>
          <div className="text-[18px] font-bold tracking-widest" style={{ color: "#F2F0EA", letterSpacing: "0.18em" }}>
            FLEET
          </div>
          <div className="text-[12px] mt-0.5" style={{ color: "rgba(242,240,234,0.4)", fontFamily: UI }}>
            Hyderabad depot — Fleet maintenance
          </div>
        </div>

        {/* Live snapshot — read-only, no interaction */}
        <div className="flex-1 px-6 pt-5">
          <div className="text-[11px] mb-3" style={{ color: "rgba(242,240,234,0.3)", fontFamily: UI }}>
            Morning status
          </div>
          <div className="space-y-0" style={{ border: "1px solid rgba(201,196,180,0.1)" }}>
            {snapshot.map((s, i) => (
              <div
                key={s.label}
                className="px-4 py-3"
                style={{
                  borderBottom: i < snapshot.length - 1 ? "1px solid rgba(201,196,180,0.08)" : "none",
                }}
              >
                <div className="text-[11px] mb-0.5" style={{ color: s.warn ? "rgba(196,98,45,0.8)" : "rgba(242,240,234,0.35)", fontFamily: UI }}>
                  {s.label}
                </div>
                <div
                  className="text-[30px] font-bold tabular-nums leading-none"
                  style={{ fontFamily: MONO, color: s.warn ? "#C4622D" : "#F2F0EA" }}
                >
                  {s.value}
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: "rgba(242,240,234,0.28)", fontFamily: UI }}>
                  {s.sub}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Depot footer */}
        <div className="px-6 pb-6 pt-4">
          <div className="text-[10px] tabular-nums" style={{ color: "rgba(242,240,234,0.2)", fontFamily: MONO }}>
            FleetCo Logistics Pvt Ltd
          </div>
        </div>
      </div>

      {/* Right panel — sign-in form */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div style={{ width: "100%", maxWidth: "340px" }}>
          {/* Mobile depot label */}
          <div className="lg:hidden mb-8">
            <div className="text-[18px] font-bold tracking-widest mb-0.5" style={{ letterSpacing: "0.18em" }}>FLEET</div>
            <div className="text-[13px]" style={{ color: MUTED }}>Hyderabad depot</div>
          </div>

          <div className="mb-7">
            <h1 className="text-[22px] font-bold mb-1" style={{ fontFamily: UI }}>Sign in</h1>
            <p className="text-[13px]" style={{ color: MUTED }}>
              Fleet maintenance — HYD-01
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: MUTED }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-[13px] px-3 border outline-none"
                style={{ border: DIV, background: "#F2F0EA", borderRadius: "2px", height: "34px", fontFamily: UI }}
                onFocus={(e) => (e.target.style.borderColor = "#3E5C76")}
                onBlur={(e) => (e.target.style.borderColor = "#C9C4B4")}
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: MUTED }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full text-[13px] px-3 border outline-none"
                style={{ border: DIV, background: "#F2F0EA", borderRadius: "2px", height: "34px", fontFamily: UI }}
                onFocus={(e) => (e.target.style.borderColor = "#3E5C76")}
                onBlur={(e) => (e.target.style.borderColor = "#C9C4B4")}
              />
            </div>

            {error && (
              <p className="text-[12px]" style={{ color: "#C4622D" }}>{error}</p>
            )}

            <button
              type="submit"
              className="w-full text-[13px] font-semibold hover:opacity-80 transition-opacity"
              style={{ background: "#1C1E1A", color: "#F2F0EA", borderRadius: "2px", height: "36px" }}
            >
              Sign in
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
