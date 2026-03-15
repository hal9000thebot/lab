export type Id = string;

export type Exercise = {
  id: Id;
  name: string;
  notes?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type TemplateExercise = {
  id: Id; // unique per template row
  exerciseId: Id;
  setsPlanned: number;
  targetReps: string; // e.g. "6-8" or "15"
};

export type WorkoutTemplate = {
  id: Id;
  name: string;
  exerciseRows: TemplateExercise[];
  createdAt: string;
  updatedAt: string;
};

export type SetEntry = {
  reps: number | null;
  weightKg: number | null;
};

export type SessionExerciseEntry = {
  exerciseId: Id;
  exerciseName: string; // snapshot
  sets: SetEntry[];
  targetReps?: string;
};

export type WorkoutSession = {
  id: Id;
  dateISO: string; // YYYY-MM-DD
  templateId: Id;
  templateName: string; // snapshot
  entries: SessionExerciseEntry[];
  /** Optional user note for the whole workout */
  comment?: string;
  /** Draft sessions are autosaved but not explicitly finished */
  isDraft?: boolean;

  /** Passive workout time tracking (ms since epoch). Optional for backwards compatibility. */
  sessionStartMs?: number;
  sessionEndMs?: number;
  /** Convenience field: sessionEndMs - sessionStartMs */
  totalDurationMs?: number;

  createdAt: string;
  updatedAt: string;
};

export type StoreV1 = {
  version: 1;
  exercises: Exercise[];
  templates: WorkoutTemplate[];
  sessions: WorkoutSession[];
};

export const FREE_ROAM_TEMPLATE_ID = 'free-roam';
export const FREE_ROAM_TEMPLATE_NAME = 'Free roam';
export const OTHER_TEMPLATES_ID = 'others';
export const OTHER_TEMPLATES_NAME = 'Others';
