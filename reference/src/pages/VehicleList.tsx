import { useState } from "react";
import { VEHICLES, TECHNICIANS, type Vehicle, type VehicleStatus } from "../data/mock";
import StatusStamp from "../components/StatusStamp";
import VehicleDrawer from "./VehicleDrawer";

const PAGE_SIZE = 8;
const statuses: VehicleStatus[] = ["OK", "DUE", "OVERDUE", "IN SERVICE"];

type SortKey = "reg" | "make" | "odometer" | "status" | "nextServiceDue";
type SortDir = "asc" | "desc";

const DIV = "1px solid #C9C4B4";
const MUTED = "#6B6558";
const MONO = "'JetBrains Mono', monospace";
const UI = "'Archivo', sans-serif";

function sortVehicles(vehicles: Vehicle[], key: SortKey, dir: SortDir) {
  return [...vehicles].sort((a, b) => {
    let av: string | number = a[key] as string | number;
    let bv: string | number = b[key] as string | number;
    if (typeof av === "string") av = av.toLowerCase();
    if (typeof bv === "string") bv = bv.toLowerCase();
    return dir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  });
}

export default function VehicleList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [techFilter, setTechFilter] = useState("All technicians");
  const [sortKey, setSortKey] = useState<SortKey>("reg");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  }

  const filtered = VEHICLES.filter((v) => {
    const q = search.toLowerCase();
    if (q && !v.reg.toLowerCase().includes(q) && !v.make.toLowerCase().includes(q) && !v.model.toLowerCase().includes(q)) return false;
    if (statusFilter !== "All statuses" && v.status !== statusFilter) return false;
    if (techFilter !== "All technicians" && v.technician !== techFilter) return false;
    return true;
  });

  const sorted = sortVehicles(filtered, sortKey, sortDir);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page_ = Math.min(page, totalPages);
  const paged = sorted.slice((page_ - 1) * PAGE_SIZE, page_ * PAGE_SIZE);

  function Th({ label, sortK, right }: { label: string; sortK?: SortKey; right?: boolean }) {
    const active = sortKey === sortK;
    return (
      <th
        className="py-0 text-[12px] font-medium select-none"
        style={{
          color: MUTED,
          cursor: sortK ? "pointer" : "default",
          textAlign: right ? "right" : "left",
          paddingLeft: right ? "0" : "16px",
          paddingRight: right ? "16px" : "8px",
          height: "34px",
          whiteSpace: "nowrap",
          fontFamily: UI,
        }}
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
        <h1 className="text-[28px] font-bold" style={{ fontFamily: UI }}>Vehicles</h1>
        <button
          onClick={() => { setEditVehicle(null); setDrawerOpen(true); }}
          className="text-[13px] font-semibold px-4 hover:opacity-80 transition-opacity"
          style={{ background: "#1C1E1A", color: "#F2F0EA", borderRadius: "2px", height: "34px" }}
        >
          + New vehicle
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-3">
        <input
          type="text"
          placeholder="Search reg, make, model…"
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

      {/* Table */}
      <div className="overflow-x-auto" style={{ border: DIV }}>
        <table className="w-full border-collapse" style={{ tableLayout: "fixed", minWidth: "700px" }}>
          <colgroup>
            <col style={{ width: "148px" }} />
            <col />
            <col style={{ width: "120px" }} />
            <col style={{ width: "120px" }} />
            <col style={{ width: "110px" }} />
            <col style={{ width: "106px" }} />
          </colgroup>
          <thead>
            <tr style={{ borderBottom: DIV, background: "#E8E4D9" }}>
              <Th label="Registration" sortK="reg" />
              <Th label="Make / model" sortK="make" />
              <Th label="Odometer" sortK="odometer" right />
              <Th label="Next service" sortK="nextServiceDue" />
              <Th label="Technician" />
              <Th label="Status" sortK="status" />
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-[13px] py-10" style={{ color: MUTED }}>
                  No vehicles match your filters.
                </td>
              </tr>
            )}
            {paged.map((v, i) => {
              const bg = i % 2 === 1 ? "#E8E4D9" : "#F2F0EA";
              return (
                <tr
                  key={v.id}
                  className="cursor-pointer"
                  style={{ borderBottom: DIV, background: bg, height: "36px" }}
                  onClick={() => { setEditVehicle(v); setDrawerOpen(true); }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#DEDAD0")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = bg)}
                >
                  <td className="text-[13px] font-semibold pl-4 pr-2" style={{ fontFamily: MONO }}>{v.reg}</td>
                  <td className="text-[13px] px-2">
                    {v.make} {v.model}
                    <span className="text-[11px] ml-1.5" style={{ color: MUTED }}>{v.year}</span>
                  </td>
                  <td className="text-[13px] pr-4 text-right tabular-nums" style={{ fontFamily: MONO }}>
                    {v.odometer.toLocaleString()}
                  </td>
                  <td className="text-[13px] px-2 tabular-nums" style={{ fontFamily: MONO }}>{v.nextServiceDue}</td>
                  <td className="text-[13px] px-2" style={{ color: MUTED }}>{v.technician}</td>
                  <td className="px-2">
                    <StatusStamp status={v.status} size="sm" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-3">
        <span className="text-[12px] tabular-nums" style={{ color: MUTED, fontFamily: MONO }}>
          {filtered.length} vehicle{filtered.length !== 1 ? "s" : ""}
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

      {drawerOpen && <VehicleDrawer vehicle={editVehicle} onClose={() => setDrawerOpen(false)} />}
    </div>
  );
}
