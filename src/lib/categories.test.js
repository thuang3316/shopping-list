import { CATEGORIES, categoryLabel } from './categories.js';

describe('categoryLabel', () => {
  it('returns the human label for a known value', () => {
    expect(categoryLabel('furniture')).toBe('🪑 Furniture');
  });

  it('returns the raw value when the category is unknown', () => {
    expect(categoryLabel('spaceships')).toBe('spaceships');
  });

  it('returns the matching label for every category value', () => {
    for (const { value, label } of CATEGORIES) {
      expect(categoryLabel(value)).toBe(label);
    }
  });
});
