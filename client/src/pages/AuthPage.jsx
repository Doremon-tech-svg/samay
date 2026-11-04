import React, { useState } from 'react';
import { useEffect } from 'react';
import { api } from '../api.js';
import { IconUser, IconRadar, IconMap } from '../Icons.jsx';
import { Ui, IndiaFlag } from '../UiIcons.jsx';

const DEMO_USERS = {
  citizen: [
    { name: 'Aarav Sharma', phone: '9820011223', tab: 'citizen' },
    { name: 'Meera Nair', phone: '9000000001', tab: 'citizen' },
    { name: 'Rohan Mehta', phone: '9000000013', tab: 'citizen' },
    { name: 'Sneha Kulkarni', phone: '9000000014', tab: 'citizen' }
  ],
  officer: [
    { name: 'Officer Rajesh Patil', phone: '9811022334', officerId: 'MH-PUNE-REV-84', department: 'Revenue Department', tab: 'officer' },
    { name: 'Officer Meenal Joshi', phone: '9811022335', officerId: 'MH-NASHIK-REV-11', department: 'Revenue Department', tab: 'officer' },
    { name: 'Officer Sanjay Rane', phone: '9811022336', officerId: 'MH-NAGPUR-REV-22', department: 'Revenue Department', tab: 'officer' },
    { name: 'Officer Priya Iyer', phone: '9811022337', officerId: 'TN-CHENNAI-REV-05', department: 'Taluk Revenue', tab: 'officer' }
  ],
  commission: [
    { name: 'Chief Commissioner Anita Varma', phone: '9899033445', officerId: 'RTS-COMM-01', tab: 'commission' },
    { name: 'Commissioner Neha Pandey', phone: '9899033446', officerId: 'RTS-COMM-02', tab: 'commission' },
    { name: 'Commissioner S. Krishnan', phone: '9899033447', officerId: 'RTS-COMM-03', tab: 'commission' }
  ]
};

export default function AuthPage({ initialMode = 'login', onAuthSuccess, onBackToHome }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'signup'
  const [role, setRole] = useState('citizen'); // 'citizen' | 'officer' | 'commission'
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'

  const [form, setForm] = useState({
    name: '',
    phone: '',
    officerId: '',
    department: 'Revenue & Land Records',
    otp: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableDemoUsers, setAvailableDemoUsers] = useState({
    citizens: DEMO_USERS.citizen,
    officers: DEMO_USERS.officer,
    commission: DEMO_USERS.commission
  });
  useEffect(() => {
    api.demoUsers().then(setAvailableDemoUsers).catch(() => { /* static fallback keeps demo usable offline */ });
  }, []);

  const handleSendOtp = (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'signup' && !form.name.trim()) {
      setError('Please enter your full legal name');
      return;
    }

    if (form.phone.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep('otp');
    }, 800);
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    setError('');

    if (form.otp.length < 4) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const user = {
        name: form.name.trim() || (role === 'officer' ? 'Officer K. Sharma' : role === 'commission' ? 'Commissioner S. Gupta' : 'Citizen Rahul Kumar'),
        phone: form.phone || '9876543210',
        role: role,
        department: form.department,
        officerId: form.officerId || (role === 'officer' ? 'MH-REV-420' : 'AP-COMM-01')
      };
      localStorage.setItem('samay.user', JSON.stringify(user));
      onAuthSuccess(user);
    }, 700);
  };

  const handleQuickDemoLogin = (demoRole, demoUserOverride) => {
    setLoading(true);
    setTimeout(() => {
      const demoUser = demoUserOverride || {
        citizen: { name: 'Aarav Sharma', phone: '9820011223', role: 'citizen', tab: 'citizen' },
        officer: { name: 'Officer Rajesh Patil', phone: '9811022334', role: 'officer', officerId: 'MH-PUNE-REV-84', department: 'Revenue Department', tab: 'officer' },
        commission: { name: 'Chief Commissioner Anita Varma', phone: '9899033445', role: 'commission', officerId: 'RTS-COMM-01', tab: 'commission' }
      }[demoRole];
      localStorage.setItem('samay.user', JSON.stringify(demoUser));
      onAuthSuccess({ ...demoUser, role: demoRole });
    }, 400);
  };

  return (
    <div className="auth-page-root">
      {/* Main split container */}
      <div className="auth-page-container">
        {/* Left Side: Brand & Impact Showcase */}
        <div className="auth-hero-panel">
          <div className="lp-shapes auth-shapes" aria-hidden="true"><i className="s1" /><i className="s2" /><i className="s3" /><i className="s4" /><i className="s5" /><i className="s6" /><i className="s7" /><i className="s8" /><i className="s9" /></div>
          <div className="auth-hero-header">
            <button className="auth-back-link" onClick={onBackToHome}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>Back to Home</span>
            </button>
            <div className="auth-panel-emblem">
              <span className="auth-emblem-badge" translate="no">S</span>
              <div className="auth-panel-brand-text">
                <span className="auth-brand-title" translate="no">SAMAY</span>
                <span className="auth-brand-sub">Public Service Guarantee Engine</span>
              </div>
            </div>
          </div>

          <div className="auth-hero-content">
            <div className="auth-pill-tag">
              <span className="pulse-dot" />
              <span>Statutory Accountability Framework</span>
            </div>
            <h1 className="auth-hero-heading">
              Enforcing public deadlines with <span className="auth-highlight">legal precision</span>.
            </h1>
            <p className="auth-hero-description">
              Access real-time countdown clocks, proactive delay mitigation alerts, and automated Section 8 First Appeal petitions backed by State Right to Service Acts.
            </p>

            <div className="auth-feature-list">
              <div className="auth-feature-item">
                <div className="auth-feature-icon"><Ui name="clock" size={17} /></div>
                <div>
                  <strong>Statutory Countdown Clocks</strong>
                  <p>Guaranteed turnaround windows across 500+ notified services.</p>
                </div>
              </div>
              <div className="auth-feature-item">
                <div className="auth-feature-icon"><Ui name="scale" size={17} /></div>
                <div>
                  <strong>Section 8 Appeal Auto-Drafter</strong>
                  <p>One-click petition generation with exact statutory clause citation.</p>
                </div>
              </div>
              <div className="auth-feature-item">
                <div className="auth-feature-icon"><Ui name="radar" size={17} /></div>
                <div>
                  <strong>Interoperable Desk Radar</strong>
                  <p>Real-time queue analytics and risk forecasting for government officers.</p>
                </div>
              </div>
            </div>

            <div className="auth-stats-strip">
              <div className="auth-stat-col">
                <strong>28</strong>
                <span>States Covered</span>
              </div>
              <div className="auth-stat-sep" />
              <div className="auth-stat-col">
                <strong>100%</strong>
                <span>RTS Act Compliance</span>
              </div>
              <div className="auth-stat-sep" />
              <div className="auth-stat-col">
                <strong translate="no">0 ₹</strong>
                <span>Free for Citizens</span>
              </div>
            </div>
          </div>

          <div className="auth-hero-footer">
            <span>Complies with Digital Personal Data Protection Standards (DPDP Act)</span>
          </div>
        </div>

        {/* Right Side: Interactive Auth Form */}
        <div className="auth-form-panel">
          <div className="auth-card">
            {/* Top Switcher (Sign In vs Sign Up) */}
            <div className="auth-toggle-bar">
              <button
                className={`auth-toggle-btn ${mode === 'login' ? 'active' : ''}`}
                onClick={() => { setMode('login'); setStep('phone'); setError(''); }}
              >
                Sign In
              </button>
              <button
                className={`auth-toggle-btn ${mode === 'signup' ? 'active' : ''}`}
                onClick={() => { setMode('signup'); setStep('phone'); setError(''); }}
              >
                Create Account
              </button>
            </div>

            {/* Role Selector */}
            <div className="auth-role-tabs">
              <button
                type="button"
                className={`auth-role-tab ${role === 'citizen' ? 'selected' : ''}`}
                onClick={() => setRole('citizen')}
              >
                <IconUser size={15} />
                <span>Citizen</span>
              </button>
              <button
                type="button"
                className={`auth-role-tab ${role === 'officer' ? 'selected' : ''}`}
                onClick={() => setRole('officer')}
              >
                <IconRadar size={15} />
                <span>Officer</span>
              </button>
              <button
                type="button"
                className={`auth-role-tab ${role === 'commission' ? 'selected' : ''}`}
                onClick={() => setRole('commission')}
              >
                <IconMap size={15} />
                <span>Commission</span>
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="auth-alert-error" role="alert">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                <span>{error}</span>
              </div>
            )}

            {/* Form Steps */}
            {step === 'phone' ? (
              <form onSubmit={handleSendOtp} className="auth-main-form">
                <div className="auth-form-header">
                  <h2 className="auth-form-title">
                    {mode === 'login' ? 'Welcome to SAMAY' : 'Create your SAMAY Account'}
                  </h2>
                  <p className="auth-form-subtitle">
                    {role === 'citizen'
                      ? 'Track your service applications and safeguard statutory guarantees.'
                      : role === 'officer'
                        ? 'Manage desk workloads and clear incoming citizen queues before breach.'
                        : 'Monitor state-wide service guarantee performance and compliance.'}
                  </p>
                </div>

                {mode === 'signup' && (
                  <div className="auth-input-group">
                    <label>Full Legal Name</label>
                    <input
                      type="text"
                      className="auth-text-input"
                      placeholder="e.g. Rahul Kumar Sharma"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>
                )}

                {role === 'officer' && (
                  <div className="auth-input-group">
                    <label>Government Officer / Desk ID</label>
                    <input
                      type="text"
                      className="auth-text-input"
                      placeholder="e.g. MH-REV-DESK-42"
                      value={form.officerId}
                      onChange={(e) => setForm({ ...form, officerId: e.target.value })}
                    />
                  </div>
                )}

                <div className="auth-input-group">
                  <label>Mobile Number (for instant OTP verification)</label>
                  <div className="auth-phone-input-wrap">
                    <span className="auth-phone-prefix" translate="no"><IndiaFlag width={20} /> +91</span>
                    <input
                      type="tel"
                      className="auth-phone-input"
                      placeholder="98765 43210"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      required
                    />
                  </div>
                  <span className="auth-input-hint">No password required. Fast login via mobile OTP.</span>
                </div>

                <button
                  type="submit"
                  className="auth-btn-primary"
                  disabled={loading || form.phone.length < 10}
                >
                  {loading ? (
                    <span className="auth-loading-spinner" />
                  ) : (
                    <>
                      <span>{mode === 'login' ? 'Continue with OTP' : 'Create Free Account'}</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="auth-main-form">
                <div className="auth-form-header">
                  <div className="auth-otp-badge"><Ui name="mail" size={26} /></div>
                  <h2 className="auth-form-title">Enter Verification Code</h2>
                  <p className="auth-form-subtitle">
                    We sent a 6-digit one-time code to <strong translate="no">+91 {form.phone}</strong>
                  </p>
                </div>

                <div className="auth-input-group">
                  <div className="auth-otp-field-row">
                    <input
                      type="text"
                      maxLength={6}
                      className="auth-otp-code-input"
                      placeholder="123456"
                      value={form.otp}
                      onChange={(e) => setForm({ ...form, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                      autoFocus
                    />
                  </div>
                  <div className="auth-otp-hint-row">
                    <span className="auth-input-hint">Demo code: enter any 6 digits (e.g. 123456)</span>
                    <button
                      type="button"
                      className="auth-resend-link"
                      onClick={() => setForm({ ...form, otp: '849201' })}
                    >
                      Autofill OTP
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="auth-btn-primary"
                  disabled={loading || form.otp.length < 4}
                >
                  {loading ? (
                    <span className="auth-loading-spinner" />
                  ) : (
                    <>
                      <span>Verify &amp; Enter Dashboard</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="auth-btn-secondary"
                  onClick={() => setStep('phone')}
                >
                  ← Change Mobile Number
                </button>
              </form>
            )}

            {/* Quick Demo Access Buttons */}
            <div className="auth-divider-label">
              <span>OR INSTANT DEMO ACCESS</span>
            </div>

            <div className="auth-quick-demo-buttons">
              {availableDemoUsers.citizens.map((user) => (
                <button
                  key={user.phone}
                  type="button"
                  className="auth-quick-btn citizen"
                  onClick={() => handleQuickDemoLogin('citizen', { ...user, role: 'citizen' })}
                >
                  <div className="auth-quick-icon"><Ui name="user" size={18} /></div>
                  <div className="auth-quick-info">
                    <strong>Citizen Demo</strong>
                    <span>{user.name} · {user.state || 'Citizen'} · {user.district || user.phone}</span>
                  </div>
                  <span className="auth-quick-arrow">→</span>
                </button>
              ))}

              {availableDemoUsers.officers.map((user) => (
                <button
                  key={user.phone}
                  type="button"
                  className="auth-quick-btn officer"
                  onClick={() => handleQuickDemoLogin('officer', { ...user, role: 'officer' })}
                >
                  <div className="auth-quick-icon"><Ui name="shield" size={18} /></div>
                  <div className="auth-quick-info">
                    <strong>Officer Radar Demo</strong>
                    <span>{user.name} · {user.district || user.department} · {user.officerId}</span>
                  </div>
                  <span className="auth-quick-arrow">→</span>
                </button>
              ))}

              {availableDemoUsers.commission.map((user) => (
                <button
                  key={user.phone}
                  type="button"
                  className="auth-quick-btn commission"
                  onClick={() => handleQuickDemoLogin('commission', { ...user, role: 'commission' })}
                >
                  <div className="auth-quick-icon"><Ui name="landmark" size={18} /></div>
                  <div className="auth-quick-info">
                    <strong>Appellate Commission Demo</strong>
                    <span>{user.name} · {user.officerId}</span>
                  </div>
                  <span className="auth-quick-arrow">→</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
