import { applyFilters } from './filterItems.js';

// Fixture: prices are NUMERIC strings (as Neon returns them); null = Negotiable.
const ITEMS = [
  { id: '1', title: 'Red Bicycle',   category: 'electronics',     price: '120.00', created_at: '2026-01-01T00:00:00Z' },
  { id: '2', title: 'Office Chair',  category: 'furniture', price: '45.00',  created_at: '2026-02-01T00:00:00Z' },
  { id: '3', title: 'Mountain Bike', category: 'electronics',     price: null,     created_at: '2026-03-01T00:00:00Z' },
  { id: '4', title: 'Desk Lamp',     category: 'home',      price: '20.00',  created_at: '2026-01-15T00:00:00Z' },
];

const ids = (list) => list.map((i) => i.id);

describe('applyFilters', () => {
  it('returns all items when no filters are set', () => {
    expect(ids(applyFilters(ITEMS, {})).sort()).toEqual(['1', '2', '3', '4']);
  });

  it('filters by title substring case-insensitively', () => {
    expect(ids(applyFilters(ITEMS, { q: 'CHAIR' }))).toEqual(['2']);
  });

  it('filters by exact category', () => {
    expect(ids(applyFilters(ITEMS, { category: 'electronics' })).sort()).toEqual(['1', '3']);
  });

  it('excludes items priced below minPrice', () => {
    expect(ids(applyFilters(ITEMS, { minPrice: '50' }))).toEqual(['1']);
  });

  it('excludes items priced above maxPrice', () => {
    expect(ids(applyFilters(ITEMS, { maxPrice: '50' })).sort()).toEqual(['2', '4']);
  });

  it('excludes null-priced (Negotiable) items under a price filter', () => {
    expect(ids(applyFilters(ITEMS, { minPrice: '0' })).sort()).toEqual(['1', '2', '4']);
  });

  it('sorts newest first by default', () => {
    expect(ids(applyFilters(ITEMS, {}))).toEqual(['3', '2', '4', '1']);
  });

  it('sorts oldest first when sort is oldest', () => {
    expect(ids(applyFilters(ITEMS, { sort: 'oldest' }))).toEqual(['1', '4', '2', '3']);
  });

  it('sorts by price ascending with null prices last', () => {
    expect(ids(applyFilters(ITEMS, { sort: 'price_asc' }))).toEqual(['4', '2', '1', '3']);
  });

  it('sorts by price descending with null prices last', () => {
    expect(ids(applyFilters(ITEMS, { sort: 'price_desc' }))).toEqual(['1', '2', '4', '3']);
  });

  it('combines search, category, and price filters', () => {
    expect(ids(applyFilters(ITEMS, { category: 'electronics', minPrice: '100' }))).toEqual(['1']);
  });

  it('returns an empty array for empty input', () => {
    expect(applyFilters([], {})).toEqual([]);
  });
});
