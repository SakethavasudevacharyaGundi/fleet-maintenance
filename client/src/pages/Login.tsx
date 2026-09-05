import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../utils/api";
import { usePageTransition } from "../components/StripedTransition";

const MUTED = "#6B6558";
const MONO  = "'JetBrains Mono', monospace";
const UI    = "'Archivo', sans-serif";
const DIV   = "1px solid #C9C4B4";

/* live IST clock */
function useIST() {
  const fmt = () =>
    new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  const [clock, setClock] = useState(fmt);
  useEffect(() => {
    const id = setInterval(() => setClock(fmt()), 1000);
    return () => clearInterval(id);
  }, []);
  return clock;
}

type Stats = { fleet: number; inService: number; overdue: number; completedYTD: number };

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { trigger } = usePageTransition();
  const clock = useIST();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [stats,    setStats]    = useState<Stats | null>(null);

  useEffect(() => {
    trigger(() => {});
  }, [trigger]);

  // Fetch real public stats on mount
  useEffect(() => {
    fetch("/api/public/stats")
      .then(r => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      login(res.token, res.user);
      trigger(() => navigate("/dashboard"));
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  const snapshot = stats
    ? [
        { label: "Fleet",         value: String(stats.fleet),        sub: "registered vehicles",    warn: false },
        { label: "Overdue",       value: String(stats.overdue),      sub: "need immediate service", warn: stats.overdue > 0 },
        { label: "In service",    value: String(stats.inService),    sub: "in bay right now",       warn: false },
        { label: "Completed YTD", value: String(stats.completedYTD), sub: "service records",        warn: false },
      ]
    : [];

  return (
    <div className="min-h-screen flex" style={{ background: "#F2F0EA" }}>

      {/* Left panel */}
      <div
        className="hidden lg:flex flex-col w-[300px] shrink-0"
        style={{ background: "#1C1E1A", borderRight: "1px solid rgba(201,196,180,0.1)" }}
      >
        {/* Header */}
        <div className="px-6 pt-7 pb-5" style={{ borderBottom: "1px solid rgba(201,196,180,0.1)" }}>
          <div className="text-[10px] mb-1.5 tabular-nums" style={{ color: "rgba(242,240,234,0.35)", fontFamily: MONO }}>
            {clock} IST
          </div>
          <div className="flex items-center gap-2 text-[18px] font-bold tracking-widest" style={{ color: "#F2F0EA", letterSpacing: "0.18em" }}>
            <svg width="23" height="16" viewBox="0 0 21 15" fill="none" aria-hidden="true">
              <path d="M1 2.5h11v8H1zM12 5h4l3 3v2.5h-7zM5 12.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM17 12.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" stroke="#8A9A5B" strokeWidth="1.2" />
            </svg>
            FLEETCO
          </div>
        </div>

        {/* Live snapshot */}
        <div className="flex-1 px-6 pt-5">
          <div className="text-[11px] mb-3" style={{ color: "rgba(242,240,234,0.3)", fontFamily: UI }}>
            {stats ? "Live status" : "Loading status…"}
          </div>
          {snapshot.length > 0 && (
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
          )}
        </div>

        <div className="px-6 pb-6 pt-4">
          <div className="text-[10px] tabular-nums" style={{ color: "rgba(242,240,234,0.2)", fontFamily: MONO }}>
            FleetCo Logistics Pvt Ltd
          </div>
        </div>
      </div>

      {/* Right panel — sign-in form */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div style={{ width: "100%", maxWidth: "340px" }}>
          <div className="lg:hidden mb-8">
            <div className="text-[10px] mb-1 tabular-nums" style={{ color: MUTED, fontFamily: MONO }}>{clock} IST</div>
            <div className="text-[18px] font-bold tracking-widest mb-0.5" style={{ letterSpacing: "0.18em" }}>FLEETCO</div>
          </div>

          <div className="mb-7 login-reveal">
            <h1 className="text-[22px] font-bold mb-1" style={{ fontFamily: UI }}>Sign in</h1>
            <p className="text-[13px]" style={{ color: MUTED }}>
              Sign in to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: MUTED }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full text-[13px] px-3 border outline-none"
                style={{ border: DIV, background: "#F2F0EA", borderRadius: "2px", height: "34px", fontFamily: UI }}
                onFocus={e => (e.target.style.borderColor = "#3E5C76")}
                onBlur={e  => (e.target.style.borderColor = "#C9C4B4")}
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: MUTED }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full text-[13px] px-3 border outline-none"
                style={{ border: DIV, background: "#F2F0EA", borderRadius: "2px", height: "34px", fontFamily: UI }}
                onFocus={e => (e.target.style.borderColor = "#3E5C76")}
                onBlur={e  => (e.target.style.borderColor = "#C9C4B4")}
              />
            </div>

            {error && (
              <p className="text-[12px]" style={{ color: "#C4622D" }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-[13px] font-semibold hover:opacity-80 transition-opacity disabled:opacity-50"
              style={{ background: "#1C1E1A", color: "#F2F0EA", borderRadius: "2px", height: "36px", fontFamily: UI }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
