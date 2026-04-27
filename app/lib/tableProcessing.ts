
export function parseRange(range: string): { r1: number; c1: number; r2: number; c2: number } | null {
    const m = range.trim().toUpperCase().match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
    if (!m) return null;
    const colIdx = (s: string) => {
      let n = 0;
      for (let i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64);
      return n - 1;
    };
    return { c1: colIdx(m[1]), r1: +m[2] - 1, c2: colIdx(m[3]), r2: +m[4] - 1 };
}

export function sliceRows(rawValues: string[][], range: string | null): string[][] {
    if (!range) return rawValues;
    const p = parseRange(range);
    if (!p) return rawValues;
    return rawValues
      .slice(p.r1, p.r2 + 1)
      .map(row => row.slice(p.c1, p.c2 + 1));
}

