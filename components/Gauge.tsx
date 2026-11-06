'use client';
import { useEffect, useState } from 'react';

// 마운트 직후 한 번 채워지는 애니메이션용 플래그. prefers-reduced-motion이면 CSS에서 트랜지션을 끈다.
function useMounted() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return on;
}

const ratio = (v: number, max: number) => (max > 0 ? Math.max(0, Math.min(1, v / max)) : 0);

// SVG 원형 게이지. 가운데 숫자는 monospace.
export function Gauge({ value, max, label, caption, size = 96 }: { value: number; max: number; label: string; caption?: string; size?: number }) {
  const on = useMounted();
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const mid = size / 2;
  return (
    <figure className="gauge" aria-label={`${label} ${value}/${max}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="g-track" cx={mid} cy={mid} r={r} />
        <circle
          className="g-fill"
          cx={mid}
          cy={mid}
          r={r}
          strokeDasharray={c}
          strokeDashoffset={on ? c * (1 - ratio(value, max)) : c}
          transform={`rotate(-90 ${mid} ${mid})`}
        />
        <text className="g-num" x="50%" y="50%" textAnchor="middle" dominantBaseline="central">
          {value}
        </text>
      </svg>
      <figcaption>
        <b>{label}</b> /{max}
        {caption && <span className="g-cap"> {caption}</span>}
      </figcaption>
    </figure>
  );
}

// 가로 막대. 채워지는 애니메이션은 마운트 시 한 번.
export function Bar({ value, max }: { value: number; max: number }) {
  const on = useMounted();
  return (
    <div className="mbar" role="presentation">
      <i style={{ width: `${on ? Math.round(ratio(value, max) * 100) : 0}%` }} />
    </div>
  );
}
