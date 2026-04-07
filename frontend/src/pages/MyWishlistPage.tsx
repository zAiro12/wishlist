import { useState, useEffect, FormEvent } from 'react';
import { NavBar } from './DashboardPage';
import { wishlist as wishlistApi } from '../api/client';
import { ApiError } from '../api/client';
import type { WishlistItem } from '../types';

const PRIORITY_LABELS = ['Low', 'Normal', 'Medium', 'High', 'Very High', 'Must Have'];

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'PRENOTATO'
      ? 'badge badge-prenotato'
      : status === 'COMPRATO'
        ? 'badge badge-comprato'
        : 'badge badge-disponibile';
  const label =
    status === 'PRENOTATO' ? 'Reserved' : status === 'COMPRATO' ? 'Purchased' : 'Available';
  return <span className={cls}>{label}</span>;
}

export default function MyWishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<WishlistItem | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [priority, setPriority] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    setLoading(true);
    try {
      const data = await wishlistApi.list();
      setItems(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditItem(null);
    setTitle('');
    setDescription('');
    setUrl('');
    setPriority(0);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(item: WishlistItem) {
    setEditItem(item);
    setTitle(item.title);
    setDescription(item.description ?? '');
    setUrl(item.url ?? '');
    setPriority(item.priority);
    setFormError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      if (editItem) {
        const updated = await wishlistApi.update(editItem.id, { title, description, url, priority });
        setItems((prev) => prev.map((i) => (i.id === editItem.id ? updated : i)));
      } else {
        const created = await wishlistApi.create({ title, description, url, priority });
        setItems((prev) => [created, ...prev]);
      }
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to save item');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: WishlistItem) {
    if (!confirm(`Delete "${item.title}"?`)) return;
    try {
      await wishlistApi.delete(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to delete item');
    }
  }

  return (
    <>
      <NavBar />
      <div className="page-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0 }}>My Wishlist</h1>
          <button className="btn-primary" onClick={openCreate}>
            + Add Item
          </button>
        </div>

        {showForm && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3>{editItem ? 'Edit Item' : 'New Item'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="title">Title *</label>
                <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="form-group">
                <label htmlFor="desc">Description</label>
                <textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>
              <div className="form-group">
                <label htmlFor="url">Link (URL)</label>
                <input id="url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
              </div>
              <div className="form-group">
                <label htmlFor="priority">Priority</label>
                <select id="priority" value={priority} onChange={(e) => setPriority(Number(e.target.value))}>
                  {PRIORITY_LABELS.map((l, i) => (
                    <option key={i} value={i}>{l}</option>
                  ))}
                </select>
              </div>
              {formError && <p className="error-message">{formError}</p>}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" /></div>
        ) : error ? (
          <p className="error-message">{error}</p>
        ) : items.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <p>Your wishlist is empty. Add your first item!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {items.map((item) => (
              <div key={item.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600 }}>{item.title}</span>
                    <StatusBadge status={item.status?.status ?? 'DISPONIBILE'} />
                    {item.priority > 0 && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        [{PRIORITY_LABELS[item.priority]}]
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>{item.description}</p>
                  )}
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.875rem' }}>
                      View Link
                    </a>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                  <button className="btn-secondary" onClick={() => openEdit(item)} style={{ fontSize: '0.8rem' }}>
                    Edit
                  </button>
                  <button className="btn-danger" onClick={() => handleDelete(item)} style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
