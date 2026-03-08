"use client";

export function removeEmptyTopRows(rows: string[][]): string[][] {

  let start = 0;

  while (
    start < rows.length &&
    rows[start].every(c => c === "" || c == null)
  ) {
    start++;
  }

  return rows.slice(start);
}