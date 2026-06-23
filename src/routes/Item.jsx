import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { PriceTag } from '../components/ItemCard.jsx';
import { Lightbox } from '../components/Lightbox.jsx';
import { categoryLabel } from '../lib/categories.js';

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function Item() {
  const { id } = useParams();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Refetch when auth changes too, so signing in reveals the seller contact.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api(`/items/${id}`)
      .then(({ item }) => { if (!cancelled) { setItem(item); setActive(0); } })
      .catch((err) => { if (!cancelled) setError(err.status === 404 ? 'This listing no longer exists.' : err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, user]);

  if (loading) return <p className="eyebrow text-center py-24">Loading…</p>;
  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-5 py-24 text-center">
        <h1 className="text-3xl mb-4">{error}</h1>
        <Link to="/" className="btn btn-primary">Back to browsing</Link>
      </div>
    );
  }

  const images = item.image_urls || [];
  const seller = item.seller;

  return (
    <div className="max-w-6xl mx-auto px-5 py-10">
      <Link to="/" className="eyebrow hover:text-grape">← Back to the board</Link>

      <div className="mt-5 grid md:grid-cols-2 gap-8 items-start">
        {/* Gallery — image shows at its natural shape (no crop); click to zoom. */}
        <div>
          {images.length ? (
            <button type="button" onClick={() => setZoom(true)} aria-label="Zoom image"
                    className="block w-full cursor-zoom-in">
              <img src={images[active]} alt={item.title}
                   className="mx-auto max-w-full max-h-[75vh] rounded-[var(--radius-card)] border border-line transition-opacity hover:opacity-95"
                   fetchPriority="high" decoding="async" />
            </button>
          ) : (
            <div className="aspect-[4/3] bg-surface border border-line rounded-[var(--radius-card)] grid place-items-center">
              <span className="font-mono text-sm text-ink-soft/50">no photo</span>
            </div>
          )}
          {images.length > 1 && (
            <div className="flex gap-2 mt-3">
              {images.map((src, i) => (
                <button key={src} type="button" onClick={() => setActive(i)}
                        className={`w-16 h-16 rounded-lg overflow-hidden border ${i === active ? 'border-grape' : 'border-line'}`}>
                  <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col gap-5">
          <div>
            <span className="eyebrow">{categoryLabel(item.category)}</span>
            <h1 className="text-3xl sm:text-4xl mt-2">{item.title}</h1>
          </div>

          <div className="flex items-center gap-3">
            <PriceTag price={item.price} />
            {item.status === 'sold' && (
              <span className="eyebrow text-sold border border-sold rounded-full px-3 py-1">Sold</span>
            )}
          </div>

          <p className="text-sm text-ink-soft">
            Listed {formatDate(item.created_at)}
            {item.due_date ? ` · available until ${formatDate(item.due_date)}` : ''}
          </p>

          {item.description && (
            <p className="text-ink whitespace-pre-wrap leading-relaxed">{item.description}</p>
          )}

          {/* Seller contact — gated behind auth */}
          <div className="mt-2 bg-surface border border-line rounded-[var(--radius-card)] p-5">
            <span className="eyebrow">Seller</span>
            <p className="text-lg font-semibold mt-1">{seller.username}</p>
            {seller.email ? (
              <div className="mt-3 flex flex-col gap-1 text-sm">
                <a href={`mailto:${seller.email}`} className="text-grape font-semibold">{seller.email}</a>
                {seller.phone && <span className="text-ink-soft">{seller.phone}</span>}
                <p className="text-ink-soft mt-2">Message the seller to ask about the item or agree on a price.</p>
              </div>
            ) : (
              <div className="mt-3 text-sm">
                <p className="text-ink-soft mb-3">🔒 Contact details are visible to signed-in members only.</p>
                <Link to="/login" className="btn btn-primary text-sm">Sign in to contact</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {zoom && <Lightbox images={images} startIndex={active} alt={item.title} onClose={() => setZoom(false)} />}
    </div>
  );
}
