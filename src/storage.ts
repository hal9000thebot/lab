import type { StoreV1 } from './models';
import { nowIso, uid } from './utils';

const KEY = 'hal-lab-workout-store';

export function emptyStore(): StoreV1 {
  return { version: 1, exercises: [], templates: [], sessions: [] };
}

export function loadStore(): StoreV1 {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1) return emptyStore();

    // Defensive: older bugs could create duplicate sessions with the same id.
    // Deduplicate on load by keeping the most recently updated.
    const store = parsed as StoreV1;
    if (Array.isArray(store.sessions)) {
      const byId = new Map<string, StoreV1['sessions'][number]>();
      for (const s of store.sessions) {
        const prev = byId.get(s.id);
        if (!prev) {
          byId.set(s.id, s);
          continue;
        }
        const prevTs = prev.updatedAt || prev.createdAt || '';
        const curTs = s.updatedAt || s.createdAt || '';
        if (curTs.localeCompare(prevTs) >= 0) byId.set(s.id, s);
      }
      return { ...store, sessions: Array.from(byId.values()) };
    }

    return store;
  } catch {
    return emptyStore();
  }
}

export function saveStore(store: StoreV1) {
  localStorage.setItem(KEY, JSON.stringify(store));
}

export function ensureSeed(store: StoreV1): StoreV1 {
  // Lightweight seed if empty, to make first-run less blank.
  if (store.exercises.length || store.templates.length) return store;

  const ts = nowIso();
  const ex = (name: string) => ({ id: uid(), name, createdAt: ts, updatedAt: ts });
  const bench = ex('Barbell bench press');
  const ohp = ex('Dumbbell overhead press');
  const incline = ex('Incline dumbbell press');
  const dips = ex('Weighted dips');
  const lateral = ex('Lateral raises');

  const tId = uid();

  return {
    ...store,
    exercises: [bench, ohp, incline, dips, lateral],
    templates: [
      {
        id: tId,
        name: 'Day1_Push',
        createdAt: ts,
        updatedAt: ts,
        exerciseRows: [
          { id: uid(), exerciseId: bench.id, setsPlanned: 4, targetReps: '6-8' },
          { id: uid(), exerciseId: ohp.id, setsPlanned: 3, targetReps: '6-8' },
          { id: uid(), exerciseId: incline.id, setsPlanned: 3, targetReps: '8-10' },
          { id: uid(), exerciseId: dips.id, setsPlanned: 3, targetReps: '8-10' },
          { id: uid(), exerciseId: lateral.id, setsPlanned: 3, targetReps: '12-15' }
        ]
      }
    ]
  };
}

export function resetStore() {
  localStorage.removeItem(KEY);
}

export { KEY as STORAGE_KEY };
