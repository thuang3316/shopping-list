import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { upload } from '@vercel/blob/client';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { CATEGORIES } from '../lib/categories.js';

// Used for both creating (/create) and editing (/item/:id/edit) a listing.
export function Create() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ title: '', category: '', price: '', description: '', due_date: '' });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [existingImages, setExistingImages] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingItem, setLoadingItem] = useState(isEdit);
  const [forbidden, setForbidden] = useState(false);

  // In edit mode, load the listing and confirm ownership.
  useEffect(() => {
    if (!isEdit || !user) return;
    let cancelled = false;
    api(`/items/${id}`)
      .then(({ item }) => {
        if (cancelled) return;
        if (!item.is_owner) { setForbidden(true); return; }
        setForm({
          title: item.title || '',
          category: item.category || '',
          price: item.price == null ? '' : String(Number(item.price)),
          description: item.description || '',
          due_date: item.due_date ? String(item.due_date).slice(0, 10) : '',
        });
        setExistingImages(item.image_urls || []);
        setPreview(item.image_urls?.[0] || '');
      })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoadingItem(false); });
    return () => { cancelled = true; };
  }, [isEdit, id, user]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (forbidden) return <Navigate to={`/item/${id}`} replace />;
  if (loadingItem) return <p className="eyebrow text-center py-24">Loading…</p>;

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const onFile = (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f) setPreview(URL.createObjectURL(f));
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
      let image_urls = existingImages;
      if (file) {
        const blob = await upload(file.name, file, { access: 'public', handleUploadUrl: '/api/items/upload' });
        image_urls = [blob.url];
      }
      const body = {
        title: form.title.trim(),
        category: form.category,
        price: form.price,
        description: form.description.trim() || (isEdit ? '' : undefined),
        due_date: form.due_date || (isEdit ? '' : undefined),
        image_urls,
      };
      const res = isEdit
        ? await api(`/items/${id}`, { method: 'PATCH', body })
        : await api('/items', { method: 'POST', body });
      navigate(isEdit ? '/profile' : `/item/${res.id}`);
    } catch (err) {
      setError(err.message || 'Could not save the listing.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-5 py-12">
      <span className="eyebrow">{isEdit ? 'Edit your listing' : 'Sell something'}</span>
      <h1 className="text-4xl mt-2 mb-6">{isEdit ? 'Edit listing' : 'List an item'}</h1>

      <form className="bg-surface border border-line rounded-[var(--radius-card)] p-6 sm:p-8 flex flex-col gap-5" onSubmit={submit} noValidate>
        {error && <p className="field-error">{error}</p>}

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
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Post listing'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate(isEdit ? '/profile' : '/')}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
