import React from 'react';
import { t } from './i18n.js';
import { IconCheck, IconAlert, IconClock, IconShield, IconBell } from './Icons.jsx';

export const COLORS = {
  ON_TIME:           '#059669', // Emerald
  AT_RISK:           '#d97706', // Amber
  BREACHED:          '#dc2626', // Crimson
  COMPLETED_ON_TIME: '#0284c7', // Sky Blue
  COMPLETED_LATE:    '#9f1239', // Rose
};

export const BG_COLORS = {
  ON_TIME:           '#ecfdf5',
  AT_RISK:           '#fffbeb',
  BREACHED:          '#fef2f2',
  COMPLETED_ON_TIME: '#f0f9ff',
  COMPLETED_LATE:    '#fff1f2',
};

export function Badge({ state, lang = 'en', size = 'md' }) {
  const color = COLORS[state] || '#64748b';
  const bg = BG_COLORS[state] || '#f1f5f9';
  const isOk = state === 'ON_TIME' || state === 'COMPLETED_ON_TIME';
  const isWarn = state === 'AT_RISK' || state === 'COMPLETED_LATE';

  return (
    <span
      className={`status-pill pill-${size} pill-${state.toLowerCase()}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: size === 'sm' ? '2px 8px' : '4px 10px',
        borderRadius: '9999px',
        fontSize: size === 'sm' ? '11px' : '12px',
        fontWeight: '600',
        letterSpacing: '0.01em',
        background: bg,
        color: color,
        border: `1px solid ${color}33`,
        boxShadow: `0 1px 2px rgba(0,0,0,0.03)`
      }}
      role="status"
      aria-label={`Status: ${t(lang, `state_${state}`)}`}
    >
      <span style={{ display: 'inline-flex' }} aria-hidden="true">
        {isOk && <IconCheck size={size === 'sm' ? 12 : 14} color={color} />}
        {isWarn && <IconAlert size={size === 'sm' ? 12 : 14} color={color} />}
        {state === 'BREACHED' && <IconAlert size={size === 'sm' ? 12 : 14} color={color} />}
      </span>
      <span>{t(lang, `state_${state}`)}</span>
    </span>
  );
}

export function Ring({ clock, lang = 'en' }) {
  const total = clock.totalDays || 1;
  const used  = Math.min(clock.elapsed ?? total, total);
  const r = 58;
  const c = 2 * Math.PI * r;
  const isBreached = clock.state === 'BREACHED';
  const isComplete = clock.state.startsWith('COMPLETED');
  const frac = isComplete ? 1 : Math.min(1, Math.max(0.02, used / total));
  
  const label = isBreached 
    ? t(lang, 'daysLate') 
    : (isComplete ? 'COMPLETED' : t(lang, 'daysLeft'));
    
  const value = isBreached 
    ? clock.daysLate 
    : (isComplete ? '✓' : (clock.remaining ?? 0));
    
  const color = COLORS[clock.state] || '#059669';
  const pct = Math.round((clock.elapsed / total) * 100);

  return (
    <div className="chronometer-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      <div style={{ position: 'relative', width: 156, height: 156 }}>
        <svg
          width="156"
          height="156"
          viewBox="0 0 156 156"
          role="img"
          aria-label={`${label}: ${isBreached ? clock.daysLate : clock.remaining ?? 0}`}
        >
          <defs>
            <radialGradient id={`glow-${clock.state}`} cx="50%" cy="50%" r="50%">
              <stop offset="60%" stopColor={color} stopOpacity="0.08" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`grad-${clock.state}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={isBreached ? '#b91c1c' : (clock.state === 'AT_RISK' ? '#b45309' : '#047857')} />
            </linearGradient>
          </defs>

          {/* Background Ambient Glow */}
          <circle cx="78" cy="78" r="74" fill={`url(#glow-${clock.state})`} />

          {/* Inactive Track */}
          <circle
            cx="78" cy="78" r={r}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="11"
            strokeLinecap="round"
          />

          {/* Active Progress */}
          <circle
            cx="78" cy="78" r={r}
            fill="none"
            stroke={`url(#grad-${clock.state})`}
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - frac)}
            transform="rotate(-90 78 78)"
            style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.3s ease' }}
          />

          {/* Label */}
          <text
            x="78" y="58"
            textAnchor="middle"
            fontSize="10"
            fontWeight="700"
            letterSpacing="0.08em"
            fill="#64748b"
            fontFamily="Inter, system-ui, sans-serif"
          >
            {label}
          </text>

          {/* Big Value */}
          <text
            x="78" y="93"
            textAnchor="middle"
            fontSize="38"
            fontWeight="800"
            fill={color}
            fontFamily="Inter, system-ui, sans-serif"
            style={{ letterSpacing: '-0.03em' }}
          >
            {value}
          </text>

          {/* Total Days */}
          {!isBreached && !isComplete && (
            <text
              x="78" y="112"
              textAnchor="middle"
              fontSize="11"
              fontWeight="500"
              fill="#94a3b8"
              fontFamily="Inter, system-ui, sans-serif"
            >
              {`limit: ${clock.totalDays}d`}
            </text>
          )}
        </svg>
      </div>

      <div style={{ marginTop: '6px', textAlign: 'center' }}>
        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
          {isBreached ? (
            <span style={{ color: '#dc2626', fontWeight: '600' }}>Exceeded legal deadline</span>
          ) : isComplete ? (
            <span style={{ color: '#059669', fontWeight: '600' }}>Process concluded</span>
          ) : (
            <span>{pct}% statutory time elapsed</span>
          )}
        </span>
      </div>
    </div>
  );
}

export function StatCard({ label, value, subtext, color = '#0f172a', icon = null, badge = null }) {
  return (
    <div className="stat-card" style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      flex: '1 1 180px',
      position: 'relative'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </span>
        {icon && <span style={{ color: '#64748b' }}>{icon}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span style={{ fontSize: '28px', fontWeight: '800', color: color, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          {value}
        </span>
        {badge}
      </div>
      {subtext && (
        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '400' }}>
          {subtext}
        </span>
      )}
    </div>
  );
}

export function NotificationBubble({ notif, lang = 'en' }) {
  const isBreach = notif.type === 'BREACH_ALERT';
  return (
    <div style={{
      background: isBreach ? '#fef2f2' : '#f0fdf4',
      border: `1px solid ${isBreach ? '#fecaca' : '#bbf7d0'}`,
      borderRadius: '12px',
      padding: '14px 16px',
      marginBottom: '10px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            background: isBreach ? '#dc2626' : '#059669',
            color: '#fff',
            fontSize: '10px',
            fontWeight: '700',
            padding: '2px 6px',
            borderRadius: '4px',
            letterSpacing: '0.04em'
          }}>
            {notif.channel || 'SMS & WhatsApp'}
          </span>
          <span style={{ fontSize: '12px', fontWeight: '700', color: isBreach ? '#991b1b' : '#166534' }}>
            {notif.title}
          </span>
        </div>
        <span style={{ fontSize: '11px', color: '#64748b' }}>
          {notif.sentOn}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: '13px', color: '#1e293b', lineHeight: 1.5, fontFamily: 'system-ui, sans-serif' }}>
        {notif.message}
      </p>
    </div>
  );
}

export function Spinner({ dark = false, size = 16 }) {
  return (
    <span
      className={`spinner ${dark ? 'dark' : ''}`}
      style={{
        display: 'inline-block',
        width: `${size}px`,
        height: `${size}px`,
        border: `2px solid ${dark ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.3)'}`,
        borderTopColor: dark ? '#0f766e' : '#ffffff',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite'
      }}
      role="status"
      aria-label="Loading…"
    />
  );
}
