import { useMemo, useState } from 'react';
import type { Exercise, WorkoutSession, WorkoutTemplate } from './models';
import { formatKg, setVolumeKg } from './utils';

function totalSessionVolumeKg(session: WorkoutSession) {
  return session.entries.reduce((sum, e) => sum + e.sets.reduce((s2, set) => s2 + setVolumeKg(set), 0), 0);
}

function buildExerciseTimeline(sessions: WorkoutSession[], exerciseId: string) {
  return sessions
    .map(s => {
      const e = s.entries.find(x => x.exerciseId === exerciseId);
      if (!e) return null;
      const vols = e.sets.map(setVolumeKg);
      const total = vols.reduce((a, b) => a + b, 0);
      const top = e.sets.reduce(
        (best, cur) => {
          const w = cur.weightKg ?? 0;
          if (w > best.weight) return { weight: w, reps: cur.reps ?? 0 };
          return best;
        },
        { weight: 0, reps: 0 }
      );
      return { dateISO: s.dateISO, topWeightKg: top.weight, topReps: top.reps, volume: total };
    })
    .filter(Boolean) as { dateISO: string; topWeightKg: number; topReps: number; volume: number }[];
}

export function ProgressView(props: {
  templates: WorkoutTemplate[];
  sessionsByTemplate: Map<string, WorkoutSession[]>;
  exercisesById: Map<string, Exercise>;
  getTemplateById: (id: string) => WorkoutTemplate | undefined;
  onEditSession: (session: WorkoutSession) => void;
  onDeleteSession: (sessionId: string) => void;
}) {
  const { templates, sessionsByTemplate, exercisesById } = props;

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => templates[0]?.id ?? '');
  const selectedSessions = sessionsByTemplate.get(selectedTemplateId) ?? [];
  const selectedTemplate = props.getTemplateById(selectedTemplateId);

  const templateExercises: Exercise[] = useMemo(() => {
    if (!selectedTemplate) return [];
    const ids = Array.from(new Set(selectedTemplate.exerciseRows.map(r => r.exerciseId)));
    return ids.map(id => exercisesById.get(id)).filter(Boolean) as Exercise[];
  }, [selectedTemplate, exercisesById]);

  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(() => templateExercises[0]?.id ?? '');

  // Keep selected exercise valid when switching templates.
  useMemo(() => {
    if (!selectedExerciseId && templateExercises[0]?.id) setSelectedExerciseId(templateExercises[0].id);
    if (selectedExerciseId && !templateExercises.some(e => e.id === selectedExerciseId)) {
      setSelectedExerciseId(templateExercises[0]?.id ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplateId, templateExercises.map(e => e.id).join('|')]);

  const exerciseTimeline = useMemo(
    () => (selectedExerciseId ? buildExerciseTimeline(selectedSessions, selectedExerciseId) : []),
    [selectedSessions, selectedExerciseId]
  );

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="card">
        <h1>Progress</h1>
        <div className="grid" style={{ gap: 10 }}>
          <div>
            <div className="muted">Workout template</div>
            <select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)}>
              {templates.length === 0 ? (
                <option value="">No templates</option>
              ) : (
                templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))
              )}
            </select>
          </div>

          <div className="grid two">
            <div className="card">
              <div className="kpi"><span className="muted">Sessions</span><strong>{selectedSessions.length}</strong></div>
            </div>
            <div className="card">
              <div className="kpi"><span className="muted">Latest volume</span><strong>{selectedSessions[0] ? Math.round(totalSessionVolumeKg(selectedSessions[0])) : 0}</strong><span className="muted">kg·reps</span></div>
            </div>
          </div>

          <div>
            <div className="muted">Exercise</div>
            <select value={selectedExerciseId} onChange={e => setSelectedExerciseId(e.target.value)}>
              {templateExercises.length === 0 ? (
                <option value="">No exercises</option>
              ) : (
                templateExercises.map(ex => (
                  <option key={ex.id} value={ex.id}>{ex.name}</option>
                ))
              )}
            </select>
          </div>

          {exerciseTimeline.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Top set</th>
                  <th>Exercise volume</th>
                </tr>
              </thead>
              <tbody>
                {exerciseTimeline.map(row => (
                  <tr key={row.dateISO}>
                    <td>{row.dateISO}</td>
                    <td>{formatKg(row.topWeightKg)} kg × {row.topReps}</td>
                    <td>{Math.round(row.volume)} kg·reps</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="muted">No data yet for this exercise.</div>
          )}
        </div>
      </div>

      <div className="card">
        <h2>Sessions</h2>
        {selectedSessions.length === 0 ? (
          <div className="muted">No sessions yet. Track one from the Track tab.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Volume</th>
                <th style={{ width: 160 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {selectedSessions.map(s => (
                <tr key={s.id}>
                  <td>{s.dateISO}</td>
                  <td>{Math.round(totalSessionVolumeKg(s))} kg·reps</td>
                  <td>
                    <div className="row">
                      <button onClick={() => props.onEditSession(s)}>Edit</button>
                      <button className="danger" onClick={() => props.onDeleteSession(s.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
