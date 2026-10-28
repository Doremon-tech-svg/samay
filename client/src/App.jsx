import React, { useState } from 'react';
import { setDemoDate } from './api.js';
import Citizen from './pages/Citizen.jsx';
import Officer from './pages/Officer.jsx';
import Commission from './pages/Commission.jsx';
import Compiler from './pages/Compiler.jsx';
import { t } from './i18n.js';
import { IconUser, IconRadar, IconMap, IconCpu, IconCalendar } from './Icons.jsx';

const TABS = [
  { id: 'citizen',    icon: IconUser,  label: 'Citizen / Helper' },
  { id: 'officer',    icon: IconRadar, label: 'Officer Radar'    },
  { id: 'commission', icon: IconMap,   label: 'Commission Map'   },
  { id: 'compiler',   icon: IconCpu,   label: 'Rights Compiler' },
];

const addDays = (iso, n) => new Date(Date.parse(iso) + n * 86400000).toISOString().slice(0, 10);
const todayIso = () => new Date().toISOString().slice(0, 10);

export default function App() {
  const [tab, setTab] = useState('citizen');
  const [date, setDate] = useState(todayIso);
  const [lang, setLang] = useState(() => localStorage.getItem('samay.lang') || 'en');
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [tick, setTick] = useState(0);

  const go = (d) => { setDate(d); setDemoDate(d); setTick((t) => t + 1); };

  React.useEffect(() => setDemoDate(date), []); // eslint-disable-line
  React.useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const pickLang = (l) => { setLang(l); localStorage.setItem('samay.lang', l); };

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <header role="banner">
        {/* Main Header Bar */}
        <div className="header-top-row">
          {/* Brand Identity */}
          <div className="header-brand">
            <div className="brand-emblem" aria-hidden="true">
              <span>S</span>
            </div>
            <div className="brand-text">
              <h1>
                SAMAY
                <span className="hindi-title">समय</span>
              </h1>
              <span className="brand-tagline">National Public Service Guarantee Engine</span>
            </div>
          </div>

          {/* Module Navigation */}
          <nav role="navigation" aria-label="Main Navigation">
            {TABS.map(({ id, icon: IconComponent, label }) => (
              <button
                key={id}
                className={tab === id ? 'on' : ''}
                onClick={() => setTab(id)}
                aria-current={tab === id ? 'page' : undefined}
                id={`tab-${id}`}
              >
                <IconComponent size={16} />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          {/* Right Controls: Language & Status */}
          <div className="header-controls">
            <div className="langs-toggle" role="group" aria-label="Language selector">
              {[['en', 'EN'], ['hi', 'हिन्दी']].map(([k, label]) => (
                <button
                  key={k}
                  className={lang === k ? 'on' : ''}
                  onClick={() => pickLang(k)}
                  aria-pressed={lang === k}
                  aria-label={`Switch language to ${label}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className={`connectivity-badge ${online ? 'online' : 'offline'}`} role="status">
              <span className="dot" aria-hidden="true" />
              <span>{online ? t(lang, 'online') : t(lang, 'offline')}</span>
            </div>
          </div>
        </div>

        {/* Executive Simulation & Testing Bar */}
        <div className="sim-toolbar" role="region" aria-label="Demo date override">
          <div className="sim-toolbar-left">
            <span className="sim-tag">
              <IconCalendar size={13} color="#f59e0b" />
              <span>Simulation Lab</span>
            </span>
            <div className="sim-date-input-wrap">
              <label htmlFor="demo-date-input" style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.7)', textTransform: 'none' }}>
                Simulated Date:
              </label>
              <input
                id="demo-date-input"
                type="date"
                value={date}
                onChange={(e) => go(e.target.value)}
                aria-label="Simulation date input"
              />
            </div>
          </div>

          <div className="sim-actions">
            <button onClick={() => go(addDays(date, 1))} aria-label="Advance date by 1 day">+1 Day</button>
            <button onClick={() => go(addDays(date, 5))} aria-label="Advance date by 5 days">+5 Days</button>
            <button onClick={() => go(addDays(date, 15))} aria-label="Advance date by 15 days (Breach window)">+15 Days (Breach)</button>
            <button className="reset-btn" onClick={() => go(todayIso())} aria-label="Reset to current calendar date">Reset Today</button>
          </div>
        </div>
      </header>

      <main id="main-content" key={tick} role="main">
        {tab === 'citizen'    && <Citizen today={date} lang={lang} online={online} />}
        {tab === 'officer'    && <Officer />}
        {tab === 'commission' && <Commission />}
        {tab === 'compiler'   && <Compiler />}
      </main>

      <footer role="contentinfo">
        <p style={{ margin: '0 0 6px 0', fontWeight: 500 }}>
          {t(lang, 'disclaimer')}
        </p>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>
          SAMAY Service Guarantee Protocol · Complies with State RTS Acts & Digital Personal Data Protection Standards
        </span>
      </footer>
    </div>
  );
}
