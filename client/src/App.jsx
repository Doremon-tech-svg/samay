import React, { useEffect, useState } from 'react';
import { api, setDemoDate } from './api.js';
import Citizen from './pages/Citizen.jsx';
import Officer from './pages/Officer.jsx';
import Commission from './pages/Commission.jsx';
import Compiler from './pages/Compiler.jsx';
import Landing from './pages/Landing.jsx';
import AuthPage from './pages/AuthPage.jsx';
import { LANGUAGES, t } from './i18n.js';
import { IconUser, IconRadar, IconMap, IconCpu, IconCalendar } from './Icons.jsx';

const TABS = [
  { id: 'citizen', icon: IconUser, key: 'navCitizen' },
  { id: 'officer', icon: IconRadar, key: 'navOfficer' },
  { id: 'commission', icon: IconMap, key: 'navCommission' },
  { id: 'compiler', icon: IconCpu, key: 'navCompiler' },
];

const ASSISTANT_PROFILES = {
  citizen: {
    title: 'Citizen Copilot',
    subtitle: 'Your deadlines, slip checks, and appeal next steps',
    greeting: 'I can explain your tracked deadline, check what the slip fields mean, and guide you to an appeal after a breach.',
    prompts: [
      { label: 'My deadline', text: 'Summarise my tracked applications and tell me which deadline needs attention.' },
      { label: 'Appeal help', text: 'Is any of my application late, and what should I do next?' },
      { label: 'Slip check', text: 'What should I verify before I start a clock from my acknowledgement slip?' }
    ]
  },
  officer: {
    title: 'Desk Copilot',
    subtitle: 'Triage your office docket without changing the legal clock',
    greeting: 'I can prioritise this office docket, explain risk signals, and suggest evidence-based operational next steps.',
    prompts: [
      { label: 'Risk queue', text: 'Summarise the most urgent files in my office and why they need attention.' },
      { label: 'Bottlenecks', text: 'Which bottleneck reasons are appearing in my risk queue?' },
      { label: 'Today’s action', text: 'Give me a practical three-step plan for this office today.' }
    ]
  },
  commission: {
    title: 'Commission Copilot',
    subtitle: 'Read office aggregates with privacy safeguards',
    greeting: 'I can explain visible office-level trends, late rates, and bottleneck signals without exposing small cohorts.',
    prompts: [
      { label: 'Office trends', text: 'Summarise the visible office-level performance picture.' },
      { label: 'Late rates', text: 'Which visible office needs the most follow-up, and why?' },
      { label: 'Privacy check', text: 'What can I safely conclude from this dashboard without identifying citizens?' }
    ]
  }
};

const addDays = (iso, n) => new Date(Date.parse(iso) + n * 86400000).toISOString().slice(0, 10);
const todayIso = () => new Date().toISOString().slice(0, 10);
const originalTextByNode = new WeakMap();
const originalAttrByElement = new WeakMap();
const translationCache = new Map();
const DEVANAGARI = /[\u0900-\u097F]/;

async function translateVisibleText(targetLanguage) {
  if (targetLanguage === 'en' || typeof document === 'undefined' || !document.body) return;
  const root = document.getElementById('root');
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const parent = node.parentElement;
    if (!parent || parent.closest('script,style,pre,code,[data-no-translate]') || !node.textContent.trim()) continue;
    if (node.textContent.trim().length < 2 || /^[-+\d•·]+$/.test(node.textContent.trim())) continue;
    nodes.push(node);
  }
  const unique = new Map();
  nodes.forEach((node) => {
    if (!originalTextByNode.has(node)) originalTextByNode.set(node, node.textContent);
    else node.textContent = originalTextByNode.get(node);
    const source = originalTextByNode.get(node).trim();
    if (targetLanguage === 'hi' && DEVANAGARI.test(source)) return;
    const sourceLanguage = DEVANAGARI.test(source) ? 'hi' : 'en';
    const key = `${sourceLanguage}|${source}`;
    if (!unique.has(key)) unique.set(key, { source, sourceLanguage, targets: [] });
    unique.get(key).targets.push(node);
  });
  const elements = [...root.querySelectorAll('[placeholder],[title],[aria-label]')];
  elements.forEach((element) => {
    if (element.closest('script,style,pre,code,[data-no-translate]')) return;
    const attrs = ['placeholder', 'title', 'aria-label'];
    const original = originalAttrByElement.get(element) || {};
    const next = { ...original };
    attrs.forEach((attr) => {
      if (!original[attr] && element.getAttribute(attr)) original[attr] = element.getAttribute(attr);
      if (original[attr]) {
        element.setAttribute(attr, original[attr]);
        if (!(targetLanguage === 'hi' && DEVANAGARI.test(original[attr]))) {
          const sourceLanguage = DEVANAGARI.test(original[attr]) ? 'hi' : 'en';
          const key = `${sourceLanguage}|${original[attr].trim()}`;
          if (!unique.has(key)) unique.set(key, { source: original[attr], sourceLanguage, targets: [] });
          unique.get(key).targets.push({ element, attr });
        }
      }
    });
    originalAttrByElement.set(element, next);
  });
  const entries = [...unique.values()];
  const uncached = entries.filter((item) => !translationCache.has(`${targetLanguage}|${item.sourceLanguage}|${item.source}`));
  for (let i = 0; i < uncached.length; i += 80) {
    const batch = uncached.slice(i, i + 80);
    try {
      const response = await api.translateBatch(batch.map((item) => ({ text: item.source, sourceLanguage: item.sourceLanguage, targetLanguage })));
      response.translations.forEach((item, index) => {
        if (item?.translated) translationCache.set(`${targetLanguage}|${batch[index].sourceLanguage}|${batch[index].source}`, item.translated);
      });
    } catch { /* keep the original text as a safe fallback */ }
  }
  entries.forEach((item) => {
    const translated = translationCache.get(`${targetLanguage}|${item.sourceLanguage}|${item.source}`);
    if (!translated) return;
    item.targets.forEach((target) => {
      if (target.nodeType === 3) { if (target.isConnected) target.textContent = translated; }
      else if (target.element?.isConnected) target.element.setAttribute(target.attr, translated);
    });
  });
}

export default function App() {
  const [view, setView] = useState('landing');
  const [authMode, setAuthMode] = useState('login');
  const [user, setUser] = useState(() => {
    try { const s = localStorage.getItem('samay.user'); return s ? JSON.parse(s) : null; }
    catch { return null; }
  });
  const [tab, setTab] = useState('citizen');
  const [date, setDate] = useState(todayIso);
  const [lang, setLang] = useState(() => localStorage.getItem('samay.lang') || 'en');
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [tick, setTick] = useState(0);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantPrompt, setAssistantPrompt] = useState('');
  const [assistantMessages, setAssistantMessages] = useState([]);
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantBusy, setAssistantBusy] = useState(false);
  const assistantRole = user?.role === 'officer' || user?.role === 'commission' ? user.role : 'citizen';
  const assistantProfile = ASSISTANT_PROFILES[assistantRole];

  useEffect(() => {
    setAssistantMessages([{ role: 'assistant', content: assistantProfile.greeting }]);
    setAssistantPrompt('');
    setAssistantInput('');
  }, [assistantRole]);

  const sendAssistantMessage = async (preset) => {
    const text = String(preset || assistantInput).trim();
    if (!text || assistantBusy) return;
    const nextMessage = { role: 'user', content: text };
    setAssistantInput('');
    setAssistantMessages((items) => [...items, nextMessage]);
    setAssistantBusy(true);
    try {
      const response = await api.copilot({
        role: assistantRole,
        message: text,
        history: assistantMessages,
        user,
        language: lang
      });
      setAssistantMessages((items) => [...items, { role: 'assistant', content: response.answer, provider: response.provider }]);
    } catch (error) {
      setAssistantMessages((items) => [...items, { role: 'assistant', content: error.message || 'Copilot is unavailable. Use the relevant dashboard controls and try again.' }]);
    } finally {
      setAssistantBusy(false);
    }
  };

  useEffect(() => {
    if (lang === 'en' || typeof document === 'undefined') return;
    let debounce;
    const run = () => {
      window.clearTimeout(debounce);
      debounce = window.setTimeout(() => { translateVisibleText(lang); }, 120);
    };
    const timer = window.setTimeout(run, 80);
    const root = document.getElementById('root');
    const observer = root ? new MutationObserver(run) : null;
    observer?.observe(root, { childList: true, subtree: true });
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(debounce);
      observer?.disconnect();
    };
  }, [lang, view, tab]);

  const go = (d) => { setDate(d); setDemoDate(d); setTick((t) => t + 1); };

  React.useEffect(() => setDemoDate(date), []); // eslint-disable-line
  React.useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const pickLang = (l) => { setLang(l); localStorage.setItem('samay.lang', l); };
  const enterApp = (startTab = 'citizen') => { setTab(startTab); setView('app'); };
  const handleSignOut = () => { setUser(null); localStorage.removeItem('samay.user'); setView('landing'); };
  const visibleTabs = user?.role === 'officer'
    ? TABS.filter(({ id }) => ['officer', 'compiler'].includes(id))
    : user?.role === 'commission'
      ? TABS.filter(({ id }) => id === 'commission')
      : TABS.filter(({ id }) => id === 'citizen');

  if (view === 'auth') {
    return (
      <AuthPage
        initialMode={authMode}
        lang={lang}
        onLanguageChange={pickLang}
        onAuthSuccess={(userData) => {
          setUser(userData);
          setTab(userData.tab || (userData.role === 'officer' ? 'officer' : userData.role === 'commission' ? 'commission' : 'citizen'));
          setView('app');
        }}
        onBackToHome={() => setView('landing')}
      />
    );
  }

  if (view === 'landing') {
    return (
      <Landing
        currentUser={user}
        lang={lang}
        onLanguageChange={pickLang}
        onEnterCitizen={() => enterApp('citizen')}
        onEnterOfficer={() => enterApp('officer')}
        onEnterDemo={() => enterApp('citizen')}
        onOpenAuth={(mode = 'login') => { setAuthMode(mode); setView('auth'); }}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <header role="banner">
        <div className="header-top-row">
          {/* Brand — clicking returns to landing */}
          <div className="header-brand" onClick={() => setView('landing')} title="Back to home">
            <div className="brand-emblem" aria-hidden="true"><span>S</span></div>
            <div className="brand-text">
              <h1>SAMAY<span className="hindi-title">समय</span></h1>
              <span className="brand-tagline">{t(lang, 'brandTagline')}</span>
            </div>
          </div>

          {/* Module Navigation */}
          <nav role="navigation" aria-label="Main Navigation">
            {visibleTabs.map(({ id, icon: Icon, key }) => (
              <button
                key={id}
                className={tab === id ? 'on' : ''}
                onClick={() => setTab(id)}
                aria-current={tab === id ? 'page' : undefined}
                id={`tab-${id}`}
              >
                <Icon size={15} />
                <span>{t(lang, key)}</span>
              </button>
            ))}
          </nav>

          {/* Right Controls */}
          <div className="header-controls">
            <label className="language-select" aria-label="Language selector">
              <span aria-hidden="true">文</span>
              <select value={lang} onChange={(e) => pickLang(e.target.value)}>
                {LANGUAGES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
              </select>
            </label>

            <div className={`connectivity-badge ${online ? 'online' : 'offline'}`} role="status">
              <span className="dot" aria-hidden="true" />
              <span>{online ? t(lang, 'online') : t(lang, 'offline')}</span>
            </div>

            {user ? (
              <div className="user-pill">
                <span>{user.role === 'officer' ? '🛡' : user.role === 'commission' ? '🏛' : '👤'}</span>
                <span className="user-name">{user.name.split(' ')[0]}</span>
                <button className="user-exit" onClick={handleSignOut} title={t(lang, 'signOut')}>{t(lang, 'signOut')}</button>
              </div>
            ) : (
              <button className="btn-signin" onClick={() => { setAuthMode('login'); setView('auth'); }}>
                {t(lang, 'signIn')}
              </button>
            )}
          </div>
        </div>

        {/* Simulation Bar */}
        <div className="sim-toolbar" role="region" aria-label="Demo date override">
          <div className="sim-toolbar-left">
            <span className="sim-tag">
              <IconCalendar size={12} color="#f59e0b" />
              <span>{t(lang, 'simLab')}</span>
            </span>
            <div className="sim-date-input-wrap">
              <label htmlFor="demo-date-input">{t(lang, 'date')}:</label>
              <input id="demo-date-input" type="date" value={date} onChange={(e) => go(e.target.value)} />
            </div>
          </div>
          <div className="sim-actions">
            <button title="Advance the demo clock by one day" onClick={() => go(addDays(date, 1))}>+1 day</button>
            <button title="Advance the demo clock by five days" onClick={() => go(addDays(date, 5))}>+5 days</button>
            <button title="Advance the demo clock to demonstrate a missed deadline" onClick={() => go(addDays(date, 15))}>Simulate delay</button>
            <button className="reset-btn" onClick={() => go(todayIso())}>{t(lang, 'today')}</button>
          </div>
        </div>
      </header>

      <main id="main-content" key={tick} role="main">
        {tab === 'citizen' && <Citizen today={date} lang={lang} online={online} />}
        {tab === 'officer' && <Officer />}
        {tab === 'commission' && <Commission lang={lang} />}
        {tab === 'compiler' && <Compiler />}
      </main>

      <div className="ai-helper-wrap" aria-live="polite">
        <button type="button" className="ai-helper-toggle" onClick={() => setAssistantOpen((v) => !v)}>
          <span aria-hidden="true">✦</span>
          <span>SAMAY Copilot</span>
        </button>

        {assistantOpen && (
          <aside className="ai-helper-panel" aria-label="AI helper assistant">
            <div className="ai-helper-header">
              <div>
                <div className="ai-helper-badge">{assistantRole} workspace</div>
                <h3>{assistantProfile.title}</h3>
                <p className="ai-helper-subtitle">{assistantProfile.subtitle}</p>
              </div>
              <button type="button" className="ai-helper-close" onClick={() => setAssistantOpen(false)} aria-label="Close AI helper">×</button>
            </div>

            <div className="ai-helper-prompts">
              {assistantProfile.prompts.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className={assistantPrompt === item.label ? 'selected' : ''}
                  onClick={() => { setAssistantPrompt(item.label); sendAssistantMessage(item.text); }}
                  disabled={assistantBusy}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="ai-helper-messages" aria-live="polite">
              {assistantMessages.map((item, index) => (
                <div key={`${item.role}-${index}`} className={`ai-helper-message ${item.role}`}>
                  <span className="ai-helper-message-label">{item.role === 'user' ? 'You' : 'Copilot'}</span>
                  <p>{item.content}</p>
                </div>
              ))}
              {assistantBusy && <div className="ai-helper-typing">Copilot is checking the approved context…</div>}
            </div>

            <form className="ai-helper-compose" onSubmit={(event) => { event.preventDefault(); sendAssistantMessage(); }}>
              <input
                value={assistantInput}
                onChange={(event) => setAssistantInput(event.target.value)}
                placeholder={assistantRole === 'citizen' ? 'Ask about your deadline…' : assistantRole === 'officer' ? 'Ask about the risk queue…' : 'Ask about office trends…'}
                maxLength={1200}
                disabled={assistantBusy}
                aria-label="Ask SAMAY Copilot"
              />
              <button type="submit" className="primary" disabled={assistantBusy || !assistantInput.trim()} aria-label="Send message">{assistantBusy ? '…' : 'Send'}</button>
            </form>
            <div className="ai-helper-disclaimer">Demo guidance uses approved context and never replaces officer, commission, or legal review.</div>
          </aside>
        )}
      </div>

      <footer role="contentinfo">
        <p style={{ margin: '0 0 4px 0', fontWeight: 500 }}>{t(lang, 'disclaimer')}</p>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>
          SAMAY · {t(lang, 'compliance')}
        </span>
      </footer>
    </div>
  );
}
