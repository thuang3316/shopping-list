// Placeholder home page showcasing the design. Real search/filters + DB-backed
// listings arrive in Step 3.
const SAMPLE = [
  { id: 1, title: 'Cannondale road bike, 56cm', price: '120', cat: 'Bikes' },
  { id: 2, title: 'Mid-century teak desk', price: '85', cat: 'Furniture' },
  { id: 3, title: 'Film camera + 50mm lens', price: null, cat: 'Photo' },
  { id: 4, title: 'Stack of vinyl records', price: '40', cat: 'Music' },
];

function PriceTag({ price }) {
  if (price == null) return <span className="price-tag price-tag--neg">Negotiable</span>;
  return <span className="price-tag">${price}</span>;
}

function ItemCard({ item }) {
  return (
    <article className="bg-surface rounded-[var(--radius-card)] border border-line overflow-hidden flex flex-col transition-transform hover:-translate-y-1">
      <div className="aspect-square bg-paper grid place-items-center text-ink-soft/40 font-mono text-xs">
        photo
      </div>
      <div className="p-4 flex flex-col gap-3 flex-1">
        <span className="eyebrow">{item.cat}</span>
        <h3 className="text-base font-semibold leading-snug flex-1">{item.title}</h3>
        <PriceTag price={item.price} />
      </div>
    </article>
  );
}

export function Home() {
  return (
    <>
      <section className="max-w-6xl mx-auto px-5 pt-16 pb-12">
        <span className="eyebrow">Buy &amp; sell secondhand, locally</span>
        <h1 className="mt-4 text-5xl sm:text-6xl leading-[0.95] max-w-3xl">
          One person&rsquo;s clutter is another&rsquo;s
          <span className="text-grape"> good find.</span>
        </h1>
        <p className="mt-5 text-lg text-ink-soft max-w-xl">
          List what you no longer need, browse what your neighbors are letting go, and message
          the seller to work out a price. No middleman, no fees.
        </p>
        <div className="mt-7 flex gap-3">
          <button className="btn btn-primary">List an item</button>
          <button className="btn btn-ghost">Request something</button>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 pb-20">
        <div className="flex items-end justify-between mb-5">
          <h2 className="text-2xl">Fresh on the board</h2>
          <span className="eyebrow">4 items</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {SAMPLE.map((item) => <ItemCard key={item.id} item={item} />)}
        </div>
      </section>
    </>
  );
}
