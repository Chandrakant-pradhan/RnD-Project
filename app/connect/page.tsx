"use client";

import { useState } from "react";
import { Cloud, Link2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { useToast } from "../components/ToastProvider";
import { removeEmptyTopRows } from "../lib/removeEmptyRows";
import SheetPreview from "../components/SheetPreview";

interface PreviewState {
  sheets: { name: string; rows: string[][] }[];
  fileId: string;
  activeSheet: number;
}

function extractFileId(input: string): string | null {
  const m = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : null;
}

function parseRange(range: string): { r1: number; c1: number; r2: number; c2: number } | null {
  const m = range.trim().toUpperCase().match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
  if (!m) return null;
  const colIdx = (s: string) => {
    let n = 0;
    for (let i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64);
    return n - 1;
  };
  return { c1: colIdx(m[1]), r1: +m[2] - 1, c2: colIdx(m[3]), r2: +m[4] - 1 };
}

function sliceRows(rawValues: string[][], range: string | null): string[][] {
  if (!range) return rawValues;
  const p = parseRange(range);
  if (!p) return rawValues;
  return rawValues
    .slice(p.r1, p.r2 + 1)
    .map(row => row.slice(p.c1, p.c2 + 1));
}

export default function ConnectPage() {
  const [sheetLink, setSheetLink] = useState("");
  const [linkError, setLinkError] = useState("");
  const [fetchingPreview, setFetchingPreview] = useState(false);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [loadingFinal, setLoadingFinal] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  async function loadPreview(fileId: string) {
    try {
      setFetchingPreview(true);
      setLinkError("");
      setPreview(null);

      const res = await fetch(
        `https://docs.google.com/spreadsheets/d/${fileId}/export?format=xlsx`,
        { redirect: "follow" }
      );

      if (!res.ok || res.url.includes("accounts.google.com") || (res.headers.get("content-type") ?? "").includes("text/html")) {
        setLinkError("This sheet is private or doesn't exist. Make sure it's shared as 'Anyone with the link'.");
        return;
      }

      const buffer = await res.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });

      const sheets = workbook.SheetNames.map((name) => {
        const ws = workbook.Sheets[name];
        const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" });
        return { name, rows: removeEmptyTopRows(rows as string[][]) };
      });

      setPreview({ sheets, fileId, activeSheet: 0 });
    } catch {
      showToast("Sheet is not public", "error");
    } finally {
      setFetchingPreview(false);
    }
  }

  async function openSheet(range: string | null) {
    if (!preview) return;
    const { fileId, sheets, activeSheet } = preview;
    try {
      setLoadingFinal(true);

      const current = sheets[activeSheet];
      const rows = sliceRows(removeEmptyTopRows(current.rows), range);
      const name = range ? `${current.name} — ${range}` : current.name;

      sessionStorage.setItem("sheets", JSON.stringify([{ name, rows }]));
      sessionStorage.setItem("sheetSource", JSON.stringify({ fileId, sheetName: current.name, range: range ?? null}));
      router.push("/tables");
    } catch {
      showToast("Error opening sheet", "error");
    } finally {
      setLoadingFinal(false);
    }
  }

  async function handleSubmit() {
    setLinkError("");
    const fileId = extractFileId(sheetLink);
    if (!fileId) {
      setLinkError("Please enter a valid Google Sheets URL.");
      return;
    }
    await loadPreview(fileId);
  }

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Cloud className="w-6 h-6 text-blue-600" />
        Google Sheets
      </h1>

      <div className="bg-white p-6 rounded-2xl shadow-sm border max-w-xl">
        <p className="text-sm text-slate-600 mb-4">
          Paste a Google Sheets link below. This app only reads your sheet in view-only mode and cannot modify or delete any data.
        </p>

        <div className="space-y-3">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-slate-50">
            <Link2 className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={sheetLink}
              onChange={(e) => setSheetLink(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="https://docs.google.com/spreadsheets/d/...?gid=0"
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>

          {linkError && (
            <p className="text-xs text-red-500">{linkError}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={fetchingPreview}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
          >
            {fetchingPreview ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Loading preview…</>
            ) : "Preview Sheet"}
          </button>
        </div>

        <p className="text-xs text-slate-400 mt-4">
          Works with sheets shared as "Anyone with the link".
        </p>
      </div>

      {preview && preview.sheets.length > 1 && (
        <div className="flex gap-2 flex-wrap max-w-xl">
          {preview.sheets.map((sheet, i) => (
            <button
              key={sheet.name}
              onClick={() => setPreview({ ...preview, activeSheet: i })}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                preview.activeSheet === i
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      )}

      {preview && (
        <SheetPreview
          rawValues={preview.sheets[preview.activeSheet].rows}
          onOpen={openSheet}
          sheetName={preview.sheets[preview.activeSheet].name}
          loading={fetchingPreview}
          isOpening={loadingFinal}
        />
      )}
    </div>
  );
}