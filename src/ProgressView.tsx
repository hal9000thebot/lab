import { useMemo, useState } from 'react';
import type { Exercise, WorkoutSession, WorkoutTemplate } from './models';
import { MiniLineChart } from './MiniLineChart';
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
      return { dateISO: s.dateISO, topWeightKg: top.weight, topReps: top.reps, volume: total, sets: e.sets };
    })
    .filter(Boolean) as { dateISO: string; topWeightKg: number; topReps: number; volume: number; sets: WorkoutSession['entries'][number]['sets'] }[];
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

  // (exercise timeline is derived from last10 sessions below)

  const last10Sessions = useMemo(() => selectedSessions.slice(0, 10).reverse(), [selectedSessions]);
  const lastSessionDate = selectedSessions[0]?.dateISO ?? '';

  const workoutVolumePoints = useMemo(
    () =>
      last10Sessions.map(s => ({
        xLabel: s.dateISO.slice(5),
        y: Math.round(totalSessionVolumeKg(s))
      })),
    [last10Sessions]
  );

  const exerciseLast10 = useMemo(() => {
    if (!selectedExerciseId) return [];
    return buildExerciseTimeline(last10Sessions, selectedExerciseId);
  }, [last10Sessions, selectedExerciseId]);

  const exerciseLatest = exerciseLast10[exerciseLast10.length - 1];

  const exTopWeightPoints = useMemo(
    () =>
      exerciseLast10.map(r => ({
        xLabel: r.dateISO.slice(5),
        y: r.topWeightKg || null
      })),
    [exerciseLast10]
  );

  const exVolumePoints = useMemo(
    () =>
      exerciseLast10.map(r => ({
        xLabel: r.dateISO.slice(5),
        y: r.volume ? Math.round(r.volume) : null
      })),
    [exerciseLast10]
  );

  const [viewSession, setViewSession] = useState<WorkoutSession | null>(null);

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
              <div className="kpi"><span className="muted">Last session date</span><strong>{lastSessionDate || '—'}</strong></div>
            </div>
            <div className="card">
              <div className="kpi"><span className="muted">Latest volume</span><strong>{selectedSessions[0] ? Math.round(totalSessionVolumeKg(selectedSessions[0])) : 0}</strong><span className="muted">kg·reps</span></div>
            </div>
            <div className="card">
              <div className="kpi"><span className="muted">Avg volume (last 10)</span><strong>{workoutVolumePoints.length ? Math.round(workoutVolumePoints.reduce((s, p) => s + (p.y ?? 0), 0) / workoutVolumePoints.length) : 0}</strong><span className="muted">kg·reps</span></div>
            </div>
          </div>

          <MiniLineChart label="Total volume (last 10 sessions)" suffix="" points={workoutVolumePoints} />

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

          {exerciseLatest ? (
            <div className="card" style={{ padding: 12 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <strong>Latest workout</strong>
                <span className="badge">{exerciseLatest.dateISO}</span>
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                Total: {Math.round(exerciseLatest.volume)} kg·reps · Top set: {formatKg(exerciseLatest.topWeightKg)}×{exerciseLatest.topReps}
              </div>

              <div className="grid" style={{ marginTop: 10, gap: 8 }}>
                {exerciseLatest.sets.map((s, idx) => (
                  <div key={idx} className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="badge">Set {idx + 1}</span>
                    <span className="muted">{formatKg(s.weightKg)} kg × {s.reps ?? '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="muted">No data yet for this exercise.</div>
          )}

          {exerciseLast10.length > 0 && (
            <div className="grid" style={{ gap: 12 }}>
              <MiniLineChart label="Exercise top weight (last 10)" suffix=" kg" points={exTopWeightPoints} stroke="rgba(20,184,166,0.95)" />
              <MiniLineChart label="Exercise volume (last 10)" suffix="" points={exVolumePoints} stroke="rgba(255,255,255,0.75)" />
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h2>Sessions</h2>
        {selectedSessions.length === 0 ? (
          <div className="muted">No sessions yet. Track one from the Track tab.</div>
        ) : (
          <div className="list" style={{ marginTop: 8 }}>
            {selectedSessions.map(s => (
              <div key={s.id} className="listRow">
                <div>
                  <div className="listTitle">{s.dateISO}</div>
                  <div className="listSub">{Math.round(totalSessionVolumeKg(s))} kg·reps · {s.entries.length} exercises</div>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <button className="iconBtn" onClick={() => setViewSession(s)} aria-label="View session">View</button>
                  <button className="iconBtn" onClick={() => props.onEditSession(s)} aria-label="Edit session">Edit</button>
                  <button
                    className="iconBtn danger"
                    onClick={() => {
                      const ok = confirm('Delete this session? This cannot be undone.');
                      if (ok) props.onDeleteSession(s.id);
                    }}
                    aria-label="Delete session"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {viewSession && (
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0 }}>Session summary</h2>
            <span className="badge">{viewSession.templateName} · {viewSession.dateISO}</span>
          </div>
          <div className="muted" style={{ marginTop: 6 }}>
            Total volume: {Math.round(totalSessionVolumeKg(viewSession))} kg·reps
          </div>

          <div className="grid" style={{ marginTop: 12, gap: 10 }}>
            {viewSession.entries.map(e => (
              <div key={e.exerciseId} className="card" style={{ padding: 12 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <strong>{e.exerciseName}</strong>
                  {e.targetReps ? <span className="badge">Target: {e.targetReps}</span> : null}
                </div>
                <div className="grid" style={{ marginTop: 8, gap: 6 }}>
                  {e.sets.map((s, idx) => (
                    <div key={idx} className="row" style={{ justifyContent: 'space-between' }}>
                      <span className="badge">Set {idx + 1}</span>
                      <span className="muted">{formatKg(s.weightKg)} kg × {s.reps ?? '—'}</span>
                    </div>
                  ))}
                  <div className="muted">Exercise volume: {Math.round(e.sets.reduce((sum, s) => sum + setVolumeKg(s), 0))} kg·reps</div>
                </div>
              </div>
            ))}
          </div>

          <div className="row wrap" style={{ marginTop: 12 }}>
            <button className="primary" onClick={() => { setViewSession(null); }}>Close</button>
            <button onClick={() => { props.onEditSession(viewSession); setViewSession(null); }}>Edit</button>
          </div>
        </div>
      )}
    </div>
  );
}
