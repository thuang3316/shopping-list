import { Link } from 'react-router-dom';
import { categoryLabel } from '../lib/categories.js';

// Prices arrive from Postgres NUMERIC as strings (e.g. "25.00"); null = negotiable.
function formatPrice(price) {
  return Number(price).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function PriceTag({ price }) {
  if (price == null) return <span className="price-tag price-tag--neg">Negotiable</span>;
  return <span className="price-tag">${formatPrice(price)}</span>;
}

export function ItemCard({ item }) {
  const img = item.image_urls?.[0];
  return (
    <Link
      to={`/item/${item.id}`}
      className="bg-surface rounded-[var(--radius-card)] border border-line overflow-hidden flex flex-col transition-transform hover:-translate-y-1"
    >
      <div className="aspect-square bg-paper grid place-items-center overflow-hidden">
        {img
          ? <img src={img} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
          : <span className="text-ink-soft/40 font-mono text-xs">no photo</span>}
      </div>
      <div className="p-4 flex flex-col gap-3 flex-1">
        <span className="eyebrow">{categoryLabel(item.category)}</span>
        <h3 className="text-base font-semibold leading-snug flex-1 line-clamp-2">{item.title}</h3>
        <PriceTag price={item.price} />
      </div>
    </Link>
  );
}
