import { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Package } from 'lucide-react';

function ProductModal({ product, onClose, onSave }) {
  const [form, setForm] = useState(product || { size: '500ml', name: '', pricePerUnit: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (product?._id) {
        const { data } = await api.put(`/products/${product._id}`, { ...form, pricePerUnit: parseFloat(form.pricePerUnit) });
        onSave(data, 'edit'); toast.success('Product updated!');
      } else {
        const { data } = await api.post('/products', { ...form, pricePerUnit: parseFloat(form.pricePerUnit) });
        onSave(data, 'add'); toast.success('Product added!');
      }
      onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <span className="modal-title">{product?._id ? 'Edit Product' : 'Add Product'}</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Bottle Size *</label>
            <select className="form-select" value={form.size} onChange={e => setForm({ ...form, size: e.target.value })}>
              <option value="250ml">250ml</option>
              <option value="500ml">500ml</option>
              <option value="1L">1L</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Product Name *</label>
            <input className="form-input" placeholder="e.g. Pure Water 500ml" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Price Per Unit (₹) *</label>
            <input className="form-input" type="number" min="0" step="0.5" placeholder="10.00" value={form.pricePerUnit} onChange={e => setForm({ ...form, pricePerUnit: e.target.value })} required />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Product'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const SIZE_COLORS = { '250ml': 'badge-yellow', '500ml': 'badge-blue', '1L': 'badge-purple' };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  useEffect(() => {
    api.get('/products').then(r => setProducts(r.data)).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  }, []);

  const handleSave = (saved, mode) => {
    if (mode === 'add') setProducts(prev => [saved, ...prev]);
    else setProducts(prev => prev.map(p => p._id === saved._id ? saved : p));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      setProducts(prev => prev.filter(p => p._id !== id));
      toast.success('Product deleted');
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Products & Prices</h1>
          <p className="page-subtitle">Manage your bottle sizes and pricing</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('new')}><Plus size={16} /> Add Product</button>
      </div>

      {/* Info card */}
      <div style={{ background: 'var(--palette-ocean-soft)', border: '1px solid rgba(2,119,182,0.15)', borderRadius: 12, padding: '0.875rem 1.25rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        💡 Product prices are automatically suggested when creating orders. You can override them per order.
      </div>

      {loading ? <div className="loading-page"><div className="loading-spinner" /></div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {products.map(p => (
            <div key={p._id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 56, height: 56, borderRadius: 12, background: 'var(--palette-ocean-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)', fontSize: '1.5rem' }}>
                💧
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>{p.name}</div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span className={`badge ${SIZE_COLORS[p.size] || 'badge-gray'}`}>{p.size}</span>
                  <span style={{ color: 'var(--accent-green)', fontWeight: 700, fontSize: '1.1rem' }}>₹{p.pricePerUnit}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>per bottle</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setModal(p)}><Edit2 size={15} /></button>
                <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--accent-red)' }} onClick={() => handleDelete(p._id)}><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
          {!products.length && (
            <div style={{ gridColumn: '1/-1' }}>
              <div className="empty-state">
                <Package size={40} /><h3>No products yet</h3>
                <p>Add your bottle sizes and prices to get started</p>
                <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setModal('new')}><Plus size={16} /> Add Product</button>
              </div>
            </div>
          )}
        </div>
      )}

      {modal && <ProductModal product={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSave={handleSave} />}
    </div>
  );
}
