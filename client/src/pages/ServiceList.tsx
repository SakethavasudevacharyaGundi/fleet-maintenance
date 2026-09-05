import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { type ServiceStatus } from "../data/mock";
import StatusStamp from "../components/StatusStamp";
import { api } from "../utils/api";
import { useAuth } from "../contexts/AuthContext";
import ServiceDrawer from "./ServiceDrawer";

const PAGE_SIZE = 8;
const statuses: ServiceStatus[] = ["BOOKED", "IN SERVICE", "COMPLETED", "OVERDUE", "DUE"];

type SortKey = "createdAt" | "description" | "status" | "scheduledDate";
type SortDir = "asc" | "desc";

const DIV = "1px solid #C9C4B4";
const MUTED = "#6B6558";
const MONO = "'JetBrains Mono', monospace";
const UI = "'Archivo', sans-serif";

export default function ServiceList() {
  const navigate = useNavigate();
  const { isManager } = useAuth();
  
  const [records, setRecords] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [techniciansList, setTechniciansList] = useState<any[]>([]);
  const [techFilter, setTechFilter] = useState("All technicians");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const endpoint = isManager ? "/api/service-records" : "/api/service-records/mine";
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: PAGE_SIZE.toString(),
        sort: sortKey,
        order: sortDir,
      });
      if (search) params.set("q", search);
      if (statusFilter !== "All statuses") params.set("status", statusFilter === "IN SERVICE" ? "IN_SERVICE" : statusFilter);
      if (techFilter !== "All technicians") params.set("technicianId", techFilter);

      const res = await api.get(`${endpoint}?${params.toString()}`);
      setRecords(res.data);
      setTotalCount(res.pagination.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicians = async () => {
    try {
      if (isManager) {
        setTechniciansList(await api.get("/api/users/technicians"));
      }
    } catch(e) {}
  };

  useEffect(() => {
    fetchRecords();
  }, [page, search, statusFilter, techFilter, sortKey, sortDir, isManager]);

  useEffect(() => {
    fetchTechnicians();
  }, [isManager]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const page_ = Math.min(page, totalPages);

  const handleExport = async () => {
    try {
      const endpoint = "/api/service-records/export.csv";
      const params = new URLSearchParams({
        sort: sortKey,
        order: sortDir,
      });
      if (search) params.set("q", search);
      if (statusFilter !== "All statuses") params.set("status", statusFilter === "IN SERVICE" ? "IN_SERVICE" : statusFilter);
      if (techFilter !== "All technicians") params.set("technicianId", techFilter);

      const token = localStorage.getItem('token');
      const res = await fetch(`${endpoint}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Export failed");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `service_records_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message);
    }
  };

  function Th({ label, sortK }: { label: string; sortK?: SortKey }) {
    const active = sortKey === sortK;
    return (
      <th
        className="text-left text-[12px] font-medium select-none"
        style={{ color: MUTED, cursor: sortK ? "pointer" : "default", padding: "0 8px 0 16px", height: "34px", whiteSpace: "nowrap", fontFamily: UI }}
        onClick={() => {
          if (sortK) {
            if (sortKey === sortK) setSortDir(sortDir === "asc" ? "desc" : "asc");
            else { setSortKey(sortK); setSortDir("asc"); }
            setPage(1);
          }
        }}
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
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="text-[13px] border px-4 hover:opacity-80 transition-opacity"
            style={{ border: DIV, borderRadius: "2px", height: "34px", color: MUTED }}
          >
            Export CSV
          </button>
          {isManager && (
            <button
              onClick={() => setDrawerOpen(true)}
              className="text-[13px] font-semibold px-4 hover:opacity-80 transition-opacity"
              style={{ background: "#1C1E1A", color: "#F2F0EA", borderRadius: "2px", height: "34px" }}
            >
              Book service
            </button>
          )}
        </div>
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
        {isManager && (
          <select
            value={techFilter}
            onChange={(e) => { setTechFilter(e.target.value); setPage(1); }}
            className="text-[13px] px-3 border outline-none"
            style={{ border: DIV, background: "#F2F0EA", borderRadius: "2px", height: "32px", fontFamily: UI, color: "#1C1E1A" }}
          >
            <option>All technicians</option>
            {techniciansList.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.staffId}</option>)}
          </select>
        )}
      </div>

      {loading && <div className="mb-4 text-[13px]" style={{ color: MUTED }}>Loading service records...</div>}

      <div className="overflow-x-auto" style={{ border: DIV }}>
        <table className="w-full border-collapse" style={{ minWidth: "680px" }}>
          <thead>
            <tr style={{ borderBottom: DIV, background: "#E8E4D9" }}>
              <Th label="Registration" />
              <Th label="Vehicle" />
              <Th label="Service type" sortK="description" />
              <Th label="Booked" sortK="scheduledDate" />
              <Th label="Technician" />
              <Th label="Status" sortK="status" />
            </tr>
          </thead>
          <tbody>
            {!loading && records.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-[13px] py-10" style={{ color: MUTED }}>
                  No records match your filters.
                </td>
              </tr>
            )}
            {records.map((r: any, i: number) => {
              const bg = i % 2 === 1 ? "#E8E4D9" : "#F2F0EA";
              
              const technicianNames = r.assignments && r.assignments.length > 0
                ? r.assignments.map((a: any) => a.technician?.name || "Assigned technician").join(', ')
                : "Unassigned";

              let statusDisplay = r.status;
              if (r.status === "IN_SERVICE") statusDisplay = "IN SERVICE";

              return (
                <tr
                  key={r.id}
                  className="cursor-pointer"
                  style={{ borderBottom: DIV, background: bg, height: "36px" }}
                  onClick={() => navigate(`/records/${r.id}`)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#DEDAD0")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = bg)}
                >
                  <td className="text-[13px] font-semibold pl-4 pr-2" style={{ fontFamily: MONO }}>{r.vehicle?.registration}</td>
                  <td className="text-[13px] px-2" style={{ color: MUTED }}>{r.vehicle?.make} {r.vehicle?.model}</td>
                  <td className="text-[13px] px-2">{r.description}</td>
                  <td className="text-[13px] px-2 tabular-nums" style={{ fontFamily: MONO }}>
                    {r.scheduledDate ? new Date(r.scheduledDate).toLocaleDateString() : "TBD"}
                  </td>
                  <td className="text-[13px] px-2" style={{ color: MUTED }}>{technicianNames}</td>
                  <td className="px-2">
                    <StatusStamp status={statusDisplay} size="sm" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3">
        <span className="text-[12px] tabular-nums" style={{ color: MUTED, fontFamily: MONO }}>
          {totalCount} record{totalCount !== 1 ? "s" : ""}
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

      {drawerOpen && (
        <ServiceDrawer
          onClose={(didChange) => {
            setDrawerOpen(false);
            if (didChange === true) {
              fetchRecords();
            }
          }}
        />
      )}
    </div>
  );
}
