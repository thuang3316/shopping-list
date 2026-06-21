import { Link } from 'react-router-dom';

// Catch-all. During the staged build this also covers routes that aren't built
// yet (e.g. /create, /requests, /item/:id); those get their real pages in later steps.
export function NotFound() {
  return (
    <div className="max-w-6xl mx-auto px-5 py-24 text-center">
      <span className="eyebrow">404</span>
      <h1 className="text-4xl mt-3 mb-4">This page isn&rsquo;t here</h1>
      <p className="text-ink-soft mb-8">It may not be built yet, or the link is wrong.</p>
      <Link to="/" className="btn btn-primary">Back to browsing</Link>
    </div>
  );
}
