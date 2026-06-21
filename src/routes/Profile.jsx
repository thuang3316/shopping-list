import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { PriceTag } from '../components/ItemCard.jsx';
import { categoryLabel } from '../lib/categories.js';

function MyItemRow({ item, onChanged }) {
  const [busy, setBusy] = useState(false);
  const img = item.image_urls?.[0];

  const act = async (fn) => { setBusy(true); try { await fn(); await onChanged(); } catch (e) { alert(e.message); } finally { setBusy(false); } };
  const toggleSold = () => act(() => api(`/items/${item.id}`, { method: 'PATCH', body: { status: item.status === 'sold' ? 'available' : 'sold' } }));
  const remove = () => { if (confirm(`Delete “${item.title}”? This can't be undone.`)) act(() => api(`/items/${item.id}`, { method: 'DELETE' })); };

  return (
    <div className="flex gap-4 bg-surface border border-line rounded-[var(--radius-card)] p-4 items-center">
      <Link to={`/item/${item.id}`} className="w-20 h-20 shrink-0 bg-paper rounded-lg grid place-items-center overflow-hidden">
        {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : <span className="font-mono text-[10px] text-ink-soft/50">no photo</span>}
      </Link>
      <div className="flex-1 min-w-0">
        <span className="eyebrow">{categoryLabel(item.category)}</span>
        <Link to={`/item/${item.id}`} className="block font-semibold truncate hover:text-grape">{item.title}</Link>
        <div className="flex items-center gap-2 mt-1">
          <PriceTag price={item.price} />
          {item.status === 'sold' && <span className="eyebrow text-sold">Sold</span>}
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 shrink-0">
        <Link to={`/item/${item.id}/edit`} className="btn btn-ghost text-sm">Edit</Link>
        <button type="button" className="btn btn-ghost text-sm" onClick={toggleSold} disabled={busy}>
          {item.status === 'sold' ? 'Mark available' : 'Mark sold'}
        </button>
        <button type="button" className="btn btn-ghost text-sm text-sold" onClick={remove} disabled={busy}>Delete</button>
      </div>
    </div>
  );
}

export function Profile() {
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState('products');
  const [items, setItems] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [{ items }, { requests }] = await Promise.all([api('/me/items'), api('/me/requests')]);
    setItems(items);
    setRequests(requests);
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [user, load]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      {/* Identity */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-16 h-16 shrink-0 rounded-full bg-grape text-white grid place-items-center font-display font-900 text-2xl">
            {user.username[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-3xl leading-tight truncate">{user.username}</h1>
            <p className="text-sm text-ink-soft truncate">
              {user.email}
              {user.email_verified && <span className="ml-2 text-grape">✓ verified</span>}
              {user.phone && <span> · {user.phone}</span>}
            </p>
          </div>
        </div>
        <Link to="/create" className="btn btn-primary shrink-0">List an item</Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-line mb-6">
        {[['products', `My products (${items.length})`], ['requests', `My requests (${requests.length})`]].map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)}
                  className={`eyebrow pb-3 -mb-px border-b-2 ${tab === key ? 'border-grape text-grape' : 'border-transparent hover:text-grape'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="eyebrow text-center py-16">Loading…</p>
      ) : tab === 'products' ? (
        items.length ? (
          <div className="flex flex-col gap-3">
            {items.map((item) => <MyItemRow key={item.id} item={item} onChanged={load} />)}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-lg font-semibold">You haven&rsquo;t listed anything yet.</p>
            <Link to="/create" className="btn btn-primary mt-4">List an item</Link>
          </div>
        )
      ) : requests.length ? (
        <div className="flex flex-col gap-3">
          {requests.map((r) => (
            <div key={r.id} className="bg-surface border border-line rounded-[var(--radius-card)] p-4">
              <span className="eyebrow">{categoryLabel(r.category)}</span>
              <p className="font-semibold">{r.title}</p>
              {(r.price_min || r.price_max) && (
                <p className="text-sm text-ink-soft">Budget: {r.price_min ? `$${r.price_min}` : '—'} to {r.price_max ? `$${r.price_max}` : '—'}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-lg font-semibold">No requests yet.</p>
          <Link to="/make-request" className="btn btn-primary mt-4">Request something</Link>
        </div>
      )}
    </div>
  );
}
