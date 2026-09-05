import { useState } from "react";
import { useNavigate } from "react-router";
import { SERVICE_RECORDS, TECHNICIANS, type ServiceRecord, type ServiceStatus } from "../data/mock";
import StatusStamp from "../components/StatusStamp";

const PAGE_SIZE = 8;
const statuses: ServiceStatus[] = ["BOOKED", "IN SERVICE", "COMPLETED", "OVERDUE"];

type SortKey = "vehicleReg" | "type" | "status" | "bookedDate" | "technician";
type SortDir = "asc" | "desc";

const DIV = "1px solid #C9C4B4";
const MUTED = "#6B6558";
const MONO = "'JetBrains Mono', monospace";
const UI = "'Archivo', sans-serif";

function sortRecords(records: ServiceRecord[], key: SortKey, dir: SortDir) {
  return [...records].sort((a, b) => {
    const av = (a[key] as string).toLowerCase();
    const bv = (b[key] as string).toLowerCase();
    return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
  });
}

export default function ServiceList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [techFilter, setTechFilter] = useState("All technicians");
  const [sortKey, setSortKey] = useState<SortKey>("bookedDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  }

  const filtered = SERVICE_RECORDS.filter((r) => {
    const q = search.toLowerCase();
    if (q && !r.vehicleReg.toLowerCase().includes(q) && !r.vehicleName.toLowerCase().includes(q) && !r.type.toLowerCase().includes(q)) return false;
    if (statusFilter !== "All statuses" && r.status !== statusFilter) return false;
    if (techFilter !== "All technicians" && r.technician !== techFilter) return false;
    return true;
  });

  const sorted = sortRecords(filtered, sortKey, sortDir);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page_ = Math.min(page, totalPages);
  const paged = sorted.slice((page_ - 1) * PAGE_SIZE, page_ * PAGE_SIZE);

  function Th({ label, sortK }: { label: string; sortK?: SortKey }) {
    const active = sortKey === sortK;
    return (
      <th
        className="text-left text-[12px] font-medium select-none"
        style={{ color: MUTED, cursor: sortK ? "pointer" : "default", padding: "0 8px 0 16px", height: "34px", whiteSpace: "nowrap", fontFamily: UI }}
        onClick={() => sortK && handleSort(sortK)}
      >
        {label}
        {sortK && (
          <span className="ml-1 text-[10px]" style={{ color: active ? "#1C1E1A" : "#C9C4B4" }}>
            {active ? (sortDir === "asc" ? "▴" : "▾") : "▾"}
          </span>
        )}
      </th>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[28px] font-bold" style={{ fontFamily: UI }}>Service records</h1>
        <button
          className="text-[13px] font-semibold px-4 hover:opacity-80 transition-opacity"
          style={{ background: "#1C1E1A", color: "#F2F0EA", borderRadius: "2px", height: "34px" }}
        >
          Book service
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <input
          type="text"
          placeholder="Search reg, vehicle, type…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="text-[13px] px-3 border outline-none"
          style={{ border: DIV, background: "#F2F0EA", borderRadius: "2px", height: "32px", width: "210px", fontFamily: UI }}
          onFocus={(e) => (e.target.style.borderColor = "#3E5C76")}
          onBlur={(e) => (e.target.style.borderColor = "#C9C4B4")}
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="text-[13px] px-3 border outline-none"
          style={{ border: DIV, background: "#F2F0EA", borderRadius: "2px", height: "32px", fontFamily: UI, color: "#1C1E1A" }}
        >
          <option>All statuses</option>
          {statuses.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select
          value={techFilter}
          onChange={(e) => { setTechFilter(e.target.value); setPage(1); }}
          className="text-[13px] px-3 border outline-none"
          style={{ border: DIV, background: "#F2F0EA", borderRadius: "2px", height: "32px", fontFamily: UI, color: "#1C1E1A" }}
        >
          {TECHNICIANS.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto" style={{ border: DIV }}>
        <table className="w-full border-collapse" style={{ minWidth: "680px" }}>
          <thead>
            <tr style={{ borderBottom: DIV, background: "#E8E4D9" }}>
              <Th label="Registration" sortK="vehicleReg" />
              <Th label="Vehicle" />
              <Th label="Service type" sortK="type" />
              <Th label="Booked" sortK="bookedDate" />
              <Th label="Technician" sortK="technician" />
              <Th label="Status" sortK="status" />
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-[13px] py-10" style={{ color: MUTED }}>
                  No records match your filters.
                </td>
              </tr>
            )}
            {paged.map((r, i) => {
              const bg = i % 2 === 1 ? "#E8E4D9" : "#F2F0EA";
              return (
                <tr
                  key={r.id}
                  className="cursor-pointer"
                  style={{ borderBottom: DIV, background: bg, height: "36px" }}
                  onClick={() => navigate(`/records/${r.id}`)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#DEDAD0")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = bg)}
                >
                  <td className="text-[13px] font-semibold pl-4 pr-2" style={{ fontFamily: MONO }}>{r.vehicleReg}</td>
                  <td className="text-[13px] px-2" style={{ color: MUTED }}>{r.vehicleName}</td>
                  <td className="text-[13px] px-2">{r.type}</td>
                  <td className="text-[13px] px-2 tabular-nums" style={{ fontFamily: MONO }}>{r.bookedDate}</td>
                  <td className="text-[13px] px-2" style={{ color: MUTED }}>{r.technician}</td>
                  <td className="px-2">
                    <StatusStamp status={r.status} size="sm" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3">
        <span className="text-[12px] tabular-nums" style={{ color: MUTED, fontFamily: MONO }}>
          {filtered.length} record{filtered.length !== 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-0.5 text-[13px]" style={{ fontFamily: MONO }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page_ <= 1}
            className="px-2 py-0.5 hover:opacity-60 disabled:opacity-25">◂</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)} className="px-2 py-0.5"
              style={{ background: p === page_ ? "#1C1E1A" : "transparent", color: p === page_ ? "#F2F0EA" : "#1C1E1A", borderRadius: "2px" }}>
              {p}
            </button>
          ))}
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page_ >= totalPages}
            className="px-2 py-0.5 hover:opacity-60 disabled:opacity-25">▸</button>
        </div>
      </div>
    </div>
  );
}
