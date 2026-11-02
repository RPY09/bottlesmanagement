import { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Save, User, Building2, Package, Plus, Trash2, Edit2, Check, X } from 'lucide-react';

const SIZE_OPTIONS = ['250ml', '300ml', '500ml', '750ml', '1L', '2L', '20L Can'];

function ProductRow({ product, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: product.name,
    size: product.size,
    bottlesPerCase: product.bottlesPerCase || 12,
    pricePerUnit: product.pricePerUnit,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.put(`/products/${product._id}`, form);
      onUpdate(data);
      setEditing(false);
      toast.success('Product updated!');
    } catch { toast.error('Failed to update product'); }
    finally { setSaving(false); }
  };

  const bottlesInCase = form.bottlesPerCase || 12;

  if (editing) {
    return (
      <tr>
        <td><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ minWidth: 140 }} /></td>
        <td>
          <select className="form-select" value={form.size} onChange={e => setForm({ ...form, size: e.target.value })} style={{ minWidth: 95 }}>
            {SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </td>
        <td>
          <input
            className="form-input"
            type="number"
            min="1"
            value={form.bottlesPerCase}
            onChange={e => setForm({ ...form, bottlesPerCase: parseInt(e.target.value) || 1 })}
            style={{ width: 85, textAlign: 'center' }}
          />
        </td>
        <td>
          <input
            className="form-input"
            type="number"
            min="0"
            step="0.5"
            value={form.pricePerUnit}
            onChange={e => setForm({ ...form, pricePerUnit: parseFloat(e.target.value) || 0 })}
            style={{ width: 95 }}
          />
        </td>
        <td style={{ fontWeight: 600, color: 'var(--accent-green)' }}>
          ₹{((form.pricePerUnit || 0) * bottlesInCase).toFixed(2)}
        </td>
        <td>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--accent-green)' }} onClick={handleSave} disabled={saving}><Check size={14} /></button>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditing(false)}><X size={14} /></button>
          </div>
        </td>
      </tr>
    );
  }

  const pBottles = product.bottlesPerCase || 12;

  return (
    <tr>
      <td style={{ fontWeight: 500 }}>{product.name}</td>
      <td><span className="badge badge-blue">{product.size}</span></td>
      <td><span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{pBottles}</span> <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>bottles/case</span></td>
      <td>₹{product.pricePerUnit} / bottle</td>
      <td style={{ color: 'var(--accent-green)', fontWeight: 600 }}>₹{(product.pricePerUnit * pBottles).toFixed(2)}</td>
      <td>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditing(true)} title="Edit"><Edit2 size={14} /></button>
          <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--accent-red)' }} onClick={() => onDelete(product._id)} title="Delete"><Trash2 size={14} /></button>
        </div>
      </td>
    </tr>
  );
}

export default function Settings() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    name: '', email: '', businessName: '', fssaiNo: '', phone: '', upiId: '', address: '',
  });
  const [loading, setLoading] = useState(false);

  // Products
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({ name: '', size: '500ml', bottlesPerCase: 12, pricePerUnit: '' });
  const [addingProduct, setAddingProduct] = useState(false);

  useEffect(() => {
    api.get('/auth/profile').then(r => {
      const u = r.data;
      setForm({ name: u.name || '', email: u.email || '', businessName: u.businessName || '', fssaiNo: u.fssaiNo || '', phone: u.phone || '', upiId: u.upiId || '', address: u.address || '' });
    });
    api.get('/products').then(r => setProducts(r.data)).catch(() => {});
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.put('/auth/profile', form);
      updateUser({ ...user, ...data });
      toast.success('Profile updated!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update'); }
    finally { setLoading(false); }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name.trim() || !newProduct.pricePerUnit) return toast.error('Fill in all product fields');
    setAddingProduct(true);
    try {
      const { data } = await api.post('/products', {
        ...newProduct,
        bottlesPerCase: parseInt(newProduct.bottlesPerCase) || 12,
        pricePerUnit: parseFloat(newProduct.pricePerUnit),
      });
      setProducts(prev => [...prev, data]);
      setNewProduct({ name: '', size: '500ml', bottlesPerCase: 12, pricePerUnit: '' });
      toast.success('Product added!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add product'); }
    finally { setAddingProduct(false); }
  };

  const handleUpdateProduct = (updated) => {
    setProducts(prev => prev.map(p => p._id === updated._id ? updated : p));
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      setProducts(prev => prev.filter(p => p._id !== id));
      toast.success('Product deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const f = (field) => ({ value: form[field] || '', onChange: e => setForm({ ...form, [field]: e.target.value }) });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your business profile and product prices</p>
        </div>
      </div>

      {/* Products & Prices */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-green)' }}>
            <Package size={20} />
          </div>
          <div>
            <h3 style={{ marginBottom: 0 }}>Products &amp; Prices</h3>
            <p style={{ fontSize: '0.8rem', margin: 0 }}>Configure bottle size, case size (bottles per case), and pricing</p>
          </div>
        </div>

        {/* Add new product row */}
        <div className="product-add-grid">
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Product Name</label>
            <input className="form-input" placeholder="e.g. Pure Water 500ml" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Bottle Size</label>
            <select className="form-select" value={newProduct.size} onChange={e => setNewProduct({ ...newProduct, size: e.target.value })}>
              {SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Case Size <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(Bottles)</span></label>
            <input
              className="form-input"
              type="number"
              min="1"
              placeholder="12"
              value={newProduct.bottlesPerCase}
              onChange={e => setNewProduct({ ...newProduct, bottlesPerCase: e.target.value })}
              style={{ textAlign: 'center' }}
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Price / Bottle (₹)</label>
            <input className="form-input" type="number" min="0" step="0.5" placeholder="e.g. 12" value={newProduct.pricePerUnit} onChange={e => setNewProduct({ ...newProduct, pricePerUnit: e.target.value })} />
          </div>
          <button className="btn btn-primary" onClick={handleAddProduct} disabled={addingProduct} style={{ height: 40, alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Plus size={16} />{addingProduct ? 'Adding...' : 'Add'}
          </button>
        </div>

        {products.length > 0 && (
          <div className="table-wrapper" style={{ margin: 0 }}>
            <table>
              <thead><tr>
                <th>Product Name</th><th>Bottle Size</th><th>Case Size</th><th>Price / Bottle</th><th>Price / Case</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {products.map(p => (
                  <ProductRow key={p._id} product={p} onUpdate={handleUpdateProduct} onDelete={handleDeleteProduct} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!products.length && (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            No products yet — add one above to enable order creation.
          </div>
        )}
      </div>

      {/* Profile & Business */}
      <div className="settings-profile-grid">
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)' }}>
              <User size={20} />
            </div>
            <div>
              <h3 style={{ marginBottom: 0 }}>Personal Info</h3>
              <p style={{ fontSize: '0.8rem', margin: 0 }}>Your account details</p>
            </div>
          </div>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Your Name</label>
              <input className="form-input" {...f('name')} placeholder="Full name" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" {...f('email')} placeholder="email@example.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" {...f('phone')} placeholder="+91 9999 999999" />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ alignSelf: 'flex-start' }}>
              <Save size={16} />{loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(6,182,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-cyan)' }}>
              <Building2 size={20} />
            </div>
            <div>
              <h3 style={{ marginBottom: 0 }}>Business Info</h3>
              <p style={{ fontSize: '0.8rem', margin: 0 }}>Shown on reminders and invoices</p>
            </div>
          </div>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Business Name</label>
              <input className="form-input" {...f('businessName')} placeholder="Manjeera Beverages" />
            </div>
            <div className="form-group">
              <label className="form-label">FSSAI Registration No.</label>
              <input className="form-input" {...f('fssaiNo')} placeholder="23626019000558" />
            </div>
            <div className="form-group">
              <label className="form-label">UPI ID (for payment reminders)</label>
              <input className="form-input" {...f('upiId')} placeholder="yourname@upi" />
            </div>
            <div className="form-group">
              <label className="form-label">Business Address</label>
              <textarea className="form-textarea" {...f('address')} placeholder="Full business address" style={{ minHeight: 60 }} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ alignSelf: 'flex-start' }}>
              <Save size={16} />{loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
