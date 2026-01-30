import { useMemo } from 'react';

export type MiniLinePoint = { xLabel: string; y: number | null };

function niceMinMax(vals: number[]) {
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  if (min === max) return { min: min - 1, max: max + 1 };
  const pad = (max - min) * 0.12;
  return { min: min - pad, max: max + pad };
}

export function MiniLineChart(props: {
  points: MiniLinePoint[];
  height?: number;
  stroke?: string;
  strokeWidth?: number;
  label?: string;
  suffix?: string;
}) {
  const { points, height = 96, stroke = 'var(--accent)', strokeWidth = 2.5, label, suffix } = props;

  const vals = useMemo(() => points.map(p => p.y).filter((v): v is number => typeof v === 'number' && Number.isFinite(v)), [points]);
  const { min, max } = vals.length ? niceMinMax(vals) : { min: 0, max: 1 };

  const W = 320;
  const H = height;
  const padX = 10;
  const padY = 12;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;

  const toX = (i: number) => padX + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const toY = (y: number) => padY + (1 - (y - min) / (max - min)) * innerH;

  const path = useMemo(() => {
    let d = '';
    points.forEach((p, i) => {
      if (p.y == null || !Number.isFinite(p.y)) return;
      const x = toX(i);
      const y = toY(p.y);
      d += d ? ` L ${x.toFixed(2)} ${y.toFixed(2)}` : `M ${x.toFixed(2)} ${y.toFixed(2)}`;
    });
    return d;
  }, [points, min, max]);

  const last = [...points].reverse().find(p => p.y != null && Number.isFinite(p.y));

  return (
    <div className="card" style={{ padding: 12 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <strong>{label ?? 'Chart'}</strong>
        <span className="badge">
          {last?.y == null ? '—' : `${Math.round(last.y * 100) / 100}${suffix ?? ''}`}
        </span>
      </div>

      <div style={{ marginTop: 10, overflowX: 'auto' }}>
        <svg width={Math.max(W, points.length * 36)} height={H} viewBox={`0 0 ${Math.max(W, points.length * 36)} ${H}`}>
          <defs>
            <linearGradient id="glow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={stroke} stopOpacity={0.30} />
              <stop offset="1" stopColor={stroke} stopOpacity={0.0} />
            </linearGradient>
          </defs>

          {/* grid */}
          <path
            d={`M ${padX} ${padY} H ${Math.max(W, points.length * 36) - padX} M ${padX} ${H - padY} H ${Math.max(W, points.length * 36) - padX}`}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />

          {path && (
            <>
              <path d={path} stroke="url(#glow)" strokeWidth={8} strokeLinecap="round" fill="none" />
              <path d={path} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" fill="none" />
            </>
          )}

          {/* x labels */}
          {points.map((p, i) => (
            <text
              key={i}
              x={toX(i)}
              y={H - 2}
              textAnchor="middle"
              fontSize="10"
              fill="rgba(255,255,255,0.45)"
            >
              {p.xLabel}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
