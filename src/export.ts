import type { StoreV1, WorkoutSession } from './models';
import { setVolumeKg } from './utils';

export function downloadText(filename: string, text: string, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

export function exportJson(store: StoreV1) {
  const stamp = new Date().toISOString().slice(0, 10);
  downloadText(`workouts-${stamp}.json`, JSON.stringify(store, null, 2), 'application/json');
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function exportSessionsCsv(sessions: WorkoutSession[]) {
  // Row per set.
  const header = [
    'date',
    'template',
    'exercise',
    'setIndex',
    'reps',
    'weightKg',
    'volume'
  ];
  const rows: string[][] = [header];

  for (const s of sessions) {
    for (const e of s.entries) {
      e.sets.forEach((set, idx) => {
        rows.push([
          s.dateISO,
          s.templateName,
          e.exerciseName,
          String(idx + 1),
          set.reps == null ? '' : String(set.reps),
          set.weightKg == null ? '' : String(set.weightKg),
          String(setVolumeKg(set))
        ]);
      });
    }
  }

  const text = rows
    .map(r => r.map(v => csvEscape(v)).join(','))
    .join('\n');

  const stamp = new Date().toISOString().slice(0, 10);
  downloadText(`workout-sessions-${stamp}.csv`, text, 'text/csv');
}
