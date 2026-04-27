"use client";

import { useState } from "react";
import { Cloud, Link2, Loader2, Upload, FileSpreadsheet } from "lucide-react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { useToast } from "../components/ToastProvider";
import { removeEmptyTopRows } from "../lib/removeEmptyRows";
import SheetPreview from "../components/SheetPreview";
import {sliceRows} from "../lib/tableProcessing";

interface PreviewState {
  sheets: { name: string; rows: string[][] }[];
  fileId: string;
  activeSheet: number;
}

function extractFileId(input: string): string | null {
  const m = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : null;
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

  async function loadFile(file: File) {
    try {
      setPreview(null);
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheets = workbook.SheetNames.map((name) => {
        const ws = workbook.Sheets[name];
        const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" });
        return { name, rows: rows as string[][] };
      });
      setPreview({ sheets, fileId: "", activeSheet: 0 });
    } catch {
      showToast("Failed to read file", "error");
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
      if (fileId) {
        sessionStorage.setItem("sheetSource", JSON.stringify({ fileId, sheetName: current.name, range: range ?? null }));
      } else {
        sessionStorage.removeItem("sheetSource");
      }
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
    <div className="p-8 max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Cloud className="w-6 h-6 text-blue-600" />
        Connect Sheet
      </h1>

      <div className="flex gap-4 items-stretch">
        <div className="bg-white p-8 rounded-2xl shadow-sm border flex-1">
          <p className="text-base font-semibold text-slate-800 mb-1 flex items-center gap-2">
            <Cloud className="w-5 h-5 text-blue-500" /> Google Sheets
          </p>
          <p className="text-sm text-slate-500 mb-5">
            Paste a link to a public sheet
          </p>

          <div className="space-y-3">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-slate-50">
              <Link2 className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={sheetLink}
                onChange={(e) => setSheetLink(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="https://docs.google.com/spreadsheets/d/..."
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

          <p className="text-xs text-slate-400 mt-5">
            Works with sheets shared as "Anyone with the link".
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-2 select-none">
          <div className="w-px flex-1 bg-slate-200" />
          <span className="text-xs font-medium text-slate-400">or</span>
          <div className="w-px flex-1 bg-slate-200" />
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border flex-1">
          <p className="text-base font-semibold text-slate-800 mb-1 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-500" /> Upload File
          </p>
          <p className="text-sm text-slate-500 mb-5">
            Upload a local .xlsx file directly
          </p>

          <label
            htmlFor="xlsx-upload"
            className="cursor-pointer block bg-white border-2 border-dashed border-slate-300 rounded-xl p-8
                       text-center hover:border-blue-400 hover:bg-slate-50 transition"
          >
            <Upload className="w-10 h-10 text-blue-600 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">
              Click to upload a <span className="font-bold">.xlsx</span> file
            </p>
            <p className="text-sm text-slate-500 mt-1">
              All sheets will be available for preview
            </p>
            <input
              id="xlsx-upload"
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) loadFile(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>

      </div>

      {preview && preview.sheets.length > 1 && (
        <div className="flex gap-2 flex-wrap">
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