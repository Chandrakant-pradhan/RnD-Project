"use client";

import { useState, useEffect, useRef } from "react";
import Spreadsheet, { PointRange, Selection, CellBase } from "react-spreadsheet";
import { ExternalLink, Grid3X3, ChevronRight, Loader2, X, Check } from "lucide-react";

type CellData = CellBase<string>;
type SheetMatrix = (CellData | undefined)[][];

export interface SheetPreviewProps {
  rawValues: string[][];
  onOpen: (range: string | null) => void;
  sheetName?: string;
  loading?: boolean;
  isOpening?: boolean;
}

function colToLetter(idx: number): string {
  let s = "";
  let n = idx + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function letterToCol(s: string): number {
  s = s.toUpperCase();
  let n = 0;
  for (let i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64);
  return n - 1;
}

function parseRangeStr(v: string): { r1: number; c1: number; r2: number; c2: number } | null {
  const m = v.trim().toUpperCase().match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
  if (!m) return null;
  return { c1: letterToCol(m[1]), r1: +m[2] - 1, c2: letterToCol(m[3]), r2: +m[4] - 1 };
}

function prToStr(pr: PointRange): string {
  return `${colToLetter(pr.start.column)}${pr.start.row + 1}:${colToLetter(pr.end.column)}${pr.end.row + 1}`;
}

function buildMatrix(raw: string[][]): SheetMatrix {
  if (!raw || raw.length === 0) return [[{ value: "", readOnly: true }]];
  const maxCols = Math.max(...raw.map((r) => r.length), 1);
  return raw.map((row) =>
    Array.from({ length: maxCols }, (_, ci) => ({
      value: row[ci] ?? "",
      readOnly: true,
    }))
  );
}


const SHEET_STYLES = `
  .rs-wrap .Spreadsheet {
    font-family: ui-monospace, 'Cascadia Code', 'Fira Code', monospace;
    font-size: 12px;
  }
  .rs-wrap .Spreadsheet__table { border-collapse: collapse; }
  .rs-light .Spreadsheet { background:#fff; color:#1e293b; }
  .rs-light .Spreadsheet__header {
    background:#f1f5f9; color:#475569; border-color:#cbd5e1;
    font-size:11px; font-weight:700; min-width:90px; padding:4px 8px;
  }
  .rs-light .Spreadsheet__cell {
    border-color:#cbd5e1; padding:3px 8px; min-width:90px; white-space:nowrap;
    color:#1e293b; font-weight:500;
  }
  .rs-light .Spreadsheet__cell--selected {
    background:rgba(219,234,254,0.35)!important;
    outline:2px solid #3b82f6!important; outline-offset:-2px;
  }
  .rs-dark .Spreadsheet { background:#1a1d27; color:#e2e8f0; }
  .rs-dark .Spreadsheet__header {
    background:#16181f; color:#6b7280; border-color:rgba(255,255,255,0.07);
    font-size:11px; font-weight:600; min-width:90px; padding:4px 8px;
  }
  .rs-dark .Spreadsheet__cell {
    border-color:rgba(255,255,255,0.07); padding:3px 8px;
    min-width:90px; white-space:nowrap;
  }
  .rs-dark .Spreadsheet__cell--selected {
    background:rgba(16,185,129,0.18)!important;
    outline:2px solid #10b981!important; outline-offset:-2px;
  }
`;


function RangeInput({ value, onChange, onApply, dark }: {
  value: string; onChange: (v: string) => void; onApply: () => void; dark?: boolean;
}) {
  return (
    <div className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 border text-xs font-mono ${
      dark ? "bg-white/5 border-white/10 text-blue-300" : "bg-slate-50 border-blue-200 text-blue-700"
    }`}>
      <span className={dark ? "text-white/30" : "text-slate-400"}>Range:</span>
      <input
        className="bg-transparent outline-none w-28 placeholder:text-slate-400"
        placeholder="A1:Z100"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onApply()}
      />
      <button onClick={onApply} className={`transition-colors ${dark ? "text-white/30 hover:text-white" : "text-slate-400 hover:text-slate-700"}`}>
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function SheetView({ matrix, dark, onRangeChange }: {
  matrix: SheetMatrix; dark?: boolean; onRangeChange: (pr: PointRange | null) => void;
}) {
  return (
    <>
      <style>{SHEET_STYLES}</style>
      <div className={`rs-wrap ${dark ? "rs-dark" : "rs-light"}`}>
        <Spreadsheet
          data={matrix}
          darkMode={!!dark}
          onSelect={(sel: Selection) => onRangeChange(sel.toRange(matrix) ?? null)}
        />
      </div>
    </>
  );
}

function FullModal({ matrix, activeRange, rangeInput, onRangeInput, onApplyRange,
  onRangeChange, onOpen, onClose, isOpening }: {
  matrix: SheetMatrix;
  activeRange: PointRange | null;
  rangeInput: string;
  onRangeInput: (v: string) => void;
  onApplyRange: () => void;
  onRangeChange: (pr: PointRange | null) => void;
  onOpen: () => void;
  onClose: () => void;
  isOpening?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
        <div className="flex items-center gap-3">
          <Grid3X3 className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-semibold text-slate-700">Sheet Preview</span>
          <span className="text-xs text-slate-400 font-mono">full view · drag to select</span>
        </div>
        <div className="flex items-center gap-3">
          <RangeInput value={rangeInput} onChange={onRangeInput} onApply={onApplyRange} />
          <button
            onClick={onOpen}
            disabled={isOpening}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-60 text-white text-xs font-bold tracking-wide transition-all shadow-md hover:shadow-lg"
          >
            {isOpening
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Check className="w-3.5 h-3.5" />}
            {activeRange ? `Open ${rangeInput || prToStr(activeRange)}` : "Open whole sheet"}
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 active:scale-95 text-slate-600 hover:text-slate-800 text-xs font-bold tracking-wide border border-slate-200 hover:border-slate-300 transition-all shadow-sm"
          >
            <X className="w-3.5 h-3.5" />
            Close
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 bg-white">
        <SheetView matrix={matrix} onRangeChange={onRangeChange} />
      </div>

      <div className="px-5 py-2 border-t border-slate-200 bg-slate-50 flex items-center gap-2 shrink-0">
        {activeRange ? (
          <>
            <span className="text-xs text-slate-400">Selected:</span>
            <span className="text-xs font-mono text-blue-600 font-semibold">{prToStr(activeRange)}</span>
            <span className="text-xs text-slate-400">
              ({activeRange.end.row - activeRange.start.row + 1} rows ×{" "}
              {activeRange.end.column - activeRange.start.column + 1} cols)
            </span>
          </>
        ) : (
          <span className="text-xs text-slate-400">No selection — whole sheet will be opened</span>
        )}
      </div>
    </div>
  );
}

export default function SheetPreview({
  rawValues, onOpen, sheetName = "Sheet", loading = false, isOpening = false,
}: SheetPreviewProps) {
  const [matrix, setMatrix]           = useState<SheetMatrix>([[{ value: "", readOnly: true }]]);
  const [activeRange, setActiveRange] = useState<PointRange | null>(null);
  const activeRangeRef                = useRef<PointRange | null>(null); 
  const [rangeInput, setRangeInput]   = useState("");
  const [expanded, setExpanded]       = useState(false);

  useEffect(() => {
    setMatrix(buildMatrix(rawValues));
    setActiveRange(null);
    activeRangeRef.current = null;
    setRangeInput("");
  }, [rawValues]);

  useEffect(() => {
    const onPop = () => setExpanded(false);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  function handleRangeChange(pr: PointRange | null) {
    setActiveRange(pr);
    activeRangeRef.current = pr;
    if (pr) setRangeInput(prToStr(pr));
  }

  function applyRangeInput() {
    if (!rangeInput.trim()) {
      setActiveRange(null);
      activeRangeRef.current = null;
      return;
    }
    const p = parseRangeStr(rangeInput);
    if (!p) return;
    const pr = new PointRange({ row: p.r1, column: p.c1 }, { row: p.r2, column: p.c2 });
    setActiveRange(pr);
    activeRangeRef.current = pr;
    setRangeInput(prToStr(pr));
  }

  function handleOpen() {
    let pr = activeRangeRef.current;
    if (!pr && rangeInput.trim()) {
      const p = parseRangeStr(rangeInput);
      if (p) pr = new PointRange({ row: p.r1, column: p.c1 }, { row: p.r2, column: p.c2 });
    }

    onOpen(pr ? prToStr(pr) : null);
    setExpanded(false);
  }

  function clearSelection() {
    setActiveRange(null);
    setRangeInput("");
  }

  const rangeLabel = activeRange ? prToStr(activeRange) : null;

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 min-w-0">
            <Grid3X3 className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="text-sm font-semibold text-slate-700 truncate">{sheetName}</span>
            {rangeLabel && (
              <span className="shrink-0 text-xs font-mono bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-0.5">
                {rangeLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {rangeLabel && (
              <button onClick={clearSelection} className="text-xs text-slate-400 hover:text-red-500 transition-colors">
                Clear
              </button>
            )}
            <button
              onClick={() => {
                setExpanded(true);
                history.pushState({ modal: 'sheet' }, '');
              }}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Full view
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 flex-wrap">
          <RangeInput value={rangeInput} onChange={setRangeInput} onApply={applyRangeInput} />
          <span className="text-xs text-slate-400">or drag-select in the sheet below</span>
          {!rangeLabel && <span className="ml-auto text-xs text-slate-400 italic">Whole sheet</span>}
        </div>

        <div className="relative overflow-auto" style={{ maxHeight: 300 }}>
          {loading ? (
            <div className="flex items-center justify-center h-48 gap-2 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading preview…</span>
            </div>
          ) : rawValues.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
              No data found in this sheet.
            </div>
          ) : (
            <SheetView matrix={matrix} onRangeChange={handleRangeChange} />
          )}
          {rawValues.length > 0 && !loading && (
            <div
              className="pointer-events-none absolute bottom-0 left-0 right-0 h-8"
              style={{ background: "linear-gradient(to bottom,transparent,rgba(255,255,255,0.95))" }}
            />
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
          <span className="text-xs text-slate-400">
            {rangeLabel ? `Range: ${rangeLabel}` : `${rawValues.length} rows · whole sheet`}
          </span>
          <button
            onClick={handleOpen}
            disabled={isOpening || loading}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold tracking-wide transition-colors shadow-sm"
          >
            {isOpening
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <ChevronRight className="w-3.5 h-3.5" />}
            {rangeLabel ? "Open this range" : "Open whole sheet"}
          </button>
        </div>
      </div>

      {expanded && (
        <FullModal
          matrix={matrix}
          activeRange={activeRange}
          rangeInput={rangeInput}
          onRangeInput={setRangeInput}
          onApplyRange={applyRangeInput}
          onRangeChange={handleRangeChange}
          onOpen={handleOpen}
          onClose={() => history.back()}
          isOpening={isOpening}
        />
      )}
    </>
  );
}