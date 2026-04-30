'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type Props = {
  value: string;
  onChange: (hhmm: string) => void;
  label?: string;
};

function parse24(v: string): { h: number; m: number } {
  const [a, b] = (v || '09:00').split(':');
  const h = Math.min(23, Math.max(0, parseInt(a || '9', 10) || 0));
  const m = Math.min(59, Math.max(0, parseInt(b || '0', 10) || 0));
  return { h, m };
}

function from24To12(h: number, m: number): { h12: number; isPm: boolean; minute: number } {
  if (h === 0) return { h12: 12, isPm: false, minute: m };
  if (h === 12) return { h12: 12, isPm: true, minute: m };
  if (h < 12) return { h12: h, isPm: false, minute: m };
  return { h12: h - 12, isPm: true, minute: m };
}

function to24(h12: number, isPm: boolean, minute: number): string {
  let h24: number;
  if (h12 === 12) h24 = isPm ? 12 : 0;
  else h24 = isPm ? h12 + 12 : h12;
  return `${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * Budilnik uslubidagi soat: tashqi — 1–12 soat, ichki — daqiqa halqasi;
 * «Tushdan oldin / keyin» va mobil uchun katta tegish maydoni.
 */
export default function RadialTimePicker({ value, onChange, label }: Props) {
  const parsed = useMemo(() => parse24(value), [value]);
  const derived = useMemo(() => from24To12(parsed.h, parsed.m), [parsed.h, parsed.m]);

  const [h12, setH12] = useState(derived.h12);
  const [isPm, setIsPm] = useState(derived.isPm);
  const [minute, setMinute] = useState(derived.minute);
  const [mode, setMode] = useState<'hour' | 'minute'>('hour');

  useEffect(() => {
    setH12(derived.h12);
    setIsPm(derived.isPm);
    setMinute(derived.minute);
  }, [derived.h12, derived.isPm, derived.minute]);

  const push = useCallback(
    (nh12: number, npm: boolean, nm: number) => {
      onChange(to24(nh12, npm, nm));
    },
    [onChange]
  );

  const onFacePointer = useCallback(
    (e: React.PointerEvent<SVGElement>, kind: 'hour' | 'minute') => {
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
      deg = (deg + 90 + 360) % 360;
      if (kind === 'hour') {
        let hr = Math.round(deg / 30) % 12;
        if (hr === 0) hr = 12;
        setH12(hr);
        push(hr, isPm, minute);
      } else {
        const mn = Math.round((deg / 360) * 60) % 60;
        setMinute(mn);
        push(h12, isPm, mn);
      }
    },
    [h12, isPm, minute, push]
  );

  const hourAngle = ((h12 % 12) / 12) * 360 - 90;
  const minAngle = (minute / 60) * 360 - 90;
  const rH = 0.38;
  const rM = 0.28;

  return (
    <div className="radial-time-picker w-full max-w-[min(100%,320px)]">
      {label ? <div className="text-xs text-gray-600 mb-2 font-medium">{label}</div> : null}
      <div className="flex gap-2 mb-2">
        <button
          type="button"
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border min-h-[44px] ${
            mode === 'hour' ? 'bg-violet-600 text-white border-violet-700 shadow-md' : 'bg-white border-gray-300'
          }`}
          onClick={() => setMode('hour')}
        >
          Soat
        </button>
        <button
          type="button"
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border min-h-[44px] ${
            mode === 'minute' ? 'bg-violet-600 text-white border-violet-700 shadow-md' : 'bg-white border-gray-300'
          }`}
          onClick={() => setMode('minute')}
        >
          Daqiqa
        </button>
      </div>
      <div className="flex justify-center gap-2 mb-2 flex-wrap">
        <button
          type="button"
          className={`px-4 py-2.5 rounded-full text-sm font-bold border-2 min-h-[44px] ${
            !isPm ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-sm' : 'border-gray-300 bg-gray-50'
          }`}
          onClick={() => {
            setIsPm(false);
            push(h12, false, minute);
          }}
        >
          Tushdan oldin
        </button>
        <button
          type="button"
          className={`px-4 py-2.5 rounded-full text-sm font-bold border-2 min-h-[44px] ${
            isPm ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-sm' : 'border-gray-300 bg-gray-50'
          }`}
          onClick={() => {
            setIsPm(true);
            push(h12, true, minute);
          }}
        >
          Tushdan keyin
        </button>
      </div>

      <div className="flex justify-center touch-manipulation select-none">
        <svg
          width="100%"
          viewBox="0 0 200 200"
          className="cursor-pointer max-h-[min(72vw,320px)] w-full"
          style={{ aspectRatio: '1' }}
          onPointerDown={(e) => {
            try {
              (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
            } catch {
              /* ignore */
            }
            onFacePointer(e, mode);
          }}
          onPointerMove={(e) => {
            if (e.buttons === 1) onFacePointer(e, mode);
          }}
          role="application"
          aria-label="Soat tanlash"
        >
          <defs>
            <filter id="tglow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="2.5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle cx="100" cy="100" r="96" fill="#faf5ff" stroke="#c4b5fd" strokeWidth="2" />
          {Array.from({ length: 12 }).map((_, i) => {
            const ang = ((i + 1) / 12) * Math.PI * 2 - Math.PI / 2;
            const x = 100 + 78 * Math.cos(ang);
            const y = 100 + 78 * Math.sin(ang);
            const num = i + 1;
            return (
              <text
                key={i}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-violet-900 font-bold"
                style={{ fontSize: mode === 'hour' ? 15 : 12, opacity: mode === 'hour' ? 1 : 0.45 }}
              >
                {num}
              </text>
            );
          })}
          {Array.from({ length: 60 }).map((_, i) => {
            const ang = (i / 60) * Math.PI * 2 - Math.PI / 2;
            const r1 = mode === 'minute' ? 88 : 52;
            const r2 = mode === 'minute' ? 82 : 48;
            const x1 = 100 + r1 * Math.cos(ang);
            const y1 = 100 + r1 * Math.sin(ang);
            const x2 = 100 + r2 * Math.cos(ang);
            const y2 = 100 + r2 * Math.sin(ang);
            return (
              <line
                key={`m-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={i % 5 === 0 ? '#7c3aed' : '#ddd6fe'}
                strokeWidth={i % 5 === 0 ? 2 : 1}
                opacity={mode === 'minute' ? 1 : 0.25}
              />
            );
          })}
          {mode === 'hour' && (
            <line
              x1={100}
              y1={100}
              x2={100 + 100 * rH * Math.cos((hourAngle * Math.PI) / 180)}
              y2={100 + 100 * rH * Math.sin((hourAngle * Math.PI) / 180)}
              stroke="#5b21b6"
              strokeWidth={5}
              strokeLinecap="round"
              filter="url(#tglow)"
            />
          )}
          {mode === 'minute' && (
            <line
              x1={100}
              y1={100}
              x2={100 + 100 * rM * Math.cos((minAngle * Math.PI) / 180)}
              y2={100 + 100 * rM * Math.sin((minAngle * Math.PI) / 180)}
              stroke="#db2777"
              strokeWidth={4}
              strokeLinecap="round"
              filter="url(#tglow)"
            />
          )}
          <circle cx="100" cy="100" r="8" fill="#4c1d95" />
        </svg>
      </div>
      <div className="mt-2 text-center text-base font-mono text-violet-900 font-semibold">
        {to24(h12, isPm, minute)}
      </div>
      <input
        type="time"
        className="input w-full min-h-[48px] text-base mt-2"
        value={to24(h12, isPm, minute)}
        onChange={(e) => {
          const v = e.target.value;
          if (!v) return;
          const p = parse24(v);
          const x = from24To12(p.h, p.m);
          setH12(x.h12);
          setIsPm(x.isPm);
          setMinute(x.minute);
          onChange(v);
        }}
      />
    </div>
  );
}
