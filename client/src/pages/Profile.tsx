import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router";
import { api } from "../utils/api";
import StatusStamp from "../components/StatusStamp";

/* ── design tokens ─────────────────────────────────────── */
const B    = "1px solid #C9C4B4";
const MUTED = "#6B6558";
const MONO  = "'JetBrains Mono', monospace";
const UI    = "'Archivo', sans-serif";
const CREAM = "#F2F0EA";
const DARK  = "#1C1E1A";
const TINTED = "#E8E4D9";

const TAG_COLORS: Record<string, { bg: string }> = {
  Manager:    { bg: DARK },
  "Tech A":   { bg: "#3E5C76" },
  "Tech B":   { bg: "#5B7A4E" },
  "Tech C":   { bg: "#7A5B4E" },
  Technician: { bg: "#6B6558" },
};

type Rec = {
  id: string;
  description: string;
  status: string;
  scheduledDate: string | null;
  vehicle: { registration: string };
};

/* ── mini donut ─────────────────────────────────────────── */
function Donut({ value, total, color }: { value: number; total: number; color: string }) {
  const SIZE = 64, STROKE = 7;
  const r    = (SIZE - STROKE) / 2;
  const circ = 2 * Math.PI * r;
  const pct  = total > 0 ? Math.min(value / total, 1) : 0;
  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      <circle cx={SIZE/2} cy={SIZE/2} r={r} fill="none" stroke={TINTED} strokeWidth={STROKE} />
      <circle
        cx={SIZE/2} cy={SIZE/2} r={r} fill="none"
        stroke={color} strokeWidth={STROKE}
        strokeDasharray={`${circ * pct} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${SIZE/2} ${SIZE/2})`}
        style={{ transition: "stroke-dasharray 0.5s ease" }}
      />
      <text x="50%" y="52%" dominantBaseline="middle" textAnchor="middle"
        style={{ fontSize: 15, fontFamily: MONO, fontWeight: 700, fill: DARK }}>
        {value}
      </text>
    </svg>
  );
}

/* ── page ─────────────────────────────────────────────────── */
export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState<Rec[]>([]);
  const [stats, setStats]     = useState({ total: 0, completed: 0, inService: 0, booked: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<"records" | "permissions">("records");

  useEffect(() => {
    if (!user) return;
    const ep = user.role === "MANAGER"
      ? "/api/service-records?pageSize=50"
      : "/api/service-records/mine?pageSize=50";
    api.get(ep)
      .then((res: any) => {
        const data: Rec[] = res.data ?? res;
        setRecords(data.slice(0, 8));
        setStats({
          total:     data.length,
          completed: data.filter(r => r.status === "COMPLETED").length,
          inService: data.filter(r => r.status === "IN_SERVICE").length,
          booked:    data.filter(r => r.status === "BOOKED").length,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  const initials  = user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const tagBg     = (TAG_COLORS[user.tag] ?? TAG_COLORS["Technician"]).bg;

  const PERMS = [
    { label: "View all vehicles",         allowed: user.role === "MANAGER" },
    { label: "Book service",              allowed: user.role === "MANAGER" },
    { label: "Start / complete service",  allowed: true },
    { label: "Dismiss overdue alerts",    allowed: user.role === "MANAGER" },
    { label: "Bulk odometer upload",      allowed: user.role === "MANAGER" },
    { label: "Export service CSV",        allowed: user.role === "MANAGER" },
  ];

  return (
    /* full-height scroll container */
    <div style={{ padding: "28px 28px 40px", minHeight: "100%", background: CREAM }}>

      {/* ── page title row ─────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: UI, color: DARK, margin: 0 }}>
          User details
        </h1>
      </div>

      {/* ── body: left card + right panel side by side ──────── */}
      <div className="profile-body" style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>

        {/* ════ LEFT CARD ═══════════════════════════════════════ */}
        <div className="profile-card" style={{
          width: 230, flexShrink: 0,
          border: B,
          display: "flex", flexDirection: "column",
          background: CREAM,
        }}>
          {/* avatar area */}
          <div style={{
            background: tagBg,
            padding: "28px 20px 22px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 76, height: 76, borderRadius: "50%",
              background: "rgba(255,255,255,0.14)",
              border: "2px solid rgba(255,255,255,0.28)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 26, fontFamily: MONO, fontWeight: 700, color: CREAM,
            }}>
              {initials}
            </div>

            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: UI, color: CREAM, lineHeight: 1.3 }}>
                {user.name}
              </div>
              <div style={{ fontSize: 11, fontFamily: UI, color: "rgba(242,240,234,0.5)", marginTop: 3 }}>
                {user.email}
              </div>
            </div>

            {/* tag badge */}
            <div style={{
              fontSize: 10, fontFamily: MONO, fontWeight: 700, letterSpacing: "0.1em",
              color: CREAM,
              background: "rgba(255,255,255,0.16)",
              border: "1px solid rgba(255,255,255,0.22)",
              padding: "3px 10px",
            }}>
              {user.tag.toUpperCase()}
            </div>
          </div>

          {/* ── detail rows ── */}
          {[
            { label: "Email",   value: user.email,                                                      mono: true  },
            { label: "Fleet",   value: "FleetCo operations",                                            mono: false },
            { label: "Role",    value: user.role === "MANAGER" ? "Fleet Manager" : "Field Technician", mono: false },
            { label: "ID",      value: user.role === "MANAGER" ? "MGR-01" : `TECH-${user.email.match(/tech([a-j])/i)?.[1]?.toUpperCase() ?? "STAFF"}`, mono: true },
          ].map(({ label, value, mono }, i, arr) => (
            <div key={label} style={{
              padding: "10px 16px",
              borderBottom: i < arr.length - 1 ? B : "none",
            }}>
              <div style={{ fontSize: 10, fontFamily: UI, color: MUTED, marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {label}
              </div>
              <div style={{
                fontSize: 12,
                fontFamily: mono ? MONO : UI,
                color: DARK,
                wordBreak: "break-all",
                lineHeight: 1.4,
              }}>
                {value}
              </div>
            </div>
          ))}

          {/* sign-out — anchored to bottom of card */}
          <div style={{ marginTop: "auto", borderTop: B, padding: "12px 16px" }}>
            <button
              onClick={() => { logout(); navigate("/"); }}
              style={{
                width: "100%", height: 32,
                background: DARK, color: CREAM,
                fontSize: 12, fontFamily: UI, fontWeight: 600,
                border: "none", cursor: "pointer", letterSpacing: "0.02em",
              }}
              className="hover:opacity-75 transition-opacity"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* ════ RIGHT PANEL ══════════════════════════════════════ */}
        <div className="profile-panel" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 0, border: B }}>

          {/* stat strip */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4,1fr)",
            borderBottom: B,
          }}>
            {[
              { label: "Total",      value: stats.total,     color: DARK        },
              { label: "Completed",  value: stats.completed, color: "#5B7A4E"   },
              { label: "In service", value: stats.inService, color: "#3E5C76"   },
              { label: "Booked",     value: stats.booked,    color: "#7A5B4E"   },
            ].map(({ label, value, color }, i) => (
              <div key={label} style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                padding: "18px 10px 14px",
                borderRight: i < 3 ? B : "none",
                gap: 8,
              }}>
                <Donut value={value} total={Math.max(stats.total, 1)} color={color} />
                <span style={{ fontSize: 11, fontFamily: UI, color: MUTED, textAlign: "center" }}>
                  {label} records
                </span>
              </div>
            ))}
          </div>

          {/* tabs */}
          <div style={{
            display: "flex", gap: 0,
            borderBottom: B,
            background: TINTED,
          }}>
            {(["records", "permissions"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: "0 20px", height: 38,
                  fontFamily: UI,
                  fontSize: 13,
                  fontWeight: tab === t ? 600 : 400,
                  color: tab === t ? DARK : MUTED,
                  background: "transparent",
                  border: "none",
                  borderBottom: tab === t ? `2px solid ${DARK}` : "2px solid transparent",
                  cursor: "pointer",
                  letterSpacing: "0.01em",
                }}
              >
                {t === "records" ? "Service records" : "Permissions"}
              </button>
            ))}
          </div>

          {/* ── Records tab ── */}
          {tab === "records" && (
            loading
              ? <div style={{ padding: 20, fontSize: 13, fontFamily: UI, color: MUTED }}>Loading…</div>
              : records.length === 0
                ? <div style={{ padding: 20, fontSize: 13, fontFamily: UI, color: MUTED }}>No records found.</div>
                : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: B, background: TINTED }}>
                        {["Vehicle", "Description", "Status", "Scheduled"].map(h => (
                          <th key={h} style={{
                            padding: "8px 16px",
                            textAlign: "left",
                            fontSize: 11,
                            fontFamily: UI,
                            fontWeight: 500,
                            color: MUTED,
                            whiteSpace: "nowrap",
                          }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r, i) => (
                        <tr
                          key={r.id}
                          onClick={() => navigate(`/records/${r.id}`)}
                          style={{
                            borderBottom: i < records.length - 1 ? B : "none",
                            background: i % 2 === 1 ? TINTED : CREAM,
                            cursor: "pointer",
                          }}
                          className="hover:opacity-80 transition-opacity"
                        >
                          <td style={{
                            padding: "10px 16px",
                            fontSize: 12, fontFamily: MONO,
                            color: DARK, whiteSpace: "nowrap",
                          }}>
                            {r.vehicle.registration}
                          </td>
                          <td style={{
                            padding: "10px 16px",
                            fontSize: 12, fontFamily: UI,
                            color: DARK, maxWidth: 220,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {r.description}
                          </td>
                          <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>
                            <StatusStamp status={r.status} size="sm" />
                          </td>
                          <td style={{
                            padding: "10px 16px",
                            fontSize: 12, fontFamily: MONO,
                            color: MUTED, whiteSpace: "nowrap",
                          }}>
                            {r.scheduledDate
                              ? new Date(r.scheduledDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
          )}

          {/* ── Permissions tab ── */}
          {tab === "permissions" && (
            <div>
              {PERMS.map(({ label, allowed }, i) => (
                <div key={label} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "11px 16px",
                  borderBottom: i < PERMS.length - 1 ? B : "none",
                  background: i % 2 === 1 ? TINTED : CREAM,
                }}>
                  <span style={{ fontSize: 13, fontFamily: UI, color: DARK }}>{label}</span>
                  <span style={{
                    fontSize: 11, fontFamily: MONO, fontWeight: 600,
                    color: allowed ? "#5B7A4E" : "#C4622D",
                  }}>
                    {allowed ? "✓ Allowed" : "✗ Restricted"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
