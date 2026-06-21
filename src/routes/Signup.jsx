import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const isDev = import.meta.env.DEV;

export function Signup() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If we arrived here from a login "please verify" redirect, jump to step 2.
  const preEmail = location.state?.verifyEmail || '';
  const [step, setStep] = useState(preEmail ? 'verify' : 'details');
  const [email, setEmail] = useState(preEmail);

  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '', phone: '' });
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validateDetails = () => {
    if (form.username.trim().length < 3) return 'Username must be at least 3 characters.';
    if (!EMAIL_RE.test(form.email)) return 'Enter a valid email address.';
    if (form.password.length < 8) return 'Password must be at least 8 characters.';
    if (form.password !== form.confirm) return 'Passwords do not match.';
    return '';
  };

  const submitDetails = async (e) => {
    e.preventDefault();
    const msg = validateDetails();
    if (msg) { setError(msg); return; }
    setError('');
    setSubmitting(true);
    try {
      const { email: registered } = await api('/auth/signup', {
        method: 'POST',
        body: {
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
          phone: form.phone.trim() || undefined,
        },
      });
      setEmail(registered);
      setStep('verify');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitCode = async (e) => {
    e.preventDefault();
    if (!code.trim()) { setError('Enter the 6-digit code.'); return; }
    setError('');
    setSubmitting(true);
    try {
      const { user } = await api('/auth/verify', { method: 'POST', body: { email, code: code.trim() } });
      setUser(user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'verify') {
    return (
      <div className="max-w-6xl mx-auto px-5 py-16">
        <form className="auth-card" onSubmit={submitCode} noValidate>
          <span className="eyebrow">Almost there</span>
          <h1 className="text-3xl mt-2 mb-2">Check your email</h1>
          <p className="text-sm text-ink-soft mb-6">
            We sent a 6-digit code to <strong>{email}</strong>. Enter it below to finish.
          </p>

          {error && <p className="field-error mb-4">{error}</p>}

          <div className="mb-6">
            <label className="label" htmlFor="code">Verification code</label>
            <input id="code" className="input tracking-[0.4em] text-center font-mono" inputMode="numeric"
                   maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                   placeholder="000000" />
          </div>

          <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
            {submitting ? 'Verifying…' : 'Verify & continue'}
          </button>

          {isDev && (
            <p className="form-note mt-5">
              Dev mode: the code is printed in the API server console (no email is sent).
            </p>
          )}
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-5 py-16">
      <form className="auth-card" onSubmit={submitDetails} noValidate>
        <span className="eyebrow">Join the board</span>
        <h1 className="text-3xl mt-2 mb-6">Create your account</h1>

        {error && <p className="field-error mb-4">{error}</p>}

        <div className="mb-4">
          <label className="label" htmlFor="username">Username</label>
          <input id="username" className="input" value={form.username} onChange={update('username')}
                 autoComplete="username" placeholder="jane_doe" />
        </div>

        <div className="mb-4">
          <label className="label" htmlFor="email">Email</label>
          <input id="email" className="input" type="email" value={form.email} onChange={update('email')}
                 autoComplete="email" placeholder="you@example.com" />
        </div>

        <div className="mb-4">
          <label className="label" htmlFor="password">Password</label>
          <input id="password" className="input" type="password" value={form.password} onChange={update('password')}
                 autoComplete="new-password" placeholder="At least 8 characters" />
        </div>

        <div className="mb-4">
          <label className="label" htmlFor="confirm">Confirm password</label>
          <input id="confirm" className="input" type="password" value={form.confirm} onChange={update('confirm')}
                 autoComplete="new-password" placeholder="Re-enter your password" />
        </div>

        <div className="mb-6">
          <label className="label" htmlFor="phone">Phone <span className="normal-case text-ink-soft">(optional)</span></label>
          <input id="phone" className="input" value={form.phone} onChange={update('phone')}
                 autoComplete="tel" placeholder="So buyers can reach you" />
        </div>

        <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create account'}
        </button>

        <p className="text-sm text-ink-soft mt-5 text-center">
          Already have an account? <Link to="/login" className="text-grape font-semibold">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
