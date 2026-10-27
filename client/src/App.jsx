import React, { useState } from 'react';
import { setDemoDate } from './api.js';
import Citizen from './pages/Citizen.jsx';
import Officer from './pages/Officer.jsx';
import Commission from './pages/Commission.jsx';
import Compiler from './pages/Compiler.jsx';
import { t } from './i18n.js';

const TABS = [
  { id: 'citizen',    icon: '👤', label: 'Citizen / Helper' },
  { id: 'officer',    icon: '📋', label: 'Officer Radar'    },
  { id: 'commission', icon: '📊', label: 'Commission Map'   },
  { id: 'compiler',   icon: '⚙️',  label: 'Rights Compiler' },
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
      <a href="#main-content" className="skip-link">Skip to content</a>

      <header role="banner">
        {/* Brand */}
        <div className="header-brand">
          <div className="brand-logo" aria-hidden="true">S</div>
          <div>
            <h1>SAMAY</h1>
            <span className="brand-tagline">Service Deadline Tracker</span>
          </div>
        </div>

        {/* Navigation */}
        <nav role="navigation" aria-label="Main navigation">
          {TABS.map(({ id, icon, label }) => (
            <button
              key={id}
              className={tab === id ? 'on' : ''}
              onClick={() => setTab(id)}
              aria-current={tab === id ? 'page' : undefined}
              id={`tab-${id}`}
            >
              <span aria-hidden="true">{icon}</span>
              {label}
            </button>
          ))}
        </nav>

        {/* Controls */}
        <div className="header-controls" role="complementary" aria-label="Language and status">
          <div className="langs" role="group" aria-label="Language selector">
            {[['en', 'EN'], ['hi', 'हिन्दी']].map(([k, label]) => (
              <button
                key={k}
                className={lang === k ? 'on' : ''}
                onClick={() => pickLang(k)}
                aria-pressed={lang === k}
                aria-label={`Switch to ${label}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className={`status-dot ${online ? 'online' : 'offline'}`} role="status" aria-live="polite">
            <span className="dot-icon" aria-hidden="true" />
            {online ? t(lang, 'online') : t(lang, 'offline')}
          </div>
        </div>

        {/* Date override bar */}
        <div className="demo-bar" role="region" aria-label="Date override (for testing)">
          <span className="demo-label">
            <span aria-hidden="true">📅</span>
            Simulated date:
          </span>
          <label htmlFor="demo-date-input">
            <input
              id="demo-date-input"
              type="date"
              value={date}
              onChange={(e) => go(e.target.value)}
              aria-label="Override the current date for testing"
            />
          </label>
          <button onClick={() => go(addDays(date, 1))} aria-label="Advance date by 1 day">+1 day</button>
          <button onClick={() => go(addDays(date, 5))} aria-label="Advance date by 5 days">+5 days</button>
          <button onClick={() => go(todayIso())} aria-label="Reset to today's date">Reset to today</button>
        </div>
      </header>

      <main id="main-content" key={tick} role="main">
        {tab === 'citizen'    && <Citizen today={date} lang={lang} online={online} />}
        {tab === 'officer'    && <Officer />}
        {tab === 'commission' && <Commission />}
        {tab === 'compiler'   && <Compiler />}
      </main>

      <footer role="contentinfo">
        {t(lang, 'disclaimer')}
      </footer>
    </div>
  );
}
