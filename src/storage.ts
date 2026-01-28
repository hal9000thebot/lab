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
    return parsed as StoreV1;
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
