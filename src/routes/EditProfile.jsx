import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const isDev = import.meta.env.DEV;

export function EditProfile() {
  const { user, loading: authLoading, setUser, refresh } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: '', email: '', phone: '', current_password: '', new_password: '', confirm: '' });
  const [step, setStep] = useState('form'); // 'form' | 'verify'
  const [pendingEmail, setPendingEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Prefill from the signed-in user once it loads.
  useEffect(() => {
    if (user) setForm((f) => ({ ...f, username: user.username, email: user.email, phone: user.phone || '' }));
  }, [user]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    if (form.username.trim().length < 3) return 'Username must be at least 3 characters.';
    if (!EMAIL_RE.test(form.email.trim())) return 'Enter a valid email address.';
    if (form.new_password || form.confirm || form.current_password) {
      if (!form.current_password) return 'Enter your current password to set a new one.';
      if (form.new_password.length < 8) return 'New password must be at least 8 characters.';
      if (form.new_password !== form.confirm) return 'New passwords do not match.';
    }
    return '';
  };

  const submit = async (e) => {
    e.preventDefault();
    const msg = validate();
    if (msg) { setError(msg); return; }
    setError('');
    setSubmitting(true);
    try {
      const body = {
        username: form.username.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      };
      if (form.new_password) {
        body.current_password = form.current_password;
        body.new_password = form.new_password;
      }
      const { user: updated, emailChanged } = await api('/me/profile', { method: 'PATCH', body });
      if (emailChanged) {
        setUser(updated);          // reflects email_verified: false immediately
        setPendingEmail(updated.email);
        setStep('verify');
      } else {
        await refresh();
        navigate('/profile');
      }
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
      const { user: verified } = await api('/auth/verify', { method: 'POST', body: { email: pendingEmail, code: code.trim() } });
      setUser(verified);
      navigate('/profile');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'verify') {
    return (
      <div className="max-w-2xl mx-auto px-5 py-12">
        <span className="eyebrow">Confirm your new email</span>
        <h1 className="text-4xl mt-2 mb-6">Verify {pendingEmail}</h1>
        <form className="bg-surface border border-line rounded-[var(--radius-card)] p-6 sm:p-8 flex flex-col gap-5" onSubmit={submitCode} noValidate>
          {error && <p className="field-error">{error}</p>}
          <p className="text-sm text-ink-soft">
            We sent a 6-digit code to <strong>{pendingEmail}</strong>. Enter it to confirm the change.
            Your account stays unverified until you do.
          </p>
          <div>
            <label className="label" htmlFor="code">Verification code</label>
            <input id="code" className="input tracking-[0.4em] text-center font-mono" inputMode="numeric"
                   maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                   placeholder="000000" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Verifying…' : 'Verify email'}
            </button>
            <Link to="/profile" className="btn btn-ghost">Do this later</Link>
          </div>
          {isDev && <p className="form-note">Dev mode: the code is printed in the API server console (no email is sent).</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-12">
      <span className="eyebrow">Your account</span>
      <h1 className="text-4xl mt-2 mb-6">Edit profile</h1>

      <form className="bg-surface border border-line rounded-[var(--radius-card)] p-6 sm:p-8 flex flex-col gap-5" onSubmit={submit} noValidate>
        {error && <p className="field-error">{error}</p>}

        <div>
          <label className="label" htmlFor="username">Username</label>
          <input id="username" className="input" value={form.username} onChange={update('username')}
                 autoComplete="username" placeholder="jane_doe" />
        </div>

        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" className="input" type="email" value={form.email} onChange={update('email')}
                 autoComplete="email" placeholder="you@example.com" />
          <p className="form-note mt-1">Changing this requires re-verifying your new address.</p>
        </div>

        <div>
          <label className="label" htmlFor="phone">Phone <span className="normal-case text-ink-soft">(optional)</span></label>
          <input id="phone" className="input" value={form.phone} onChange={update('phone')}
                 autoComplete="tel" placeholder="So buyers can reach you" />
        </div>

        <div className="border-t border-line pt-5">
          <p className="label mb-3">Change password <span className="normal-case text-ink-soft">(optional)</span></p>
          <div className="flex flex-col gap-4">
            <div>
              <label className="label" htmlFor="current_password">Current password</label>
              <input id="current_password" className="input" type="password" value={form.current_password}
                     onChange={update('current_password')} autoComplete="current-password" placeholder="Required to change it" />
            </div>
            <div>
              <label className="label" htmlFor="new_password">New password</label>
              <input id="new_password" className="input" type="password" value={form.new_password}
                     onChange={update('new_password')} autoComplete="new-password" placeholder="At least 8 characters" />
            </div>
            <div>
              <label className="label" htmlFor="confirm">Confirm new password</label>
              <input id="confirm" className="input" type="password" value={form.confirm}
                     onChange={update('confirm')} autoComplete="new-password" placeholder="Re-enter your new password" />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
          <Link to="/profile" className="btn btn-ghost">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
