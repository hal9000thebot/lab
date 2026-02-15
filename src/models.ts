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
  createdAt: string;
  updatedAt: string;
};

export type StoreV1 = {
  version: 1;
  exercises: Exercise[];
  templates: WorkoutTemplate[];
  sessions: WorkoutSession[];
};
