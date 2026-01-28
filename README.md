# Lab — Workout Tracker (local-first)

Mobile-first web app to:
- manage a reusable **exercise library**
- create **workout templates** (e.g. "Leg day")
- log **workout sessions** (date + sets with reps/weight)
- view **progress** (basic timeline + volume)
- export **JSON** and **CSV**

All data is stored in **browser Local Storage** (prototype).

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Data model (high level)

- Exercises: reusable library
- Templates: reference exercises + planned sets + target reps
- Sessions: snapshots template name + exercise names at log-time (so history survives edits)

## Next ideas

- PWA install + offline icon
- Charts
- Import JSON
- Cloud sync (Supabase/Firebase)
