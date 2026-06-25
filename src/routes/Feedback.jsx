import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';

// Send feedback straight to the site owner. Logged-in only (so we have the sender's
// identity); the message goes to a DB table + an email notification on the server.
const TYPES = [
  { value: 'bug', label: 'Bug report' },
  { value: 'idea', label: 'Idea / suggestion' },
  { value: 'other', label: 'Other' },
];
const MAX_MESSAGE = 2000;

export function Feedback() {
  const { user, loading } = useAuth();
  const [form, setForm] = useState({ category: '', message: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    if (!form.category) return 'Choose a type.';
    if (!form.message.trim()) return 'Please write a message.';
    if (form.message.length > MAX_MESSAGE) return `Message is too long (max ${MAX_MESSAGE} characters).`;
    return '';
  };

  const submit = async (e) => {
    e.preventDefault();
    const msg = validate();
    if (msg) { setError(msg); return; }
    setError('');
    setSubmitting(true);
    try {
      await api('/feedback', { method: 'POST', body: { category: form.category, message: form.message.trim() } });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-5 py-12">
      <span className="eyebrow">Tell us what you think</span>
      <h1 className="text-4xl mt-2 mb-6">Send feedback</h1>

      {sent ? (
        <div className="bg-surface border border-line rounded-[var(--radius-card)] p-6 sm:p-8 flex flex-col gap-4">
          <p className="text-lg font-semibold">Thanks — your feedback is on its way. 🙌</p>
          <p className="text-ink-soft">We read every message. We may reach out at your account email if we have a question.</p>
          <div className="flex gap-3 pt-2">
            <Link to="/" className="btn btn-primary">Back to browse</Link>
            <button type="button" className="btn btn-ghost" onClick={() => { setForm({ category: '', message: '' }); setSent(false); }}>
              Send more
            </button>
          </div>
        </div>
      ) : (
        <form className="bg-surface border border-line rounded-[var(--radius-card)] p-6 sm:p-8 flex flex-col gap-5" onSubmit={submit} noValidate>
          {error && <p className="field-error">{error}</p>}

          <div>
            <label className="label" htmlFor="category">Type</label>
            <select id="category" className="input" value={form.category} onChange={update('category')}>
              <option value="">Choose one…</option>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="message">Your message</label>
            <textarea id="message" className="input" rows={6} value={form.message} onChange={update('message')}
                      placeholder="What's working, what's not, or what you'd love to see…" maxLength={MAX_MESSAGE} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send feedback'}
            </button>
            <Link to="/" className="btn btn-ghost">Cancel</Link>
          </div>
        </form>
      )}
    </div>
  );
}
