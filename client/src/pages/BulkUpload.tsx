import { useState, useRef } from "react";
import { api } from "../utils/api";

interface ParsedRow {
  reg: string;
  make: string;
  model: string;
  year: string;
  odometer: string;
  technician: string;
  status: "ok" | "error";
  error?: string;
}

const DIV = "1px solid #C9C4B4";
const MUTED = "#6B6558";
const MONO = "'JetBrains Mono', monospace";
const UI = "'Archivo', sans-serif";

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split("\n");
  const data = lines[0].toLowerCase().startsWith("reg") ? lines.slice(1) : lines;
  return data.filter((l) => l.trim()).map((line) => {
    const parts = line.split(",").map((p) => p.trim());
    const [reg, make, model, year, odometer, technician] = parts;
    const errors: string[] = [];
    if (!reg) errors.push("Missing registration");
    if (!make) errors.push("Missing make");
    if (year && isNaN(Number(year))) errors.push("Invalid year");
    if (odometer && isNaN(Number(odometer))) errors.push("Invalid odometer");
    return { reg: reg ?? "", make: make ?? "", model: model ?? "", year: year ?? "", odometer: odometer ?? "", technician: technician ?? "", status: errors.length > 0 ? "error" : "ok", error: errors.join("; ") };
  });
}

const SAMPLE_CSV = `REG,MAKE,MODEL,YEAR,ODOMETER,TECHNICIAN
TS20AA1111,Tata,Ace,2020,45000,M. Rajan
TS21BB2222,Mahindra,Bolero,2021,62000,P. Venkat
TS22CC3333,Ashok Leyland,Dost,2022,31000,S. Anand
TS23DD4444,,Supro,2023,18000,M. Rajan
TS24EE5555,Tata,407,2024,invalid,P. Venkat`;

export default function BulkUpload() {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileObj, setFileObj] = useState<File | null>(null);
  const [imported, setImported] = useState(false);
  const [importStats, setImportStats] = useState<{succeeded: number, failed: number} | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setFileObj(file);
    setFileName(file.name);
    setImported(false);
    setImportStats(null);
    file.text().then((text) => setRows(parseCSV(text)));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function loadSample() {
    handleFile(new File([SAMPLE_CSV], "sample_fleet.csv"));
  }

  async function handleImport() {
    if (!fileObj) return;

    try {
      const formData = new FormData();
      formData.append("file", fileObj);
      const res = await api.post("/api/vehicles/bulk-odometer", formData, true);

      // Map API response to our local rows
      const updatedRows = [...rows];
      res.rows.forEach((r: any) => {
        const index = r.row - 2;
        if (index >= 0 && index < updatedRows.length) {
          updatedRows[index] = {
            ...updatedRows[index],
            status: r.status === "success" ? "ok" : "error",
            error: r.reason,
          };
        }
      });
      
      setRows(updatedRows);
      setImportStats({ succeeded: res.succeeded, failed: res.failed });
      setImported(true);
    } catch (e: any) {
      alert("Bulk upload failed: " + e.message);
    }
  }

  const okRows = rows.filter((r) => r.status === "ok");
  const errRows = rows.filter((r) => r.status === "error");

  return (
    <div className="p-6 max-w-[800px]">
      <div className="mb-6">
        <h1 className="text-[28px] font-bold mb-1" style={{ fontFamily: UI }}>Bulk upload</h1>
        <p className="text-[13px]" style={{ color: MUTED }}>
          Upload a CSV to register multiple vehicles. Expected columns: REG, MAKE, MODEL, YEAR, ODOMETER, TECHNICIAN.
        </p>
      </div>

      {/* Drop zone */}
      <div
        className="flex flex-col items-center justify-center gap-2 cursor-pointer"
        style={{
          border: dragging ? "2px dashed #3E5C76" : "2px dashed #C9C4B4",
          borderRadius: "2px",
          background: dragging ? "rgba(62,92,118,0.04)" : "#F2F0EA",
          height: "120px",
          marginBottom: "12px",
          transition: "border-color 120ms",
        }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        <span className="text-[13px]" style={{ color: MUTED }}>
          {fileName ? fileName : "Drop CSV here or click to browse"}
        </span>
        {fileName && (
          <span className="text-[11px] tabular-nums" style={{ color: "#3E5C76", fontFamily: MONO }}>{rows.length} rows read</span>
        )}
      </div>

      <button
        onClick={loadSample}
        className="text-[12px] border px-3 mb-6 hover:opacity-70 transition-opacity"
        style={{ border: DIV, borderRadius: "2px", height: "30px", color: MUTED }}
      >
        Load sample CSV
      </button>

      {rows.length > 0 && (
        <>
          {/* Summary strip */}
          <div className="flex gap-0 mb-4" style={{ border: DIV }}>
            <div className="flex-1 px-4 py-2.5" style={{ borderRight: DIV }}>
              <span className="text-[12px]" style={{ color: MUTED }}>Total rows</span>
              <div className="text-[22px] font-bold tabular-nums" style={{ fontFamily: MONO }}>{rows.length}</div>
            </div>
            <div className="flex-1 px-4 py-2.5" style={{ borderRight: DIV }}>
              <span className="text-[12px]" style={{ color: "#8A9A5B" }}>Valid/Succeeded</span>
              <div className="text-[22px] font-bold tabular-nums" style={{ fontFamily: MONO, color: "#8A9A5B" }}>
                {imported && importStats ? importStats.succeeded : okRows.length}
              </div>
            </div>
            <div className="flex-1 px-4 py-2.5">
              <span className="text-[12px]" style={{ color: errRows.length > 0 ? "#C4622D" : MUTED }}>Errors/Failed</span>
              <div className="text-[22px] font-bold tabular-nums" style={{ fontFamily: MONO, color: errRows.length > 0 ? "#C4622D" : MUTED }}>
                {imported && importStats ? importStats.failed : errRows.length}
              </div>
            </div>
          </div>

          {/* Result table */}
          <div className="overflow-x-auto mb-4" style={{ border: DIV }}>
            <table className="w-full border-collapse" style={{ minWidth: "640px" }}>
              <thead>
                <tr style={{ borderBottom: DIV, background: "#E8E4D9" }}>
                  {["#", "Reg", "Make", "Model", "Year", "Odometer", "Technician", "Result"].map((h, ci) => (
                    <th key={h} className="text-left text-[12px] font-medium px-3"
                      style={{ color: MUTED, height: "34px", fontFamily: UI, textAlign: ci >= 5 && ci <= 6 ? "right" : "left" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const rowBg = row.status === "error"
                    ? "rgba(196,98,45,0.07)"
                    : imported ? "rgba(138,154,91,0.07)" : i % 2 === 1 ? "#E8E4D9" : "#F2F0EA";
                  return (
                    <tr key={i} style={{ borderBottom: DIV, background: rowBg, height: "34px" }}>
                      <td className="text-[12px] tabular-nums px-3" style={{ fontFamily: MONO, color: MUTED }}>{i + 1}</td>
                      <td className="text-[13px] font-semibold px-3" style={{ fontFamily: MONO }}>{row.reg || "—"}</td>
                      <td className="text-[13px] px-3">{row.make || "—"}</td>
                      <td className="text-[13px] px-3">{row.model || "—"}</td>
                      <td className="text-[13px] tabular-nums px-3" style={{ fontFamily: MONO }}>{row.year || "—"}</td>
                      <td className="text-[13px] tabular-nums px-3 text-right" style={{ fontFamily: MONO }}>{row.odometer || "—"}</td>
                      <td className="text-[13px] px-3 text-right" style={{ color: MUTED }}>{row.technician || "—"}</td>
                      <td className="text-[12px] px-3" style={{ color: row.status === "error" ? "#C4622D" : "#8A9A5B", fontFamily: MONO }}>
                        {row.status === "error" ? row.error : imported ? "Imported" : "OK"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!imported ? (
            <button
              onClick={handleImport}
              disabled={okRows.length === 0}
              className="text-[13px] font-semibold px-5 hover:opacity-80 disabled:opacity-35 transition-opacity"
              style={{ background: "#1C1E1A", color: "#F2F0EA", borderRadius: "2px", height: "34px" }}
            >
              Import {okRows.length} vehicle{okRows.length !== 1 ? "s" : ""}
            </button>
          ) : (
            <p className="text-[13px] font-medium" style={{ color: "#8A9A5B" }}>
              Import complete. {importStats?.succeeded} succeeded, {importStats?.failed} failed.
            </p>
          )}
        </>
      )}
    </div>
  );
}
