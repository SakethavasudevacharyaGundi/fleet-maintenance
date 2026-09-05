import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import StatusStamp from "../components/StatusStamp";
import { api } from "../utils/api";

const DIV = "1px solid #C9C4B4";
const MUTED = "#6B6558";
const MONO = "'JetBrains Mono', monospace";
const UI = "'Archivo', sans-serif";

export default function TechnicianProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [technician, setTechnician] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/users/${id}`).then(setTechnician).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6 text-[13px]" style={{ color: MUTED }}>Loading technician profile...</div>;
  if (!technician) return <div className="p-6 text-[13px]" style={{ color: MUTED }}>Technician not found.</div>;

  const records = technician.records ?? [];
  const completed = records.filter((record: any) => record.status === "COMPLETED").length;
  const active = records.filter((record: any) => record.status !== "COMPLETED").length;
  const initials = technician.name.split(" ").map((word: string) => word[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="p-6 max-w-[960px]">
      <button onClick={() => navigate("/dashboard")} className="text-[12px] mb-5" style={{ color: MUTED, fontFamily: MONO }}>
        ← Dashboard
      </button>
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center" style={{ width: 56, height: 56, background: "#3E5C76", color: "#F2F0EA", fontFamily: MONO, fontWeight: 700, fontSize: 18 }}>
            {initials}
          </div>
          <div>
            <h1 className="text-[24px] font-bold" style={{ fontFamily: UI }}>{technician.name}</h1>
            <div className="text-[12px] mt-1" style={{ color: MUTED }}>{technician.email}</div>
          </div>
        </div>
        <span className="text-[12px] font-semibold px-3 py-1" style={{ background: "#E8E4D9", fontFamily: MONO }}>{technician.staffId}</span>
      </div>

      <div className="grid grid-cols-3 mb-6" style={{ borderTop: DIV, borderLeft: DIV }}>
        {[{ label: "Assigned records", value: records.length }, { label: "Active work", value: active }, { label: "Completed", value: completed }].map(item => (
          <div key={item.label} className="px-4 py-3" style={{ borderRight: DIV, borderBottom: DIV }}>
            <div className="text-[11px]" style={{ color: MUTED }}>{item.label}</div>
            <div className="text-[28px] font-bold mt-1" style={{ fontFamily: MONO }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div style={{ border: DIV }}>
        <div className="px-4 py-3 font-semibold text-[13px]" style={{ borderBottom: DIV, fontFamily: UI }}>Assigned service records</div>
        {records.length === 0 && <div className="p-4 text-[13px]" style={{ color: MUTED }}>No records assigned.</div>}
        {records.map((record: any, index: number) => (
          <button key={record.id} onClick={() => navigate(`/records/${record.id}`)} className="w-full text-left flex items-center justify-between px-4 py-3 hover:opacity-75" style={{ background: index % 2 ? "#E8E4D9" : "#F2F0EA", borderBottom: index < records.length - 1 ? DIV : "none" }}>
            <span>
              <span className="block text-[13px] font-semibold" style={{ fontFamily: MONO }}>{record.vehicle.registration}</span>
              <span className="block text-[12px] mt-1" style={{ color: MUTED }}>{record.description}</span>
            </span>
            <StatusStamp status={record.status === "IN_SERVICE" ? "IN SERVICE" : record.status} size="sm" />
          </button>
        ))}
      </div>
    </div>
  );
}