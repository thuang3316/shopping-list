import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { FilterBar } from '../components/FilterBar.jsx';
import { ItemCard } from '../components/ItemCard.jsx';

const DEFAULT_SORT = 'newest';

// All filtering/sorting happens in-memory on the fetched list, so changing a
// filter is instant (no refetch, no loading flash). Mirrors the server logic
// in server/routes/items.js. Prices are NUMERIC strings; null = Negotiable.
function applyFilters(items, { q, category, minPrice, maxPrice, sort }) {
  let out = items;

  const term = q.trim().toLowerCase();
  if (term) out = out.filter((i) => i.title.toLowerCase().includes(term));
  if (category) out = out.filter((i) => i.category === category);

  const min = Number(minPrice);
  if (minPrice !== '' && Number.isFinite(min)) out = out.filter((i) => i.price != null && Number(i.price) >= min);
  const max = Number(maxPrice);
  if (maxPrice !== '' && Number.isFinite(max)) out = out.filter((i) => i.price != null && Number(i.price) <= max);

  const price = (i) => (i.price == null ? null : Number(i.price));
  const byDate = (a, b) => new Date(a.created_at) - new Date(b.created_at);
  const byPrice = (dir) => (a, b) => {
    const pa = price(a), pb = price(b);
    if (pa == null && pb == null) return 0;
    if (pa == null) return 1;   // Negotiable sorts last
    if (pb == null) return -1;
    return dir * (pa - pb);
  };
  out = [...out];
  if (sort === 'oldest') out.sort(byDate);
  else if (sort === 'price_asc') out.sort(byPrice(1));
  else if (sort === 'price_desc') out.sort(byPrice(-1));
  else out.sort((a, b) => byDate(b, a)); // newest (default)
  return out;
}

export function Home() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Fetch the available listings ONCE; filter client-side thereafter.
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    api('/items')
      .then(({ items }) => { if (!cancelled) setAllItems(items); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // The URL is the source of truth for filters (shareable, survives refresh,
  // back/forward works).
  const category = searchParams.get('category') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const sort = searchParams.get('sort') || DEFAULT_SORT;
  const urlQ = searchParams.get('q') || '';

  // Search box is locally controlled for responsive typing; its value is
  // synced into the URL on a 300ms debounce (and back, for nav).
  const [qDraft, setQDraft] = useState(urlQ);
  useEffect(() => { setQDraft((d) => (d === urlQ ? d : urlQ)); }, [urlQ]);
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (qDraft.trim()) next.set('q', qDraft); else next.delete('q');
        return next;
      }, { replace: true });
    }, 300);
    return () => clearTimeout(t);
  }, [qDraft, setSearchParams]);

  const setParam = (key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value && !(key === 'sort' && value === DEFAULT_SORT)) next.set(key, value);
      else next.delete(key);
      return next;
    }, { replace: true });
  };

  const onChange = (patch) => {
    const [key, value] = Object.entries(patch)[0];
    if (key === 'q') setQDraft(value);
    else setParam(key, value);
  };
  const onReset = () => { setQDraft(''); setSearchParams({}, { replace: true }); };

  const filters = { q: qDraft, category, minPrice, maxPrice, sort };
  const visible = useMemo(
    () => applyFilters(allItems, filters),
    [allItems, qDraft, category, minPrice, maxPrice, sort],
  );

  return (
    <div className="max-w-6xl mx-auto px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <span className="eyebrow">Buy &amp; sell secondhand, locally</span>
          <h1 className="text-4xl mt-2">Browse the board</h1>
        </div>
        <div className="flex gap-3">
          <Link to={user ? '/create' : '/login'} className="btn btn-primary">List an item</Link>
          <Link to={user ? '/make-request' : '/login'} className="btn btn-ghost">Request something</Link>
        </div>
      </div>

      <FilterBar filters={filters} onChange={onChange} onReset={onReset} />

      <div className="mt-6">
        {loading ? (
          <p className="eyebrow py-16 text-center">Loading…</p>
        ) : error ? (
          <p className="field-error py-16 text-center">{error}</p>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-lg font-semibold">Nothing matches yet.</p>
            <p className="text-ink-soft mt-1">Try clearing the filters, or be the first to list something.</p>
          </div>
        ) : (
          <>
            <p className="eyebrow mb-4">{visible.length} item{visible.length === 1 ? '' : 's'}</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              {visible.map((item) => <ItemCard key={item.id} item={item} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
