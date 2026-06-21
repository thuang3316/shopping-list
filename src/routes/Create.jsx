import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { upload } from '@vercel/blob/client';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { CATEGORIES } from '../lib/categories.js';

export function Create() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ title: '', category: '', price: '', description: '', due_date: '' });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />; // auth-gated

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onFile = (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : '');
  };

  const validate = () => {
    if (!form.title.trim()) return 'Add a title.';
    if (!form.category) return 'Choose a category.';
    if (form.price !== '' && (Number.isNaN(Number(form.price)) || Number(form.price) < 0)) {
      return 'Price must be a positive number, or leave it blank for "Negotiable".';
    }
    return '';
  };

  const submit = async (e) => {
    e.preventDefault();
    const msg = validate();
    if (msg) { setError(msg); return; }
    setError('');
    setSubmitting(true);
    try {
      let image_urls = [];
      if (file) {
        const blob = await upload(file.name, file, { access: 'public', handleUploadUrl: '/api/items/upload' });
        image_urls = [blob.url];
      }
      await api('/items', {
        method: 'POST',
        body: {
          title: form.title.trim(),
          category: form.category,
          price: form.price,
          description: form.description.trim() || undefined,
          due_date: form.due_date || undefined,
          image_urls,
        },
      });
      navigate('/'); // item detail page is Step 5; return to the board for now
    } catch (err) {
      setError(err.message || 'Could not create the listing.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-5 py-12">
      <span className="eyebrow">Sell something</span>
      <h1 className="text-4xl mt-2 mb-6">List an item</h1>

      <form className="bg-surface border border-line rounded-[var(--radius-card)] p-6 sm:p-8 flex flex-col gap-5" onSubmit={submit} noValidate>
        {error && <p className="field-error">{error}</p>}

        {/* Photo */}
        <div>
          <span className="label">Photo</span>
          <label className="block cursor-pointer">
            <div className="aspect-video bg-paper border border-dashed border-line rounded-lg grid place-items-center overflow-hidden hover:border-grape transition-colors">
              {preview
                ? <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                : <span className="font-mono text-xs text-ink-soft">Click to add a photo (optional)</span>}
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={onFile} />
          </label>
        </div>

        <div>
          <label className="label" htmlFor="title">Title</label>
          <input id="title" className="input" value={form.title} onChange={update('title')}
                 placeholder="e.g. Mid-century teak desk" maxLength={200} />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="label" htmlFor="category">Category</label>
            <select id="category" className="input" value={form.category} onChange={update('category')}>
              <option value="">Choose one…</option>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="w-36">
            <label className="label" htmlFor="price">Price $ <span className="normal-case text-ink-soft">(optional)</span></label>
            <input id="price" className="input" type="number" min="0" inputMode="decimal"
                   value={form.price} onChange={update('price')} placeholder="Negotiable" />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="description">Description <span className="normal-case text-ink-soft">(optional)</span></label>
          <textarea id="description" className="input min-h-28 resize-y" value={form.description} onChange={update('description')}
                    placeholder="Condition, dimensions, why you're selling…" />
        </div>

        <div>
          <label className="label" htmlFor="due_date">Available until <span className="normal-case text-ink-soft">(optional)</span></label>
          <input id="due_date" className="input w-52" type="date" value={form.due_date} onChange={update('due_date')} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Posting…' : 'Post listing'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/')}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
