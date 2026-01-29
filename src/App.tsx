import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import { GymBroLogo } from './GymBroLogo';
import type { WorkoutSession, WorkoutTemplate } from './models';
import { exportJson, exportSessionsCsv } from './export';
import { ProgressView } from './ProgressView';
import { useWorkoutStore } from './storeHook';
import { clampInt, formatKg, nowIso, parseNumberOrNull, setVolumeKg, todayISODate, uid } from './utils';

import {
  Dumbbell,
  ListTodo,
  Rows3,
  TrendingUp,
  Download,
  Pencil,
  Trash2
} from 'lucide-react';

const TABS = ['Track', 'Templates', 'Exercises', 'Progress', 'Export'] as const;
type Tab = (typeof TABS)[number];

const TAB_META: Record<Tab, { label: string; Icon: typeof Dumbbell }> = {
  Track: { label: 'Track', Icon: Dumbbell },
  Templates: { label: 'Templates', Icon: ListTodo },
  Exercises: { label: 'Exercises', Icon: Rows3 },
  Progress: { label: 'Progress', Icon: TrendingUp },
  Export: { label: 'Export', Icon: Download }
};

function sortByName<T extends { name: string }>(items: T[]) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

function findLastSessionForTemplate(sessions: WorkoutSession[], templateId: string) {
  return sessions
    .filter(s => s.templateId === templateId)
    .sort((a, b) => b.dateISO.localeCompare(a.dateISO))[0];
}

type DraftSetEntry = { reps: string; weightKg: string };
type DraftExerciseEntry = {
  exerciseId: string;
  exerciseName: string;
  targetReps: string;
  sets: DraftSetEntry[];
};
type DraftSession = {
  id: string;
  dateISO: string;
  templateId: string;
  templateName: string;
  entries: DraftExerciseEntry[];
  createdAt: string;
  updatedAt: string;
};

function App() {
  const api = useWorkoutStore();
  const { store } = api;

  const [tab, setTab] = useState<Tab>('Track');

  // Track state
  const [activeTemplateId, setActiveTemplateId] = useState<string>(() => store.templates[0]?.id ?? '');
  const activeTemplate = api.getTemplateById(activeTemplateId);

  const [sessionDraft, setSessionDraft] = useState<DraftSession | null>(null);
  const [trackDate, setTrackDate] = useState(todayISODate());

  const exercisesById = useMemo(() => new Map(store.exercises.map(e => [e.id, e])), [store.exercises]);

  // Editing state for exercises
  const [exerciseForm, setExerciseForm] = useState<{ id?: string; name: string; notes?: string }>({ name: '' });

  // Editing state for templates
  const [templateEditor, setTemplateEditor] = useState<{
    id?: string;
    name: string;
    rows: { id: string; exerciseId: string; setsPlanned: number; targetReps: string }[];
  }>({ name: '', rows: [] });

  const templatesSorted = useMemo(() => sortByName(store.templates), [store.templates]);
  const exercisesSorted = useMemo(() => sortByName(store.exercises), [store.exercises]);

  // If store changes (e.g. after Import), ensure we have a valid selected template.
  useEffect(() => {
    if (store.templates.length === 0) {
      if (activeTemplateId) setActiveTemplateId('');
      return;
    }
    const exists = store.templates.some(t => t.id === activeTemplateId);
    if (!exists) setActiveTemplateId(store.templates[0]!.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.templates.length, store.templates.map(t => t.id).join('|')]);

  const sessionsByTemplate = useMemo(() => {
    const m = new Map<string, WorkoutSession[]>();
    for (const s of store.sessions) {
      if (!m.has(s.templateId)) m.set(s.templateId, []);
      m.get(s.templateId)!.push(s);
    }
    for (const [, arr] of m) arr.sort((a, b) => b.dateISO.localeCompare(a.dateISO));
    return m;
  }, [store.sessions]);

  function startSessionFromTemplate(template: WorkoutTemplate) {
    const last = findLastSessionForTemplate(store.sessions, template.id);

    const entries: DraftExerciseEntry[] = template.exerciseRows
      .map(row => {
        const ex = exercisesById.get(row.exerciseId);
        if (!ex) return null;

        const sets: DraftSetEntry[] = Array.from({ length: clampInt(row.setsPlanned, 1, 20) }).map(() => ({ reps: '', weightKg: '' }));

        // Optionally copy last session values for that exercise.
        const prev = last?.entries.find(e => e.exerciseId === row.exerciseId);
        if (prev) {
          prev.sets.slice(0, sets.length).forEach((s, idx) => {
            sets[idx] = {
              reps: s.reps == null ? '' : String(s.reps),
              weightKg: s.weightKg == null ? '' : formatKg(s.weightKg)
            };
          });
        }

        return {
          exerciseId: row.exerciseId,
          exerciseName: ex.name,
          targetReps: row.targetReps,
          sets
        };
      })
      .filter(Boolean) as DraftExerciseEntry[];

    const ts = nowIso();
    setSessionDraft({
      id: uid(),
      dateISO: trackDate,
      templateId: template.id,
      templateName: template.name,
      entries,
      createdAt: ts,
      updatedAt: ts
    });
  }

  function saveDraftSession() {
    if (!sessionDraft) return;

    api.addSession({
      id: sessionDraft.id,
      dateISO: sessionDraft.dateISO,
      templateId: sessionDraft.templateId,
      templateName: sessionDraft.templateName,
      entries: sessionDraft.entries.map(e => ({
        exerciseId: e.exerciseId,
        exerciseName: e.exerciseName,
        targetReps: e.targetReps,
        sets: e.sets.map(s => ({
          reps: parseNumberOrNull(s.reps),
          weightKg: parseNumberOrNull(s.weightKg)
        }))
      }))
    });

    setSessionDraft(null);
    setTab('Progress');
  }

  function updateDraftEntry(exerciseIndex: number, setIndex: number, field: 'reps' | 'weightKg', value: string) {
    if (!sessionDraft) return;
    setSessionDraft(d => {
      if (!d) return d;
      const entries = d.entries.map((e, idx) => {
        if (idx !== exerciseIndex) return e;
        const sets = e.sets.map((s, sIdx) => {
          if (sIdx !== setIndex) return s;
          const next = { ...s };
          if (field === 'reps') next.reps = value;
          if (field === 'weightKg') next.weightKg = value;
          return next;
        });
        return { ...e, sets };
      });
      return { ...d, entries };
    });
  }

  function renderTrack() {
    const canStart = Boolean(activeTemplate);
    const lastSession = store.sessions[0];

    const lastSessionSummary = (() => {
      if (!lastSession) return null;
      const perExercise = lastSession.entries.map(e => {
        const volume = e.sets.reduce((sum, s) => sum + setVolumeKg(s), 0);
        const top = e.sets.reduce(
          (best, cur) => {
            const w = cur.weightKg ?? 0;
            if (w > best.weight) return { weight: w, reps: cur.reps ?? 0 };
            return best;
          },
          { weight: 0, reps: 0 }
        );
        return { name: e.exerciseName, volume, top };
      });
      perExercise.sort((a, b) => b.volume - a.volume);
      const total = perExercise.reduce((s, x) => s + x.volume, 0);
      return { total, perExercise };
    })();

    return (
      <div className="grid" style={{ gap: 14 }}>
        <div className="card">
          <h1>Track Workout</h1>
          <div className="grid" style={{ gap: 10 }}>
            <div>
              <div className="muted">Date</div>
              <input value={trackDate} onChange={e => setTrackDate(e.target.value)} placeholder="YYYY-MM-DD" />
            </div>

            <div>
              <div className="muted">Workout template</div>
              <select
                value={activeTemplateId}
                onChange={e => setActiveTemplateId(e.target.value)}
              >
                {templatesSorted.length === 0 ? (
                  <option value="">No templates yet</option>
                ) : (
                  templatesSorted.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))
                )}
              </select>
            </div>

            <div className="row wrap">
              <button
                className="primary"
                disabled={!canStart}
                onClick={() => activeTemplate && startSessionFromTemplate(activeTemplate)}
              >
                Start session
              </button>
              {activeTemplate && store.sessions.some(s => s.templateId === activeTemplate.id) && (
                <span className="pill">Prefills from last session</span>
              )}
            </div>

            {templatesSorted.length === 0 && (
              <div className="muted">Create a template first (Templates tab).</div>
            )}

            {/* Hide last-session summary while a new session is being recorded to reduce clutter. */}
            {!sessionDraft && lastSessionSummary && (
              <div className="card" style={{ padding: 12, marginTop: 6 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <strong>Your last session</strong>
                  <span className="badge">{lastSession.templateName} · {lastSession.dateISO}</span>
                </div>
                <div className="muted" style={{ marginTop: 6 }}>
                  Total volume: {Math.round(lastSessionSummary.total)} kg·reps
                </div>

                <div className="grid" style={{ marginTop: 10, gap: 8 }}>
                  {lastSessionSummary.perExercise.slice(0, 4).map(ex => (
                    <div key={ex.name} className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 650 }}>{ex.name}</div>
                        <div className="muted" style={{ fontSize: 13 }}>
                          {Math.round(ex.volume)} kg·reps
                          {ex.top.weight ? ` · top ${formatKg(ex.top.weight)}×${ex.top.reps}` : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                  {lastSessionSummary.perExercise.length > 4 && (
                    <div className="muted" style={{ fontSize: 13 }}>
                      +{lastSessionSummary.perExercise.length - 4} more exercises
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {sessionDraft && (
          <div className="card">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0 }}>Session draft</h2>
              <span className="badge">{sessionDraft.templateName} · {sessionDraft.dateISO}</span>
            </div>
            <div className="muted" style={{ marginTop: 6 }}>
              Enter reps + weight (kg). You can review and edit before saving.
            </div>

            <div className="grid" style={{ marginTop: 12, gap: 12 }}>
              {sessionDraft.entries.map((entry, eIdx) => (
                <div key={entry.exerciseId} className="card" style={{ padding: 12 }}>
                  <div className="row wrap" style={{ justifyContent: 'space-between' }}>
                    <strong>{entry.exerciseName}</strong>
                    {entry.targetReps && <span className="badge">Target: {entry.targetReps}</span>}
                  </div>

                  <div className="grid" style={{ gap: 8, marginTop: 10 }}>
                    {entry.sets.map((set, sIdx) => (
                      <div className="setRow" key={sIdx}>
                        <span className="badge">Set {sIdx + 1}</span>
                        <input
                          inputMode="numeric"
                          placeholder="Reps"
                          value={set.reps ?? ''}
                          onChange={e => updateDraftEntry(eIdx, sIdx, 'reps', e.target.value)}
                        />
                        <input
                          inputMode="decimal"
                          placeholder="kg"
                          value={set.weightKg ?? ''}
                          onChange={e => updateDraftEntry(eIdx, sIdx, 'weightKg', e.target.value)}
                        />
                      </div>
                    ))}

                    <div className="muted">
                      Volume: {Math.round(entry.sets.reduce((sum, s) => sum + setVolumeKg({ reps: parseNumberOrNull(s.reps), weightKg: parseNumberOrNull(s.weightKg) }), 0))} kg·reps
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="row wrap" style={{ marginTop: 14 }}>
              <button className="primary" onClick={saveDraftSession}>Save session</button>
              <button className="danger" onClick={() => setSessionDraft(null)}>Discard</button>
              <span className="muted">You can edit saved sessions from Progress.</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderExercises() {
    return (
      <div className="grid" style={{ gap: 14 }}>
        <div className="card">
          <h1>Exercises</h1>
          <div className="muted">Reusable exercise library (used by workout templates).</div>
          <div className="grid" style={{ marginTop: 10, gap: 10 }}>
            <div className="grid two">
              <input
                placeholder="Exercise name (e.g. Back squat)"
                value={exerciseForm.name}
                onChange={e => setExerciseForm(f => ({ ...f, name: e.target.value }))}
              />
              <div className="row wrap" style={{ justifyContent: 'flex-end' }}>
                <button
                  className="primary"
                  disabled={!exerciseForm.name.trim()}
                  onClick={() => {
                    api.upsertExercise({ id: exerciseForm.id, name: exerciseForm.name, notes: exerciseForm.notes });
                    setExerciseForm({ name: '' });
                  }}
                >
                  {exerciseForm.id ? 'Update' : 'Add'}
                </button>
                {exerciseForm.id && (
                  <button onClick={() => setExerciseForm({ name: '' })}>Cancel</button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Library</h2>
          {exercisesSorted.length === 0 ? (
            <div className="muted">No exercises yet.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {exercisesSorted.map(ex => (
                  <tr key={ex.id}>
                    <td>{ex.name}</td>
                    <td>
                      <div className="row">
                        <button onClick={() => setExerciseForm({ id: ex.id, name: ex.name, notes: ex.notes })}>Edit</button>
                        <button className="danger" onClick={() => api.deleteExercise(ex.id)}>Delete</button>
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

  function initTemplateEditor(t?: WorkoutTemplate) {
    if (!t) {
      setTemplateEditor({ name: '', rows: [] });
      return;
    }
    setTemplateEditor({
      id: t.id,
      name: t.name,
      rows: t.exerciseRows.map(r => ({ id: r.id, exerciseId: r.exerciseId, setsPlanned: r.setsPlanned, targetReps: r.targetReps }))
    });
  }

  function addTemplateRow() {
    const firstEx = exercisesSorted[0]?.id ?? '';
    setTemplateEditor(ed => ({
      ...ed,
      rows: [
        ...ed.rows,
        { id: uid(), exerciseId: firstEx, setsPlanned: 3, targetReps: '8-10' }
      ]
    }));
  }

  function updateTemplateRow(rowId: string, patch: Partial<{ exerciseId: string; setsPlanned: number; targetReps: string }>) {
    setTemplateEditor(ed => ({
      ...ed,
      rows: ed.rows.map(r => (r.id === rowId ? { ...r, ...patch } : r))
    }));
  }

  function deleteTemplateRow(rowId: string) {
    setTemplateEditor(ed => ({ ...ed, rows: ed.rows.filter(r => r.id !== rowId) }));
  }

  function saveTemplate() {
    const name = templateEditor.name.trim();
    if (!name) return;

    const ts = nowIso();
    const tpl: WorkoutTemplate = {
      id: templateEditor.id ?? uid(),
      name,
      exerciseRows: templateEditor.rows
        .filter(r => r.exerciseId)
        .map(r => ({
          id: r.id,
          exerciseId: r.exerciseId,
          setsPlanned: clampInt(r.setsPlanned, 1, 20),
          targetReps: r.targetReps.trim() || ''
        })),
      createdAt: ts,
      updatedAt: ts
    };

    api.upsertTemplate(tpl);
    initTemplateEditor(undefined);
  }

  function renderTemplates() {
    return (
      <div className="grid" style={{ gap: 14 }}>
        <div className="card">
          <h1>Templates</h1>
          <div className="muted">Create workouts like “Leg day” with reusable exercises.</div>

          {exercisesSorted.length === 0 && (
            <div className="muted" style={{ marginTop: 10 }}>
              Add exercises first (Exercises tab).
            </div>
          )}

          <div className="grid" style={{ gap: 10, marginTop: 12 }}>
            <input
              placeholder="Workout name (e.g. Leg day)"
              value={templateEditor.name}
              onChange={e => setTemplateEditor(ed => ({ ...ed, name: e.target.value }))}
            />

            <div className="row wrap">
              <button className="primary" disabled={exercisesSorted.length === 0} onClick={addTemplateRow}>Add exercise</button>
              <button className="primary" disabled={!templateEditor.name.trim()} onClick={saveTemplate}>{templateEditor.id ? 'Update template' : 'Save template'}</button>
              {templateEditor.id && <button onClick={() => initTemplateEditor(undefined)}>Cancel</button>}
            </div>

            {templateEditor.rows.length > 0 && (
              <div className="grid" style={{ gap: 8 }}>
                {templateEditor.rows.map(r => (
                  <div key={r.id} className="card" style={{ padding: 10 }}>
                    <div className="grid" style={{ gap: 8 }}>
                      <div>
                        <div className="muted">Exercise</div>
                        <select value={r.exerciseId} onChange={e => updateTemplateRow(r.id, { exerciseId: e.target.value })}>
                          {exercisesSorted.map(ex => (
                            <option key={ex.id} value={ex.id}>{ex.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid two">
                        <div>
                          <div className="muted">Sets</div>
                          <input
                            inputMode="numeric"
                            value={String(r.setsPlanned)}
                            onChange={e => updateTemplateRow(r.id, { setsPlanned: Number(e.target.value) || 1 })}
                          />
                        </div>
                        <div>
                          <div className="muted">Target reps</div>
                          <input
                            placeholder="e.g. 6-8"
                            value={r.targetReps}
                            onChange={e => updateTemplateRow(r.id, { targetReps: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="row" style={{ justifyContent: 'flex-end' }}>
                        <button className="danger" onClick={() => deleteTemplateRow(r.id)}>Remove</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h2>Saved templates</h2>
          {templatesSorted.length === 0 ? (
            <div className="muted">No templates yet.</div>
          ) : (
            <div className="list" style={{ marginTop: 8 }}>
              {templatesSorted.map(t => (
                <div key={t.id} className="listRow">
                  <div>
                    <div className="listTitle">{t.name}</div>
                    <div className="listSub">{t.exerciseRows.length} exercises</div>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <button className="iconBtn" onClick={() => initTemplateEditor(t)} aria-label="Edit template">
                      <Pencil size={18} />
                    </button>
                    <button className="iconBtn danger" onClick={() => api.deleteTemplate(t.id)} aria-label="Delete template">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderProgress() {
    return (
      <ProgressView
        templates={templatesSorted}
        sessionsByTemplate={sessionsByTemplate}
        exercisesById={exercisesById as any}
        getTemplateById={api.getTemplateById}
        onEditSession={(s) => {
          setTrackDate(s.dateISO);
          setActiveTemplateId(s.templateId);
          setSessionDraft({
            ...s,
            entries: s.entries.map(e => ({
              exerciseId: e.exerciseId,
              exerciseName: e.exerciseName,
              targetReps: e.targetReps ?? '',
              sets: e.sets.map(set => ({
                reps: set.reps == null ? '' : String(set.reps),
                weightKg: set.weightKg == null ? '' : formatKg(set.weightKg)
              }))
            }))
          });
          setTab('Track');
        }}
        onDeleteSession={(id) => api.deleteSession(id)}
      />
    );
  }

  const importInputRef = useRef<HTMLInputElement | null>(null);

  function renderExport() {
    const onImportJson = async (file: File) => {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        alert('Invalid JSON file.');
        return;
      }

      // Very small schema check.
      const obj = parsed as any;
      if (!obj || obj.version !== 1 || !Array.isArray(obj.exercises) || !Array.isArray(obj.templates) || !Array.isArray(obj.sessions)) {
        alert('This does not look like a valid export from this app (expected version=1).');
        return;
      }

      const ok = confirm('Import will REPLACE all current data on this device. Continue?');
      if (!ok) return;

      // Backup current first.
      exportJson(store);

      api.setStore(() => obj);
      alert('Import complete.');
    };

    return (
      <div className="grid" style={{ gap: 14 }}>
        <div className="card">
          <h1>Export / Import</h1>
          <div className="muted">All data lives in your browser Local Storage on this device.</div>
          <div className="row wrap" style={{ marginTop: 12 }}>
            <button className="primary" onClick={() => exportJson(store)}>Export JSON</button>
            <button className="primary" onClick={() => exportSessionsCsv(store.sessions)}>Export sessions CSV</button>

            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              // iOS PWA often ignores programmatic clicks on `display:none` inputs
              // so we keep it off-screen but present.
              style={{ position: 'absolute', left: -10000, width: 1, height: 1, opacity: 0 }}
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) void onImportJson(file);
                // reset input so selecting the same file again works
                e.currentTarget.value = '';
              }}
            />
            <button
              className="primary"
              type="button"
              onClick={() => importInputRef.current?.click()}
            >
              Import JSON (replace)
            </button>
          </div>
        </div>

        <div className="card">
          <h2>Notes</h2>
          <ul className="muted" style={{ margin: 0, paddingLeft: 18 }}>
            <li>Local-only prototype: data doesn’t sync between devices.</li>
            <li>CSV export is per-set rows (good for analysis in Sheets).</li>
            <li>Import replaces local data on this device (we auto-export a backup first).</li>
            <li>Next upgrades: charts + optional cloud sync.</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container">
        <div className="appTop">
          <div className="appTopMark" aria-hidden="true">
            <GymBroLogo size={30} />
          </div>
          <div className="appTopText">
            <div className="appName">GymBro</div>
            <div className="appTag">minimal workout log (no bro-science)</div>
          </div>
        </div>

        {tab === 'Track' && renderTrack()}
        {tab === 'Templates' && renderTemplates()}
        {tab === 'Exercises' && renderExercises()}
        {tab === 'Progress' && renderProgress()}
        {tab === 'Export' && renderExport()}
      </div>

      <div className="nav">
        <div className="nav-inner">
          {TABS.map(t => {
            const Icon = TAB_META[t].Icon;
            return (
              <button key={t} className={t === tab ? 'active' : ''} onClick={() => setTab(t)}>
                <Icon />
                <div>{TAB_META[t].label}</div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

export default App;
