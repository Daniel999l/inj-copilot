// Small, dependency-free formatting helpers used across the UI.

export function fmtNum(n: number | null | undefined, max = 4): string {
  if (n == null || !isFinite(n)) return '—';
  const min = Number.isInteger(n) ? 0 : Math.min(2, max);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  }).format(n);
}

export function fmtUsd(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return '—';
  const max = Math.abs(n) < 1 && n !== 0 ? 4 : 2;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: max,
  }).format(n);
}

export function fmtPct(n: number | null | undefined, digits = 1): string {
  if (n == null || !isFinite(n)) return '—';
  return `${n.toFixed(digits)}%`;
}

export function shorten(s: string, head = 8, tail = 6): string {
  if (!s) return '';
  return s.length <= head + tail + 1 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;
}
