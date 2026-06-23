import { useState } from 'react';
import { Link } from 'react-router-dom';
import { categoryLabel } from '../lib/categories.js';
import { Lightbox } from './Lightbox.jsx';

// Prices arrive from Postgres NUMERIC as strings (e.g. "25.00"); null = negotiable.
function formatPrice(price) {
  return Number(price).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function PriceTag({ price }) {
  if (price == null) return <span className="price-tag price-tag--neg">Negotiable</span>;
  return <span className="price-tag">${formatPrice(price)}</span>;
}

export function ItemCard({ item }) {
  const images = item.image_urls || [];
  const img = images[0];
  const [zoom, setZoom] = useState(false);

  return (
    <div className="bg-surface rounded-[var(--radius-card)] border border-line overflow-hidden flex flex-col transition-transform hover:-translate-y-1">
      {/* Image opens the zoom lightbox; the rest of the card navigates to detail. */}
      <div className="aspect-square overflow-hidden">
        {img
          ? (
            <button type="button" onClick={() => setZoom(true)} aria-label={`Zoom image of ${item.title}`}
                    className="block w-full h-full cursor-zoom-in p-3">
              <img src={img} alt={item.title} className="block w-full h-full object-contain" loading="lazy" decoding="async" />
            </button>
          )
          : <Link to={`/item/${item.id}`} className="w-full h-full bg-paper grid place-items-center"><span className="text-ink-soft/40 font-mono text-xs">no photo</span></Link>}
      </div>
      <Link to={`/item/${item.id}`} className="p-4 flex flex-col gap-3 flex-1">
        <span className="eyebrow">{categoryLabel(item.category)}</span>
        <h3 className="text-base font-semibold leading-snug flex-1 line-clamp-2">{item.title}</h3>
        <PriceTag price={item.price} />
      </Link>
      {zoom && <Lightbox images={images} alt={item.title} onClose={() => setZoom(false)} />}
    </div>
  );
}
