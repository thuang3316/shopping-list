// Listing categories. Must stay in sync with the CHECK constraint in
// server/migrations/006_category_taxonomy.sql and the CATEGORIES Set in
// server/routes/items.js + server/routes/requests.js.
// Slugs: furniture, kitchen, electronics, home, books, clothing, free, other.
export const CATEGORIES = [
  { value: 'furniture', label: '🪑 Furniture' },
  { value: 'kitchen', label: '🍳 Kitchen' },
  { value: 'electronics', label: '💻 Electronics' },
  { value: 'home', label: '🏠 Home Essentials' },
  { value: 'books', label: '📚 Books & Study' },
  { value: 'clothing', label: '👕 Clothing' },
  { value: 'free', label: '🎁 Free Items' },
  { value: 'other', label: '🗂️ Other' },
];

export const categoryLabel = (value) =>
  CATEGORIES.find((c) => c.value === value)?.label || value;
