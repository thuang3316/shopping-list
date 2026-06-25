import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { ItemCard } from '../components/ItemCard.jsx';
import { categoryLabel } from '../lib/categories.js';

function budgetLabel(min, max) {
  const f = (v) => `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (min == null && max == null) return 'Open budget';
  if (min != null && max != null) return `${f(min)}–${f(max)}`;
  if (min != null) return `from ${f(min)}`;
  return `up to ${f(max)}`;
}

function memberSince(ts) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

export function PublicProfile() {
  const { username } = useParams();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('products');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setNotFound(false);
    api(`/users/${encodeURIComponent(username)}`)
      .then((res) => { if (!cancelled) setData(res); })
      .catch((err) => {
        if (cancelled) return;
        if (err.status === 404) setNotFound(true);
        else setError(err.message);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [username]);

  if (loading) return <p className="eyebrow text-center py-24">Loading…</p>;

  if (notFound) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-24 text-center">
        <p className="text-lg font-semibold">We couldn&rsquo;t find that member.</p>
        <Link to="/" className="btn btn-primary mt-4">Back to the board</Link>
      </div>
    );
  }

  if (error) return <p className="field-error text-center py-24">{error}</p>;

  const { user, items, requests } = data;

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      {/* Identity — signed-in members see contact info (email/phone). */}
      <div className="flex items-center gap-4 min-w-0 mb-8">
        <div className="w-16 h-16 shrink-0 rounded-full bg-grape text-white grid place-items-center font-display font-900 text-2xl">
          {user.username[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <h1 className="text-3xl leading-tight truncate">{user.username}</h1>
          <p className="text-sm text-ink-soft">Member since {memberSince(user.created_at)}</p>
          {user.email && (
            <p className="text-sm mt-1">
              <a href={`mailto:${user.email}`} className="text-grape font-semibold break-all">{user.email}</a>
              {user.phone && <span className="text-ink-soft"> · {user.phone}</span>}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-line mb-6">
        {[['products', `Listings (${items.length})`], ['requests', `Requests (${requests.length})`]].map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)}
                  className={`eyebrow pb-3 -mb-px border-b-2 ${tab === key ? 'border-grape text-grape' : 'border-transparent hover:text-grape'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'products' ? (
        items.length ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {items.map((item) => <ItemCard key={item.id} item={item} />)}
          </div>
        ) : (
          <p className="text-ink-soft text-center py-16">{user.username} has no active listings.</p>
        )
      ) : requests.length ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {requests.map((r) => (
            <div key={r.id} className="bg-surface border border-line rounded-[var(--radius-card)] p-4">
              <span className="eyebrow">{categoryLabel(r.category)}</span>
              <p className="font-semibold mt-1">{r.title}</p>
              <span className="price-tag mt-3 inline-block">{budgetLabel(r.price_min, r.price_max)}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-ink-soft text-center py-16">{user.username} isn&rsquo;t looking for anything right now.</p>
      )}
    </div>
  );
}
