export function nowIso() {
  return new Date().toISOString();
}

export function todayISODate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function uid(): string {
  // Prefer crypto.randomUUID
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function clampInt(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function parseNumberOrNull(value: string): number | null {
  const v = value.trim();
  if (!v) return null;
  const num = Number(v.replace(',', '.'));
  return Number.isFinite(num) ? num : null;
}

export function formatKg(n: number | null | undefined) {
  if (n === null || n === undefined) return '';
  // show up to 2 decimals, trim trailing zeros
  const s = n % 1 === 0 ? String(n) : n.toFixed(2);
  return s.replace(/\.00$/, '').replace(/(\.[0-9])0$/, '$1');
}

export function setVolumeKg(entry: { reps: number | null; weightKg: number | null }) {
  return (entry.reps ?? 0) * (entry.weightKg ?? 0);
}
