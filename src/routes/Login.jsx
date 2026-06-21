import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';

export function Login() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) {
      setError('Enter your email and password.');
      return;
    }
    setSubmitting(true);
    try {
      const { user } = await api('/auth/login', { method: 'POST', body: form });
      setUser(user);
      navigate('/');
    } catch (err) {
      if (err.status === 403 && err.data?.needsVerification) {
        navigate('/signup', { state: { verifyEmail: err.data.email } });
        return;
      }
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-5 py-16">
      <form className="auth-card" onSubmit={submit} noValidate>
        <span className="eyebrow">Welcome back</span>
        <h1 className="text-3xl mt-2 mb-6">Sign in</h1>

        {error && <p className="field-error mb-4">{error}</p>}

        <div className="mb-4">
          <label className="label" htmlFor="email">Email</label>
          <input id="email" className="input" type="email" autoComplete="email"
                 value={form.email} onChange={update('email')} placeholder="you@example.com" />
        </div>

        <div className="mb-6">
          <label className="label" htmlFor="password">Password</label>
          <input id="password" className="input" type="password" autoComplete="current-password"
                 value={form.password} onChange={update('password')} placeholder="••••••••" />
        </div>

        <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="text-sm text-ink-soft mt-5 text-center">
          New here? <Link to="/signup" className="text-grape font-semibold">Create an account</Link>
        </p>
      </form>
    </div>
  );
}
