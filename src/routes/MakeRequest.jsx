import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { CATEGORIES } from '../lib/categories.js';

// Post a "wanted" request. Simpler than a listing: no photo or description.
export function MakeRequest() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', category: '', price_min: '', price_max: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    if (!form.title.trim()) return 'Describe what you are looking for.';
    if (!form.category) return 'Choose a category.';
    const min = form.price_min === '' ? null : Number(form.price_min);
    const max = form.price_max === '' ? null : Number(form.price_max);
    if (min != null && (Number.isNaN(min) || min < 0)) return 'Minimum price must be a positive number.';
    if (max != null && (Number.isNaN(max) || max < 0)) return 'Maximum price must be a positive number.';
    if (min != null && max != null && min > max) return 'Minimum price cannot exceed maximum price.';
    return '';
  };

  const submit = async (e) => {
    e.preventDefault();
    const msg = validate();
    if (msg) { setError(msg); return; }
    setError('');
    setSubmitting(true);
    try {
      await api('/requests', { method: 'POST', body: form });
      navigate('/requests');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-5 py-12">
      <span className="eyebrow">Looking for something?</span>
      <h1 className="text-4xl mt-2 mb-6">Request an item</h1>

      <form className="bg-surface border border-line rounded-[var(--radius-card)] p-6 sm:p-8 flex flex-col gap-5" onSubmit={submit} noValidate>
        {error && <p className="field-error">{error}</p>}

        <div>
          <label className="label" htmlFor="title">What are you looking for?</label>
          <input id="title" className="input" value={form.title} onChange={update('title')}
                 placeholder="e.g. A used 27-inch monitor" maxLength={200} />
        </div>

        <div>
          <label className="label" htmlFor="category">Category</label>
          <select id="category" className="input" value={form.category} onChange={update('category')}>
            <option value="">Choose one…</option>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="label" htmlFor="price_min">Budget min $ <span className="normal-case text-ink-soft">(optional)</span></label>
            <input id="price_min" className="input" type="number" min="0" value={form.price_min} onChange={update('price_min')} placeholder="Any" />
          </div>
          <div className="flex-1">
            <label className="label" htmlFor="price_max">Budget max $ <span className="normal-case text-ink-soft">(optional)</span></label>
            <input id="price_max" className="input" type="number" min="0" value={form.price_max} onChange={update('price_max')} placeholder="Any" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Posting…' : 'Post request'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/requests')}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
