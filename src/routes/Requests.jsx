import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { CATEGORIES, categoryLabel } from '../lib/categories.js';

function budgetLabel(min, max) {
  const f = (v) => `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (min == null && max == null) return 'Open budget';
  if (min != null && max != null) return `${f(min)}–${f(max)}`;
  if (min != null) return `from ${f(min)}`;
  return `up to ${f(max)}`;
}

export function Requests() {
  const { user } = useAuth();
  const [all, setAll] = useState([]);
  const [qInput, setQInput] = useState('');  // controlled input (responsive typing)
  const [q, setQ] = useState('');            // debounced value that drives filtering
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api('/requests')
      .then(({ requests }) => { if (!cancelled) setAll(requests); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Debounce the search box (300ms) so filtering doesn't run on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput), 300);
    return () => clearTimeout(t);
  }, [qInput]);

  // Filter in-memory (fetch-once), mirroring the homepage's approach.
  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return all.filter((r) =>
      (!category || r.category === category) &&
      (!term || r.title.toLowerCase().includes(term)));
  }, [all, q, category]);

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-2">
        <div>
          <span className="eyebrow">What people are looking for</span>
          <h1 className="text-4xl mt-2">Requests</h1>
        </div>
        <Link to={user ? '/make-request' : '/login'} className="btn btn-primary">Request something</Link>
      </div>
      <p className="text-ink-soft mb-6">See what buyers want — if you have it, list it and they&rsquo;ll find you.</p>

      <div className="flex flex-wrap items-end gap-3 bg-surface border border-line rounded-[var(--radius-card)] p-4 mb-6">
        <div className="flex-1 min-w-[12rem]">
          <label className="label" htmlFor="q">Search</label>
          <input id="q" className="input" type="search" placeholder="What are people after?"
                 value={qInput} onChange={(e) => setQInput(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="cat">Category</label>
          <select id="cat" className="input w-48" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="eyebrow text-center py-16">Loading…</p>
      ) : error ? (
        <p className="field-error text-center py-16">{error}</p>
      ) : visible.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-lg font-semibold">No requests yet.</p>
          <p className="text-ink-soft mt-1">Be the first to ask for something.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((r) => (
            <div key={r.id} className="relative flex flex-col bg-surface border border-line rounded-[var(--radius-card)] p-4">
              <Link to={`/u/${encodeURIComponent(r.buyer)}`}
                    className="absolute top-3 right-3 font-mono text-xs text-ink-soft hover:text-grape">
                @{r.buyer}
              </Link>
              <span className="eyebrow pr-16">{categoryLabel(r.category)}</span>
              <p className="font-semibold mt-1">{r.title}</p>
              <span className="price-tag mt-3 self-start">{budgetLabel(r.price_min, r.price_max)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
