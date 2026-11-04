import { useEffect, useMemo, useState } from 'react';
import { Edit2, Package, Plus, Trash2, Archive, RotateCcw, CheckCircle2 } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { emitDataChanged, DATA_CHANGED_EVENT } from '../utils/dataEvents';
import '../styles/settings.css';
import '../styles/products-prices.css';

const SIZE_OPTIONS = ['250ml', '300ml', '500ml', '750ml', '1L', '2L', '20L Can'];
const initialForm = { name: '', size: '500ml', bottlesPerCase: 12, pricePerUnit: '' };
const fmt = value => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ProductsPrices() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [deleteProduct, setDeleteProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadProducts = async () => {
    try {
      const { data } = await api.get('/products');
      setProducts(Array.isArray(data) ? data : data.items || []);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    const handleChange = event => {
      if (event.detail?.resource === 'product') loadProducts();
    };
    window.addEventListener(DATA_CHANGED_EVENT, handleChange);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, handleChange);
  }, []);

  const casePrice = useMemo(() => {
    const bottles = parseInt(form.bottlesPerCase, 10) || 12;
    return (bottles * (parseFloat(form.pricePerUnit) || 0)).toFixed(2);
  }, [form.bottlesPerCase, form.pricePerUnit]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleSubmit = async event => {
    event.preventDefault();
    const price = parseFloat(form.pricePerUnit);
    const bottles = parseInt(form.bottlesPerCase, 10);
    if (!form.name.trim() || !Number.isFinite(price) || price < 0 || !Number.isInteger(bottles) || bottles < 1) {
      toast.error('Please enter valid product details');
      return;
    }
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), size: form.size, bottlesPerCase: bottles, pricePerUnit: price };
      const { data } = editingId
        ? await api.put(`/products/${editingId}`, payload)
        : await api.post('/products', payload);
      setProducts(prev => editingId ? prev.map(product => product._id === editingId ? data : product) : [...prev, data]);
      emitDataChanged('product');
      toast.success(editingId ? 'Product updated successfully!' : 'Product added successfully!');
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const editProduct = product => {
    setEditingId(product._id);
    setForm({
      name: product.name,
      size: product.size || '500ml',
      bottlesPerCase: product.bottlesPerCase || 12,
      pricePerUnit: String(product.pricePerUnit),
    });
  };

  const toggleArchive = async product => {
    try {
      const { data } = await api.put(`/products/${product._id}`, { isActive: product.isActive === false });
      setProducts(prev => prev.map(item => item._id === product._id ? data : item));
      emitDataChanged('product');
      toast.success(data.isActive === false ? 'Product archived!' : 'Product reactivated!');
    } catch {
      toast.error('Failed to change product status');
    }
  };

  const removeProduct = async () => {
    if (!deleteProduct) return;
    try {
      const { data } = await api.delete(`/products/${deleteProduct._id}`);
      setProducts(prev => data.archived
        ? prev.map(item => item._id === deleteProduct._id ? { ...item, isActive: false } : item)
        : prev.filter(item => item._id !== deleteProduct._id));
      emitDataChanged('product');
      toast.success(data.archived ? 'Product archived to preserve historical orders' : 'Product deleted');
    } catch {
      toast.error('Failed to delete product');
    } finally {
      setDeleteProduct(null);
    }
  };

  return (
    <div className="set-page products-prices-page">
      <div className="set-header products-prices-header">
        <div className="set-title-wrap">
          <h1 className="set-title">Products &amp; Prices</h1>
          <p className="set-subtitle">Manage bottle sizes, case quantities, and selling rates.</p>
        </div>
      </div>

      <div className="set-card">
        <div className="set-card-header">
          <div className="set-card-title-group">
            <div className="set-card-icon green"><Package size={20} /></div>
            <div>
              <h2 className="set-card-title">Product catalogue</h2>
              <p className="set-card-sub">Enter the exact rate per bottle. Case price is calculated automatically.</p>
            </div>
          </div>
          <span className="set-size-badge">{products.length} Product{products.length !== 1 ? 's' : ''}</span>
        </div>

        <form onSubmit={handleSubmit} className="set-prod-form-mobile products-prices-form">
          <div className="set-form-group">
            <label className="set-form-label">Product Name *</label>
            <input className="set-form-input" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Mineral Water 500ml" required />
          </div>
          <div className="set-form-grid-2">
            <div className="set-form-group">
              <label className="set-form-label">Bottle Size</label>
              <select className="set-form-select" value={form.size} onChange={e => setForm(prev => ({ ...prev, size: e.target.value }))}>
                {SIZE_OPTIONS.map(size => <option key={size}>{size}</option>)}
              </select>
            </div>
            <div className="set-form-group">
              <label className="set-form-label">Bottles / Case</label>
              <input className="set-form-input" type="number" min="1" value={form.bottlesPerCase} onChange={e => setForm(prev => ({ ...prev, bottlesPerCase: e.target.value }))} required />
            </div>
          </div>
          <div className="set-form-group">
            <label className="set-form-label">Price / Bottle (₹)</label>
            <input className="set-form-input" type="number" min="0" step="any" value={form.pricePerUnit} onChange={e => setForm(prev => ({ ...prev, pricePerUnit: e.target.value }))} placeholder="13.333" required />
            <span className="set-case-price-tag">Case price: {fmt(casePrice)}</span>
          </div>
          <div className="products-prices-actions">
            {editingId && <button type="button" className="btn btn-outline" onClick={resetForm}>Cancel</button>}
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {editingId ? <CheckCircle2 size={16} /> : <Plus size={16} />}
              {saving ? 'Saving...' : editingId ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </form>

        {loading ? <div className="set-card-sub">Loading products...</div> : (
          <div className="products-prices-list">
            {products.map(product => {
              const archived = product.isActive === false;
              return (
                <div className={`products-prices-row${archived ? ' archived' : ''}`} key={product._id}>
                  <div>
                    <strong>{product.name}</strong>
                    <span>{product.size} · {product.bottlesPerCase || 12} bottles/case</span>
                  </div>
                  <div className="products-prices-values">
                    <span>{fmt(product.pricePerUnit)} / bottle</span>
                    <strong>{fmt((product.bottlesPerCase || 12) * product.pricePerUnit)} / case</strong>
                  </div>
                  <div className="products-prices-actions">
                    <button type="button" className="btn btn-icon btn-ghost" onClick={() => editProduct(product)} aria-label={`Edit ${product.name}`}><Edit2 size={15} /></button>
                    <button type="button" className="btn btn-icon btn-ghost" onClick={() => toggleArchive(product)} aria-label={archived ? 'Reactivate product' : 'Archive product'}>{archived ? <RotateCcw size={15} /> : <Archive size={15} />}</button>
                    <button type="button" className="btn btn-icon btn-ghost" onClick={() => setDeleteProduct(product)} aria-label={`Delete ${product.name}`}><Trash2 size={15} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteProduct)}
        title="Delete product?"
        message={deleteProduct ? `Delete "${deleteProduct.name}"? Products used by historical orders may be archived instead.` : ''}
        onConfirm={removeProduct}
        onCancel={() => setDeleteProduct(null)}
      />
    </div>
  );
}
