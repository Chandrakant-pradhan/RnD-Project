"use client";

import { removeEmptyTopRows } from "./removeEmptyRows";

export interface InferenceResult {
  ddl: string;
  rows: string[][];
}

function sanitize(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/^(\d)/, "_$1");
}


function inferTypeFromValue(v: string | null) {
  if (v === "" || v == null) return null;
  const value = String(v).trim();

  if (/^(true|false|yes|no)$/i.test(value))
    return "BOOLEAN";

  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/.test(value))
    return "TIMESTAMP";

  if (/^\d{4}-\d{2}-\d{2}$/.test(value))
    return "DATE";

  if (/^\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(value))
    return "TIME";

  if (/^-?\d+$/.test(value))
    return "INTEGER";

  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(value))
    return "DOUBLE PRECISION";

  return "TEXT";
}

export async function inferTable(
  rows: string[][],
  filename: string
): Promise<InferenceResult>
  {

  const cleanedRows = removeEmptyTopRows(rows);

  if (cleanedRows.length === 0) {
    return {
      ddl: "",
      rows: []
    };
  }

  const headers = cleanedRows[0].map((h: string, i: number) =>
    sanitize(h || `column_${i + 1}`)
  );

  const dataRows = cleanedRows.slice(1);

  const columnTypes: string[] = [];

  for (let col = 0; col < headers.length; col++) {

    let detectedType: string | null = null;

    for (const row of dataRows) {

      const value = row[col];

      const type = inferTypeFromValue(value);

      if (!type) continue;

      if (!detectedType) {
        detectedType = type;
      } else if (detectedType !== type) {
        detectedType = "TEXT";
        break;
      }

    }

    columnTypes[col] = detectedType || "TEXT";

  }

  const columnsDDL = headers.map(
    (name, i) => `${name} ${columnTypes[i]}`
  );

  const ddl = `
CREATE TABLE ${sanitize(filename)} (
  ${columnsDDL.join(",\n  ")}
);
`.trim();

  return {
    ddl,
    rows: cleanedRows
  };
}