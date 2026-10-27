import React from 'react';
import { t } from './i18n.js';

export const COLORS = {
  ON_TIME:          '#0d9488',
  AT_RISK:          '#d97706',
  BREACHED:         '#dc2626',
  COMPLETED_ON_TIME:'#64748b',
  COMPLETED_LATE:   '#9f1239',
};

const ICONS = {
  ON_TIME:          '✓',
  AT_RISK:          '⚠',
  BREACHED:         '✕',
  COMPLETED_ON_TIME:'✓',
  COMPLETED_LATE:   '⚠',
};

export function Badge({ state, lang = 'en' }) {
  return (
    <span
      className="badge"
      style={{ background: COLORS[state] }}
      role="status"
      aria-label={`Status: ${t(lang, `state_${state}`)}`}
    >
      <span aria-hidden="true">{ICONS[state]}</span>
      {t(lang, `state_${state}`)}
    </span>
  );
}

export function Ring({ clock, lang = 'en' }) {
  const total = clock.totalDays || 1;
  const used  = Math.min(clock.elapsed ?? total, total);
  const r = 52, c = 2 * Math.PI * r;
  const frac = clock.state.startsWith('COMPLETED') ? 1 : used / total;
  const isBreached = clock.state === 'BREACHED';
  const isComplete = clock.state.startsWith('COMPLETED');
  const label  = isBreached ? t(lang, 'daysLate') : t(lang, 'daysLeft');
  const value  = isBreached ? clock.daysLate : (isComplete ? '✓' : (clock.remaining ?? 0));
  const color  = COLORS[clock.state];
  const pct    = Math.round(frac * 100);

  return (
    <div className="ring-wrap">
      <svg
        width="140"
        height="140"
        viewBox="0 0 140 140"
        role="img"
        aria-label={`${label}: ${isBreached ? clock.daysLate : clock.remaining ?? 0} (${pct}% of deadline elapsed)`}
      >
        {/* Track */}
        <circle cx="70" cy="70" r={r} fill="none" stroke="#e2e8f0" strokeWidth="14" />
        {/* Progress */}
        <circle
          cx="70" cy="70" r={r}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }}
        />
        {/* Label text */}
        <text x="70" y="63" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="Inter, sans-serif">
          {label}
        </text>
        {/* Value */}
        <text x="70" y="91" textAnchor="middle" fontSize="32" fontWeight="700" fill={color} fontFamily="Inter, sans-serif">
          {value}
        </text>
        {/* Total */}
        {!isBreached && !isComplete && (
          <text x="70" y="108" textAnchor="middle" fontSize="11" fill="#94a3b8" fontFamily="Inter, sans-serif">
            {`/ ${clock.totalDays} days`}
          </text>
        )}
      </svg>
    </div>
  );
}

/** Inline spinner used for loading states */
export function Spinner({ dark = false }) {
  return <span className={`spinner ${dark ? 'dark' : ''}`} role="status" aria-label="Loading…" />;
}
