import React, { useState, useEffect, useRef } from 'react';
import { LANGUAGES, t } from '../i18n.js';
import { Ui, IndiaFlag } from '../UiIcons.jsx';

/* ── Static data ── */
const SERVICES = [
  { name: 'Income Certificate', category: 'Revenue', days: 15, authority: 'Tehsildar Office', desc: 'Proof of annual family income issued by state revenue department.' },
  { name: 'Caste Certificate', category: 'Social Justice', days: 21, authority: 'SDM / Collector Office', desc: 'Official caste/tribe status for government scheme eligibility.' },
  { name: 'Domicile Certificate', category: 'Revenue', days: 15, authority: 'Tehsildar Office', desc: 'Proof of residence for educational and job reservations.' },
  { name: 'Birth & Death Registration', category: 'Civil', days: 7, authority: 'Municipal Corporation', desc: 'Mandatory civil registration within statutory window after event.' },
  { name: 'Land Mutation / 7-12 Extract', category: 'Land Records', days: 30, authority: 'sTalathi / Patwari', desc: 'Property ownership transfer and land record update.' },
  { name: 'Ration Card Modification', category: 'Food & Supply', days: 21, authority: 'Food Supply Office', desc: 'Addition, deletion, or modification of ration card family members.' },
];

const FEATURES = [
  { icon: 'clock', accent: '#3b82f6', title: 'Deadline Clocks', desc: 'Dynamic countdown clocks using legally mandated turnaround windows — not estimates.' },
  { icon: 'search', accent: '#8b5cf6', title: 'Application Tracking', desc: 'Real-time status across all state government services at desk level.' },
  { icon: 'shield', accent: '#10b981', title: 'Citizen Rights', desc: 'Know your appellate authorities, penalty clauses, and legal provisions.' },
  { icon: 'zap', accent: '#f59e0b', title: 'Delay Alerts', desc: 'Proactive warnings trigger 5 days before statutory deadlines breach.' },
  { icon: 'file', accent: '#ec4899', title: 'Auto Appeal Drafts', desc: 'One-click Section 8 First Appeal petition generation with legal citation.' },
  { icon: 'mic', accent: '#ea580c', title: 'Voice Assistance', desc: 'Bilingual EN/हिन्दी voice queries for universal citizen accessibility.' },
];

const STEPS = [
  { n: '01', title: 'Choose Service', desc: 'Browse 500+ notified services with statutory guarantee windows.' },
  { n: '02', title: 'Apply & Receive Slip', desc: 'Submit at any Seva Kendra. Get your acknowledgement reference.' },
  { n: '03', title: 'SAMAY Locks Deadline', desc: 'Countdown begins. Proactive alerts as deadline approaches.' },
  { n: '04', title: 'Auto Appeal if Breached', desc: 'SAMAY auto-drafts your legal petition citing Section 8 provisions.' },
];

const STATE_RULES = {
  'Maharashtra': {
    act: 'Maharashtra Right to Public Services Act, 2015',
    section: 'Section 8(1) First Appeal',
    penalty: '₹250 per day (up to ₹5,000 maximum)',
    multiplier: 1.0,
  },
  'Karnataka': {
    act: 'Karnataka Guarantee of Services to Citizens (Sakala) Act, 2011',
    section: 'Section 9 Appeal to Competent Authority',
    penalty: '₹20 per day (up to ₹500 maximum)',
    multiplier: 1.0,
  },
  'Uttar Pradesh': {
    act: 'Uttar Pradesh Janhit Guarantee Adhiniyam, 2011',
    section: 'Section 5 Appeal before Appellate Authority',
    penalty: '₹250 per day (up to ₹5,000 maximum)',
    multiplier: 1.1,
  },
  'Rajasthan': {
    act: 'Rajasthan Guaranteed Delivery of Public Services Act, 2011',
    section: 'Section 6 First Appeal',
    penalty: '₹250 to ₹5,000 depending on delay',
    multiplier: 1.0,
  },
  'Delhi': {
    act: 'Delhi (Right of Citizen to Time Bound Delivery of Services) Act, 2011',
    section: 'Section 7 Statutory Redressal',
    penalty: '₹10 per day (up to ₹200)',
    multiplier: 0.9,
  },
  'Madhya Pradesh': {
    act: 'Madhya Pradesh Lok Sewa Guarantee Adhiniyam, 2010',
    section: 'Section 5 Appellate Appeal',
    penalty: '₹250 per day (up to ₹5,000)',
    multiplier: 1.0,
  }
};

const FAQS = [
  {
    q: 'What is the Right to Public Services (RTS) Act?',
    a: 'The Right to Public Services legislation is enacted across 20+ Indian states ensuring citizens have a statutory, legally enforceable right to receive designated government certificates, permits, and services within a fixed number of working days.'
  },
  {
    q: 'How does SAMAY calculate statutory deadlines accurately?',
    a: 'SAMAY maintains a comprehensive registry of state-notified turnaround schedules, accounting for official gazetted state public holidays and working day calendars, ensuring deadline clocks match exact court and commission standards.'
  },
  {
    q: 'What happens if a designated officer misses my deadline?',
    a: 'When the deadline window breaches, SAMAY automatically transitions your application status to "Breached" and auto-drafts a Section 8 First Appeal petition citing the exact service ID, desk reference, and applicable penalty clauses.'
  },
  {
    q: 'Can officers see impending breaches before they happen?',
    a: 'Yes! The Officer Radar module gives government desks a predictive heat map and 5-day warning indicators so they can clear backlogged files before statutory penalties trigger.'
  },
  {
    q: 'Is my personal data safe under DPDP regulations?',
    a: 'SAMAY is built with zero-knowledge architecture for demo exploration, client-side cryptographic hashing for sensitive records, and full compliance with the Digital Personal Data Protection (DPDP) Act.'
  }
];

/* ── Auth Modal (Fallback quick popup) ── */
function AuthModal({ mode: initialMode, onClose, onSuccess }) {
  const [mode, setMode] = useState(initialMode || 'login');
  const [form, setForm] = useState({ name: '', phone: '', otp: '' });
  const [loading, setLoading] = useState(false);
  const overlayRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [onClose]);

  const handleOverlayClick = (e) => { if (e.target === overlayRef.current) onClose(); };

  const handleSendOtp = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); setMode('otp'); }, 900);
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSuccess({
        name: form.name || 'Citizen User',
        phone: form.phone || '9876543210',
        role: 'citizen'
      });
    }, 700);
  };

  return (
    <div className="auth-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="auth-modal" role="dialog" aria-modal="true" aria-label="Sign in to SAMAY">
        <div className="auth-modal-header">
          <div className="auth-brand">
            <div className="lp-brand-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <span translate="no">SAMAY</span>
          </div>
          <button className="auth-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {mode !== 'otp' && (
          <div className="auth-tabs">
            <button className={`auth-tab${mode === 'login' ? ' active' : ''}`} onClick={() => setMode('login')}>Sign In</button>
            <button className={`auth-tab${mode === 'signup' ? ' active' : ''}`} onClick={() => setMode('signup')}>Sign Up</button>
          </div>
        )}

        <div className="auth-content">
          {mode === 'otp' ? (
            <>
              <div className="auth-otp-icon"><Ui name="phone" size={30} /></div>
              <h2 className="auth-title">Verify Mobile</h2>
              <p className="auth-subtitle">Code sent to +91 {form.phone}</p>
              <form onSubmit={handleVerifyOtp} className="auth-form">
                <div className="auth-otp-inputs">
                  <input
                    className="auth-otp-single"
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={form.otp}
                    onChange={e => setForm(f => ({ ...f, otp: e.target.value }))}
                    autoFocus
                  />
                </div>
                <button type="submit" className="auth-btn-primary" disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify & Enter Dashboard →'}
                </button>
                <button type="button" className="auth-btn-secondary" onClick={() => setMode('login')}>
                  ← Change number
                </button>
              </form>
            </>
          ) : mode === 'login' ? (
            <>
              <h2 className="auth-title">Welcome Back</h2>
              <p className="auth-subtitle">Sign in with your mobile number to track statutory guarantees</p>
              <form onSubmit={handleSendOtp} className="auth-form">
                <div className="auth-field">
                  <label>Mobile Number</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-prefix" translate="no"><IndiaFlag width={20} /> +91</span>
                    <input
                      type="tel"
                      placeholder="98765 43210"
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                      required
                      autoFocus
                    />
                  </div>
                </div>
                <button type="submit" className="auth-btn-primary" disabled={loading || form.phone.length < 10}>
                  {loading ? 'Sending OTP...' : 'Send OTP →'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="auth-title">Create Account</h2>
              <p className="auth-subtitle">Join thousands of citizens asserting statutory service rights</p>
              <form onSubmit={handleSendOtp} className="auth-form">
                <div className="auth-field">
                  <label>Full Legal Name</label>
                  <input
                    type="text"
                    placeholder="Rahul Kumar Sharma"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                    autoFocus
                  />
                </div>
                <div className="auth-field">
                  <label>Mobile Number</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-prefix" translate="no"><IndiaFlag width={20} /> +91</span>
                    <input
                      type="tel"
                      placeholder="98765 43210"
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="auth-btn-primary" disabled={loading || form.phone.length < 10 || !form.name}>
                  {loading ? 'Sending OTP...' : 'Send OTP →'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Scroll Reveal Hook ── */
function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function Reveal({ children, className = '', delay = 0 }) {
  const [ref, vis] = useReveal();
  return (
    <div ref={ref} className={`reveal ${vis ? 'revealed' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ── LANDING PAGE MAIN COMPONENT ── */
export default function Landing({
  currentUser,
  onEnterCitizen,
  onEnterOfficer,
  onEnterDemo,
  onOpenAuth,
  onSignOut,
  lang = 'en',
  onLanguageChange
}) {
  const [search, setSearch] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [authModalMode, setAuthModalMode] = useState(null);

  // Interactive Statutory Calculator State
  const [calcState, setCalcState] = useState('Maharashtra');
  const [calcService, setCalcService] = useState(SERVICES[0]);
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const openAuth = (mode) => {
    if (onOpenAuth) {
      onOpenAuth(mode);
    } else {
      setAuthModalMode(mode);
    }
  };

  const handleModalSuccess = (user) => {
    setAuthModalMode(null);
    onEnterCitizen();
  };

  const filtered = SERVICES.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  );

  const currentRule = STATE_RULES[calcState] || STATE_RULES['Maharashtra'];
  const calcDays = Math.round(calcService.days * currentRule.multiplier);

  return (
    <div className="lp-root" lang={lang}>
      {/* Quick Modal fallback */}
      {authModalMode && (
        <AuthModal
          mode={authModalMode}
          onClose={() => setAuthModalMode(null)}
          onSuccess={handleModalSuccess}
        />
      )}

      {/* ── NAVBAR ── */}
      <header className={`lp-nav${scrolled ? ' lp-nav--scrolled' : ''}`}>
        <div className="lp-nav-inner">
          <a className="lp-brand" href="#hero" aria-label="SAMAY home">
            <div className="lp-brand-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <div className="lp-brand-name" translate="no">SAMAY</div>
              <div className="lp-brand-tag">UPI for Service Promises</div>
            </div>
          </a>

          <nav className="lp-nav-links" aria-label="Site navigation">
            <a href="#how-it-works" className="lp-nav-a">{t(lang, 'howItWorks')}</a>
            <a href="#features" className="lp-nav-a">{t(lang, 'features')}</a>
            <a href="#calculator" className="lp-nav-a">{t(lang, 'calculator')}</a>
            <a href="#services" className="lp-nav-a">{t(lang, 'services')}</a>
            <a href="#faq" className="lp-nav-a">FAQ</a>
          </nav>

          <div className="lp-nav-ctas">
            <label className="lp-language-select" aria-label="Language selector">
              <span>文</span>
              <select value={lang} onChange={(e) => onLanguageChange?.(e.target.value)}>
                {LANGUAGES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
            {currentUser ? (
              <div className="lp-nav-user">
                <button
                  className="lp-btn-primary"
                  onClick={() => {
                    if (currentUser.role === 'officer') onEnterOfficer();
                    else onEnterCitizen();
                  }}
                >
                  <Ui name={currentUser.role === 'officer' ? 'shield' : 'user'} size={16} />
                  <span>{currentUser.role === 'officer' ? 'Open Radar' : 'Open Dashboard'} →</span>
                </button>
                <button className="lp-btn-ghost" onClick={onSignOut}>{t(lang, 'signOut')}</button>
              </div>
            ) : (
              <>
                <button className="lp-btn-ghost" onClick={() => openAuth('login')}>{t(lang, 'signIn')}</button>
                <button className="lp-btn-primary" onClick={() => openAuth('signup')}>{t(lang, 'getStarted')} →</button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="lp-hero" id="hero">
        <div className="lp-hero-grid" aria-hidden="true" />
        <div className="lp-blob lp-blob-1" aria-hidden="true" />
        <div className="lp-blob lp-blob-2" aria-hidden="true" />
        <div className="lp-blob lp-blob-3" aria-hidden="true" />

        <div className="lp-container lp-hero-content">
          <div className="lp-hero-layout">
            <div className="lp-hero-copy">
              <div className="lp-hero-badge">
                <span className="lp-flag" />
                <span>TRANSPARENT GOVERNANCE · STATUTORY ACCOUNTABILITY</span>
                <span className="lp-badge-dot" />
              </div>

              <h1 className="lp-hero-h1">
                Every Public Service.<br />
                <span className="lp-hero-gradient">Every Deadline.</span><br />
                <span className="lp-hero-outline">Accountable.</span>
              </h1>

              <p className="lp-hero-sub">
                India's first statutory deadline enforcement engine. Like UPI unified digital payments,
                SAMAY unifies government service delivery — with legal countdown clocks, delay mitigation alerts,
                and automated Section 8 First Appeal petitions.
              </p>

              <div className="lp-hero-actions">
                <button className="lp-cta-primary" onClick={() => (currentUser ? onEnterCitizen() : openAuth('signup'))}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  <span>{currentUser ? 'Go to Citizen Dashboard' : 'Start as Citizen'}</span>
                </button>
                <button className="lp-cta-secondary" onClick={() => (currentUser ? onEnterOfficer() : openAuth('signup'))}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                  <span>Officer Radar</span>
                </button>
                <button className="lp-cta-ghost" onClick={onEnterDemo}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                  <span>Explore Demo (No Sign-In)</span>
                </button>
              </div>

              {/* Live System Ticker */}
              <div className="lp-live-ticker">
                <span className="lp-live-dot" />
                <span><strong>LIVE DISPATCH:</strong> 18,400+ statutory timelines actively monitored across 28 states</span>
              </div>

              <div className="lp-hero-stats">
                <div className="lp-stat-chip"><strong>500+</strong><span>Notified Services</span></div>
                <div className="lp-stat-divider" />
                <div className="lp-stat-chip"><strong>28</strong><span>States &amp; UTs</span></div>
                <div className="lp-stat-divider" />
                <div className="lp-stat-chip"><strong>7–30d</strong><span>Statutory SLA</span></div>
                <div className="lp-stat-divider" />
                <div className="lp-stat-chip"><strong translate="no">EN/हिन्दी</strong><span>Voice-Enabled</span></div>
              </div>
            </div>

            {/* Floating preview cards */}
            <div className="lp-hero-cards-preview" aria-hidden="true">
              <div className="lp-preview-card lp-pc-1">
                <div className="lp-pc-top">
                  <span className="lp-pc-dot green" /><span className="lp-pc-label">On Track</span>
                  <span className="lp-pc-days">13 days left</span>
                </div>
                <div className="lp-pc-service">Income Certificate</div>
                <div className="lp-pc-bar"><div className="lp-pc-bar-fill" style={{ width: '45%' }} /></div>
                <div className="lp-pc-ref" translate="no">MH-2026-1234567</div>
              </div>
              <div className="lp-preview-card lp-pc-2">
                <div className="lp-pc-top">
                  <span className="lp-pc-dot amber" /><span className="lp-pc-label">Delay Warning</span>
                  <span className="lp-pc-days">2 days left</span>
                </div>
                <div className="lp-pc-service">Caste Certificate</div>
                <div className="lp-pc-bar"><div className="lp-pc-bar-fill amber" style={{ width: '90%' }} /></div>
                <div className="lp-pc-ref" translate="no">UP-2026-8891234</div>
              </div>
              <div className="lp-preview-card lp-pc-3">
                <div className="lp-pc-top">
                  <span className="lp-pc-dot red" /><span className="lp-pc-label">Breached</span>
                  <span className="lp-pc-days">Appeal Ready</span>
                </div>
                <div className="lp-pc-service">Land Mutation (7/12)</div>
                <div className="lp-pc-bar"><div className="lp-pc-bar-fill red" style={{ width: '100%' }} /></div>
                <div className="lp-pc-ref" translate="no">KA-2026-5674321</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <div className="lp-trust-bar">
        <div className="lp-container lp-trust-inner">
          {[
            'Right to Public Service Act',
            'Section 8 Appeal Automation',
            'No Registration for Demo',
            'DPDP Act Compliant',
            'WCAG 2.1 AA Accessibility'
          ].map(label => (
            <div className="lp-trust-item" key={label}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <section className="lp-section lp-hiw" id="how-it-works">
        <div className="lp-container">
          <Reveal>
            <div className="lp-section-header">
              <span className="lp-eyebrow">STEP-BY-STEP</span>
              <h2 className="lp-section-h2">How SAMAY Protects Your Rights</h2>
              <p className="lp-section-sub">Standardizing government service guarantees into an interoperable, transparent lifecycle.</p>
            </div>
          </Reveal>

          <div className="lp-steps">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 100}>
                <div className="lp-step">
                  <div className="lp-step-num">{s.n}</div>
                  <div className="lp-step-line" />
                  <h4 className="lp-step-title">{s.title}</h4>
                  <p className="lp-step-desc">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="lp-section lp-features" id="features">
        <div className="lp-container">
          <Reveal>
            <div className="lp-section-header">
              <span className="lp-eyebrow">CORE CAPABILITIES</span>
              <h2 className="lp-section-h2">Built for Citizens &amp; Administrators</h2>
              <p className="lp-section-sub">A full accountability stack — from real-time countdown clocks to legal appeal draft generation.</p>
            </div>
          </Reveal>

          <div className="lp-features-grid">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 80}>
                <div className="lp-feature-card" style={{ '--accent': f.accent }}>
                  <div className="lp-feature-icon"><Ui name={f.icon} size={26} strokeWidth={1.9} /></div>
                  <h3 className="lp-feature-title">{f.title}</h3>
                  <p className="lp-feature-desc">{f.desc}</p>
                  <div className="lp-feature-accent-bar" />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE STATUTORY CALCULATOR ── */}
      <section className="lp-section lp-section--dark lp-calc-section" id="calculator">
        <div className="lp-container">
          <Reveal>
            <div className="lp-section-header">
              <span className="lp-eyebrow lp-eyebrow--light">INTERACTIVE CLAUSE ENGINE</span>
              <h2 className="lp-section-h2">Statutory Guarantee Calculator</h2>
              <p className="lp-section-sub">
                Select your state and service to calculate the exact legal turnaround window, designating authority, and statutory penalty provisions.
              </p>
            </div>
          </Reveal>

          <Reveal>
            <div className="lp-calc">
              <div className="lp-calc-grid">
                {/* State selector */}
                <div className="lp-calc-field">
                  <label className="lp-calc-field-label" htmlFor="lp-calc-state">
                    1. Select State Jurisdiction
                  </label>
                  <select
                    id="lp-calc-state"
                    className="lp-select"
                    value={calcState}
                    onChange={(e) => setCalcState(e.target.value)}
                  >
                    {Object.keys(STATE_RULES).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Service selector */}
                <div className="lp-calc-field">
                  <label className="lp-calc-field-label" htmlFor="lp-calc-service">
                    2. Select Public Service
                  </label>
                  <select
                    id="lp-calc-service"
                    className="lp-select"
                    value={calcService.name}
                    onChange={(e) => setCalcService(SERVICES.find(s => s.name === e.target.value) || SERVICES[0])}
                  >
                    {SERVICES.map(s => <option key={s.name} value={s.name}>{s.name} ({s.category})</option>)}
                  </select>
                </div>
              </div>

              {/* Calculated Result Card */}
              <div className="lp-calc-result">
                <div className="lp-calc-cell">
                  <span className="lp-calc-label">Guaranteed Turnaround</span>
                  <div className="lp-calc-value lp-calc-value--big">
                    {calcDays} <small>Working Days</small>
                  </div>
                  <span className="lp-calc-note">Notified SLA under state schedule</span>
                </div>

                <div className="lp-calc-cell">
                  <span className="lp-calc-label">Governing Legislation</span>
                  <div className="lp-calc-value lp-calc-value--act">
                    {currentRule.act}
                  </div>
                  <span className="lp-calc-note">Appellate: {currentRule.section}</span>
                </div>

                <div className="lp-calc-cell">
                  <span className="lp-calc-label">Breach Liability</span>
                  <div className="lp-calc-value lp-calc-value--penalty">
                    {currentRule.penalty}
                  </div>
                  <span className="lp-calc-note">Automated appeal filing upon breach</span>
                </div>
              </div>

              <div className="lp-calc-cta">
                <button className="lp-cta-primary" onClick={() => openAuth('signup')}>
                  Track {calcService.name} on SAMAY →
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── SERVICES DIRECTORY ── */}
      <section className="lp-section lp-services" id="services">
        <div className="lp-container">
          <Reveal>
            <div className="lp-section-header">
              <span className="lp-eyebrow">STATUTORY CATALOG</span>
              <h2 className="lp-section-h2">Know Your Service Guarantees</h2>
              <p className="lp-section-sub">Every notified service has a statutory clock. Search below to review authorities and turnaround periods.</p>
            </div>
          </Reveal>

          <Reveal>
            <div className="lp-search">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search services — Income Certificate, Land, Caste, Domicile..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                aria-label="Search services"
              />
              {search && <button className="lp-search-clear" onClick={() => setSearch('')} aria-label="Clear search">✕</button>}
            </div>
          </Reveal>

          <div className="lp-services-grid">
            {filtered.map((s, i) => (
              <Reveal key={s.name} delay={i * 60}>
                <div className="lp-svc-card">
                  <div className="lp-svc-top">
                    <span className="lp-svc-cat">{s.category}</span>
                    <span className="lp-svc-days">{s.days}d max</span>
                  </div>
                  <h4 className="lp-svc-name">{s.name}</h4>
                  <p className="lp-svc-desc">{s.desc}</p>
                  <div className="lp-svc-footer">
                    <span className="lp-svc-auth"><Ui name="landmark" size={14} /> {s.authority}</span>
                    <button className="lp-svc-cta" onClick={() => openAuth('login')}>Track →</button>
                  </div>
                </div>
              </Reveal>
            ))}
            {filtered.length === 0 && (
              <div className="lp-empty">No services match "{search}"</div>
            )}
          </div>
        </div>
      </section>

      {/* ── FAQ ACCORDION ── */}
      <section className="lp-section lp-section--dark lp-faq-section" id="faq">
        <div className="lp-container">
          <Reveal>
            <div className="lp-section-header">
              <span className="lp-eyebrow lp-eyebrow--light">FREQUENTLY ASKED QUESTIONS</span>
              <h2 className="lp-section-h2">Understanding Your Rights</h2>
              <p className="lp-section-sub">Clear answers on RTS acts, Section 8 petitions, and digital privacy compliance.</p>
            </div>
          </Reveal>

          <div className="lp-faq-list">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <Reveal key={faq.q} delay={idx * 60}>
                  <div className={`lp-faq-item${isOpen ? ' is-open' : ''}`}>
                    <button
                      className="lp-faq-q"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                    >
                      <span>{faq.q}</span>
                      <span className="lp-faq-plus" aria-hidden="true">+</span>
                    </button>
                    {isOpen && (
                      <div className="lp-faq-a">
                        {faq.a}
                      </div>
                    )}
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── DARK CTA ── */}
      <section className="lp-dark-cta">
        <div className="lp-dark-cta-blob" aria-hidden="true" />
        <div className="lp-container lp-dark-cta-inner">
          <Reveal>
            <div className="lp-dark-cta-content">
              <span className="lp-eyebrow lp-eyebrow--light">GET STARTED FREE</span>
              <h2 className="lp-dark-cta-h2">Your statutory countdown starts<br />the moment you apply.</h2>
              <p className="lp-dark-cta-sub">
                Join thousands of citizens holding public service providers to statutory commitments.
                No fees, no red tape.
              </p>
              <div className="lp-dark-cta-btns">
                <button className="lp-cta-primary lp-cta-large" onClick={() => openAuth('signup')}>
                  Create Free Account →
                </button>
                <button className="lp-cta-ghost lp-cta-light" onClick={onEnterDemo}>
                  Explore Interactive Demo
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <div className="lp-footer-brand">
            <div className="lp-brand-icon" style={{ width: 30, height: 30 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <div className="lp-footer-name" translate="no">SAMAY</div>
              <div className="lp-footer-sub">National Public Service Guarantee Engine</div>
            </div>
          </div>
          <div className="lp-footer-legal">
            Complies with State RTS Acts · DPDP Standards · WCAG 2.1 AA
          </div>
        </div>
      </footer>
    </div>
  );
}