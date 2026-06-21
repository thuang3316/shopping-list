import { CATEGORIES } from '../lib/categories.js';

// Controlled filter bar. Reports changes via onChange({ field: value }).
export function FilterBar({ filters, onChange, onReset }) {
  const set = (field) => (e) => onChange({ [field]: e.target.value });
  const hasFilters = filters.q || filters.category || filters.minPrice || filters.maxPrice || filters.sort !== 'newest';

  return (
    <div className="flex flex-wrap items-end gap-3 bg-surface border border-line rounded-[var(--radius-card)] p-4">
      <div className="flex-1 min-w-[12rem]">
        <label className="label" htmlFor="q">Search</label>
        <input id="q" className="input" type="search" placeholder="What are you looking for?"
               value={filters.q} onChange={set('q')} />
      </div>

      <div>
        <label className="label" htmlFor="category">Category</label>
        <select id="category" className="input" value={filters.category} onChange={set('category')}>
          <option value="">All</option>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      <div className="w-24">
        <label className="label" htmlFor="minPrice">Min $</label>
        <input id="minPrice" className="input" type="number" min="0" inputMode="numeric"
               value={filters.minPrice} onChange={set('minPrice')} />
      </div>

      <div className="w-24">
        <label className="label" htmlFor="maxPrice">Max $</label>
        <input id="maxPrice" className="input" type="number" min="0" inputMode="numeric"
               value={filters.maxPrice} onChange={set('maxPrice')} />
      </div>

      <div>
        <label className="label" htmlFor="sort">Sort</label>
        <select id="sort" className="input" value={filters.sort} onChange={set('sort')}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </select>
      </div>

      {/* Always shown (no layout shift); disabled when there's nothing to clear. */}
      <button
        type="button"
        className="btn btn-ghost text-sm disabled:opacity-40 disabled:pointer-events-none"
        onClick={onReset}
        disabled={!hasFilters}
      >
        Clear
      </button>
    </div>
  );
}
