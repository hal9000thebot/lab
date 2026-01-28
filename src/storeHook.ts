import { useEffect, useMemo, useState } from 'react';
import type { Exercise, StoreV1, WorkoutSession, WorkoutTemplate } from './models';
import { ensureSeed, loadStore, saveStore } from './storage';
import { nowIso, uid } from './utils';

export type StoreApi = {
  store: StoreV1;
  setStore: (updater: (s: StoreV1) => StoreV1) => void;
  upsertExercise: (input: { id?: string; name: string; notes?: string }) => void;
  deleteExercise: (exerciseId: string) => void;
  upsertTemplate: (tpl: Omit<WorkoutTemplate, 'createdAt' | 'updatedAt'> & { createdAt?: string }) => void;
  deleteTemplate: (templateId: string) => void;
  addSession: (session: Omit<WorkoutSession, 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  updateSession: (sessionId: string, updater: (s: WorkoutSession) => WorkoutSession) => void;
  deleteSession: (sessionId: string) => void;
  getExerciseById: (id: string) => Exercise | undefined;
  getTemplateById: (id: string) => WorkoutTemplate | undefined;
};

export function useWorkoutStore(): StoreApi {
  const [store, _setStore] = useState<StoreV1>(() => ensureSeed(loadStore()));

  useEffect(() => {
    saveStore(store);
  }, [store]);

  const setStore = (updater: (s: StoreV1) => StoreV1) => {
    _setStore(prev => updater(prev));
  };

  const getExerciseById = (id: string) => store.exercises.find(e => e.id === id);
  const getTemplateById = (id: string) => store.templates.find(t => t.id === id);

  const upsertExercise: StoreApi['upsertExercise'] = ({ id, name, notes }) => {
    const ts = nowIso();
    setStore(s => {
      const existing = id ? s.exercises.find(e => e.id === id) : undefined;
      const next: Exercise = existing
        ? { ...existing, name: name.trim(), notes, updatedAt: ts }
        : { id: uid(), name: name.trim(), notes, createdAt: ts, updatedAt: ts };

      const exercises = existing
        ? s.exercises.map(e => (e.id === next.id ? next : e))
        : [next, ...s.exercises];

      return { ...s, exercises };
    });
  };

  const deleteExercise: StoreApi['deleteExercise'] = exerciseId => {
    setStore(s => {
      // Remove from library; keep sessions intact (they snapshot name).
      // Also remove template rows referencing it.
      const templates = s.templates.map(t => ({
        ...t,
        exerciseRows: t.exerciseRows.filter(r => r.exerciseId !== exerciseId),
        updatedAt: nowIso()
      }));
      return {
        ...s,
        exercises: s.exercises.filter(e => e.id !== exerciseId),
        templates
      };
    });
  };

  const upsertTemplate: StoreApi['upsertTemplate'] = tpl => {
    const ts = nowIso();
    setStore(s => {
      const existing = s.templates.find(t => t.id === tpl.id);
      const next: WorkoutTemplate = existing
        ? { ...existing, ...tpl, updatedAt: ts }
        : {
            ...tpl,
            createdAt: tpl.createdAt ?? ts,
            updatedAt: ts
          };

      const templates = existing
        ? s.templates.map(t => (t.id === next.id ? next : t))
        : [next, ...s.templates];

      return { ...s, templates };
    });
  };

  const deleteTemplate: StoreApi['deleteTemplate'] = templateId => {
    setStore(s => ({
      ...s,
      templates: s.templates.filter(t => t.id !== templateId),
      sessions: s.sessions.filter(ss => ss.templateId !== templateId)
    }));
  };

  const addSession: StoreApi['addSession'] = session => {
    const ts = nowIso();
    setStore(s => ({
      ...s,
      sessions: [
        { ...session, id: session.id ?? uid(), createdAt: ts, updatedAt: ts },
        ...s.sessions
      ]
    }));
  };

  const updateSession: StoreApi['updateSession'] = (sessionId, updater) => {
    setStore(s => ({
      ...s,
      sessions: s.sessions.map(ss => {
        if (ss.id !== sessionId) return ss;
        const next = updater(ss);
        return { ...next, updatedAt: nowIso() };
      })
    }));
  };

  const deleteSession: StoreApi['deleteSession'] = sessionId => {
    setStore(s => ({ ...s, sessions: s.sessions.filter(x => x.id !== sessionId) }));
  };

  // Memoize API object so components can depend safely.
  return useMemo(
    () => ({
      store,
      setStore,
      upsertExercise,
      deleteExercise,
      upsertTemplate,
      deleteTemplate,
      addSession,
      updateSession,
      deleteSession,
      getExerciseById,
      getTemplateById
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store]
  );
}
