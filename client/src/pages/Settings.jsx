import { useEffect, useState, useMemo } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  Save, User, Building2, Package, Plus, Trash2, Edit2,
  Archive, CheckCircle2, RotateCcw, AlertCircle, Tag
} from 'lucide-react';
import '../styles/settings.css';
import ConfirmDialog from '../components/ConfirmDialog';

// ─── Constants ───────────────────────────────────────────────────────────────
const SIZE_OPTIONS = ['250ml', '300ml', '500ml', '750ml', '1L', '2L', '20L Can'];

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Helper to get initials
function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// ─── Main Settings Component ─────────────────────────────────────────────────
export default function Settings() {
  const { user, updateUser } = useAuth();

  // ── Products State ──
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [editingProductId, setEditingProductId] = useState(null);
  const [deleteProduct, setDeleteProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '',
    size: '500ml',
    bottlesPerCase: 12,
    pricePerUnit: '',
  });
  const [savingProduct, setSavingProduct] = useState(false);

  // ── Personal Info State ──
  const [personalForm, setPersonalForm] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [initialPersonal, setInitialPersonal] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [savingPersonal, setSavingPersonal] = useState(false);

  // ── Business Info State ──
  const [businessForm, setBusinessForm] = useState({
    businessName: '',
    fssaiNo: '',
    businessPhone: '',
    upiId: '',
    address: '',
  });
  const [initialBusiness, setInitialBusiness] = useState({
    businessName: '',
    fssaiNo: '',
    businessPhone: '',
    upiId: '',
    address: '',
  });
  const [savingBusiness, setSavingBusiness] = useState(false);

  // ── Fetch Profile & Products on Mount ──
  useEffect(() => {
    // 1. Fetch user profile
    api.get('/auth/profile')
      .then(res => {
        const u = res.data;
        const pData = {
          name: u.name || '',
          email: u.email || '',
          phone: u.phone || '',
        };
        const bData = {
          businessName: u.businessName || '',
          fssaiNo: u.fssaiNo || '',
          businessPhone: u.businessPhone || u.phone || '',
          upiId: u.upiId || '',
          address: u.address || '',
        };
        setPersonalForm(pData);
        setInitialPersonal(pData);
        setBusinessForm(bData);
        setInitialBusiness(bData);
      })
      .catch(() => toast.error('Failed to load profile details'));

    // 2. Fetch products
    api.get('/products')
      .then(res => {
        setProducts(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoadingProducts(false));
  }, []);

  // ── Unsaved changes indicators ──
  const isPersonalDirty = useMemo(() => {
    return (
      personalForm.name !== initialPersonal.name ||
      personalForm.email !== initialPersonal.email ||
      personalForm.phone !== initialPersonal.phone
    );
  }, [personalForm, initialPersonal]);

  const isBusinessDirty = useMemo(() => {
    return (
      businessForm.businessName !== initialBusiness.businessName ||
      businessForm.fssaiNo !== initialBusiness.fssaiNo ||
      businessForm.businessPhone !== initialBusiness.businessPhone ||
      businessForm.upiId !== initialBusiness.upiId ||
      businessForm.address !== initialBusiness.address
    );
  }, [businessForm, initialBusiness]);

  // ── Live Calculated Case Price ──
  const calculatedCasePrice = useMemo(() => {
    const bottles = parseInt(productForm.bottlesPerCase, 10) || 12;
    const price = parseFloat(productForm.pricePerUnit) || 0;
    return (bottles * price).toFixed(2);
  }, [productForm.bottlesPerCase, productForm.pricePerUnit]);

  // ── Product Add / Update Handler ──
  const handleProductSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!productForm.name.trim()) {
      toast.error('Please enter a product name');
      return;
    }
    const parsedPrice = parseFloat(productForm.pricePerUnit);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      toast.error('Please enter a valid price per bottle');
      return;
    }
    const bottles = parseInt(productForm.bottlesPerCase, 10);
    if (isNaN(bottles) || bottles < 1) {
      toast.error('Case size must be at least 1 bottle');
      return;
    }

    setSavingProduct(true);
    const payload = {
      name: productForm.name.trim(),
      size: productForm.size,
      bottlesPerCase: bottles,
      pricePerUnit: parsedPrice,
    };

    try {
      if (editingProductId) {
        const { data } = await api.put(`/products/${editingProductId}`, payload);
        setProducts(prev => prev.map(p => p._id === editingProductId ? data : p));
        toast.success('Product updated successfully!');
        setEditingProductId(null);
      } else {
        const { data } = await api.post('/products', payload);
        setProducts(prev => [...prev, data]);
        toast.success('Product added successfully!');
      }
      setProductForm({ name: '', size: '500ml', bottlesPerCase: 12, pricePerUnit: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product');
    } finally {
      setSavingProduct(false);
    }
  };

  // ── Edit Product ──
  const handleStartEdit = (product) => {
    setEditingProductId(product._id);
    setProductForm({
      name: product.name,
      size: product.size || '500ml',
      bottlesPerCase: product.bottlesPerCase || 12,
      pricePerUnit: String(product.pricePerUnit),
    });
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingProductId(null);
    setProductForm({ name: '', size: '500ml', bottlesPerCase: 12, pricePerUnit: '' });
  };

  // ── Archive / Toggle Active Status ──
  const handleToggleArchive = async (product) => {
    const nextStatus = product.isActive === false ? true : false;
    try {
      const { data } = await api.put(`/products/${product._id}`, { isActive: nextStatus });
      setProducts(prev => prev.map(p => p._id === product._id ? data : p));
      toast.success(nextStatus ? 'Product reactivated!' : 'Product archived!');
    } catch {
      toast.error('Failed to change product status');
    }
  };

  // ── Delete Product ──
  const handleDeleteProduct = async (product) => {
    if (deletingProduct) return;
    setDeletingProduct(true);
    try {
      const { data } = await api.delete(`/products/${product._id}`);
      if (data.archived) {
        toast('Archived to preserve historical orders', { icon: '📦' });
        setProducts(prev => prev.map(p => p._id === product._id ? { ...p, isActive: false } : p));
      } else {
        toast.success('Product permanently deleted');
        setProducts(prev => prev.filter(p => p._id !== product._id));
      }
      setDeleteProduct(null);
    } catch {
      toast.error('Failed to delete product');
    } finally {
      setDeletingProduct(false);
    }
  };

  // ── Personal Info Save ──
  const handleSavePersonal = async (e) => {
    e.preventDefault();
    if (!personalForm.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!personalForm.email.trim()) {
      toast.error('Email is required');
      return;
    }

    setSavingPersonal(true);
    try {
      const { data } = await api.put('/auth/profile', personalForm);
      updateUser({ ...user, ...data });
      setInitialPersonal(personalForm);
      toast.success('Personal profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update personal details');
    } finally {
      setSavingPersonal(false);
    }
  };

  // ── Business Info Save ──
  const handleSaveBusiness = async (e) => {
    e.preventDefault();
    if (!businessForm.businessName.trim()) {
      toast.error('Business name is required');
      return;
    }

    // Optional UPI validation
    if (businessForm.upiId.trim() && !businessForm.upiId.includes('@')) {
      toast.error('Please enter a valid UPI ID (e.g. name@bank)');
      return;
    }

    // Optional FSSAI validation (standard 14 digits)
    if (businessForm.fssaiNo.trim() && businessForm.fssaiNo.replace(/\D/g, '').length !== 14) {
      toast.error('FSSAI number must be 14 digits');
      return;
    }

    setSavingBusiness(true);
    try {
      const { data } = await api.put('/auth/profile', businessForm);
      updateUser({ ...user, ...data });
      setInitialBusiness(businessForm);
      toast.success('Business information updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update business details');
    } finally {
      setSavingBusiness(false);
    }
  };

  return (
    <div className="set-page">

      {/* ─── Page Header ─── */}
      <div className="set-header">
        <div className="set-title-wrap">
          <h1 className="set-title">Settings</h1>
          <p className="set-subtitle">Manage product catalogue, pricing, and business credentials</p>
        </div>
      </div>

      {/* ─── SECTION 1: Products & Prices ─── */}
      <div className="set-card">
        <div className="set-card-header">
          <div className="set-card-title-group">
            <div className="set-card-icon green">
              <Package size={20} />
            </div>
            <div>
              <h2 className="set-card-title">Products &amp; Prices</h2>
              <p className="set-card-sub">
                Configure sizes, bottles per case, and prices per unit. Case price updates automatically.
              </p>
            </div>
          </div>
          <span className="set-size-badge" style={{ background: 'var(--status-success-bg)', color: 'var(--status-success-text)' }}>
            {products.length} Product{products.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── Desktop Product Entry Form (>= 1024px) ── */}
        <form onSubmit={handleProductSubmit} className="set-prod-form-desktop">
          <div className="set-form-group">
            <label className="set-form-label">Product Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Mineral Water 500ml"
              className="set-form-input"
              value={productForm.name}
              onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="set-form-group">
            <label className="set-form-label">Bottle Size</label>
            <select
              className="set-form-select"
              value={productForm.size}
              onChange={e => setProductForm(f => ({ ...f, size: e.target.value }))}
            >
              {SIZE_OPTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="set-form-group">
            <label className="set-form-label">Bottles / Case</label>
            <input
              type="number"
              min="1"
              required
              className="set-form-input"
              style={{ textAlign: 'center' }}
              value={productForm.bottlesPerCase}
              onChange={e => setProductForm(f => ({ ...f, bottlesPerCase: e.target.value }))}
            />
          </div>

          <div className="set-form-group">
            <label className="set-form-label">
              Price / Bottle (₹) *
              <span className="set-form-label-hint">Case: ₹{calculatedCasePrice}</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              placeholder="0.00"
              className="set-form-input"
              value={productForm.pricePerUnit}
              onChange={e => setProductForm(f => ({ ...f, pricePerUnit: e.target.value }))}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', height: 40 }}>
            {editingProductId && (
              <button
                type="button"
                className="set-btn-cancel-edit"
                onClick={handleCancelEdit}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="set-btn-add-prod"
              disabled={savingProduct}
            >
              {editingProductId ? <CheckCircle2 size={16} /> : <Plus size={16} />}
              {savingProduct ? 'Saving...' : editingProductId ? 'Update' : 'Add'}
            </button>
          </div>
        </form>

        {/* ── Mobile Product Entry Form (< 1024px) ── */}
        <form onSubmit={handleProductSubmit} className="set-prod-form-mobile">
          {/* 1. Product Name: Full width */}
          <div className="set-form-group">
            <label className="set-form-label">Product Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Pure Drops 500ml"
              className="set-form-input"
              value={productForm.name}
              onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          {/* 2. Bottle Size and Bottles per Case: 2-column grid */}
          <div className="set-form-grid-2">
            <div className="set-form-group">
              <label className="set-form-label">Bottle Size</label>
              <select
                className="set-form-select"
                value={productForm.size}
                onChange={e => setProductForm(f => ({ ...f, size: e.target.value }))}
              >
                {SIZE_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="set-form-group">
              <label className="set-form-label">Bottles / Case</label>
              <input
                type="number"
                min="1"
                required
                className="set-form-input"
                style={{ textAlign: 'center' }}
                value={productForm.bottlesPerCase}
                onChange={e => setProductForm(f => ({ ...f, bottlesPerCase: e.target.value }))}
              />
            </div>
          </div>

          {/* 3. Price per Bottle: Full width with case calculation */}
          <div className="set-form-group">
            <label className="set-form-label">Price per Bottle (₹) *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              placeholder="0.00"
              className="set-form-input"
              value={productForm.pricePerUnit}
              onChange={e => setProductForm(f => ({ ...f, pricePerUnit: e.target.value }))}
            />
            <div className="set-case-price-tag">
              <Tag size={13} />
              <span>Calculated Price per Case: ₹{calculatedCasePrice}</span>
            </div>
          </div>

          {/* 4. Action button */}
          <div style={{ display: 'flex', gap: '0.5rem', width: '100%', marginTop: '0.2rem' }}>
            {editingProductId && (
              <button
                type="button"
                className="set-btn-cancel-edit"
                style={{ flex: 1 }}
                onClick={handleCancelEdit}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="set-btn-add-prod"
              style={{ flex: 2 }}
              disabled={savingProduct}
            >
              {editingProductId ? <CheckCircle2 size={16} /> : <Plus size={16} />}
              {savingProduct ? 'Saving...' : editingProductId ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </form>

        {/* ── Product List Display ── */}
        {loadingProducts ? (
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 48, background: '#F8FAFC', borderRadius: 8 }} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)' }}>
            <Package size={32} style={{ color: 'var(--text-muted)', marginBottom: 6 }} />
            <div style={{ fontWeight: 700, color: 'var(--palette-deep-navy)' }}>No products configured yet</div>
            <p style={{ fontSize: '0.82rem', margin: '4px 0 0' }}>
              Add your first bottle size above to enable order creation and invoicing.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= 1024px) */}
            <div className="set-desktop-only">
              <div className="set-table-wrapper">
                <table className="set-table">
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>Bottle Size</th>
                      <th>Case Size</th>
                      <th className="right">Price / Bottle</th>
                      <th className="right">Price / Case</th>
                      <th>Status</th>
                      <th className="right" style={{ width: 110 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(p => {
                      const caseQty = p.bottlesPerCase || 12;
                      const unitPrice = p.pricePerUnit || 0;
                      const caseTotal = caseQty * unitPrice;
                      const isArchived = p.isActive === false;

                      return (
                        <tr key={p._id} className={isArchived ? 'archived' : ''}>
                          <td style={{ fontWeight: 700, color: 'var(--palette-deep-navy)' }}>{p.name}</td>
                          <td><span className="set-size-badge">{p.size}</span></td>
                          <td>{caseQty} bottles/case</td>
                          <td className="right" style={{ fontWeight: 600 }}>{fmt(unitPrice)}</td>
                          <td className="right" style={{ fontWeight: 800, color: 'var(--status-success-text)' }}>
                            {fmt(caseTotal)}
                          </td>
                          <td>
                            <span className={`set-status-pill ${isArchived ? 'archived' : 'active'}`}>
                              {isArchived ? 'Archived' : 'Active'}
                            </span>
                          </td>
                          <td className="right">
                            <div className="set-table-actions">
                              <button
                                type="button"
                                className="set-action-btn"
                                title="Edit product"
                                onClick={() => handleStartEdit(p)}
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                type="button"
                                className="set-action-btn archive"
                                title={isArchived ? 'Reactivate product' : 'Archive product'}
                                onClick={() => handleToggleArchive(p)}
                              >
                                {isArchived ? <RotateCcw size={14} /> : <Archive size={14} />}
                              </button>
                              <button
                                type="button"
                                className="set-action-btn delete"
                                title="Delete product"
                                onClick={() => setDeleteProduct(p)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards List (< 1024px) */}
            <div className="set-mobile-only">
              <div className="set-prod-cards-list">
                {products.map(p => {
                  const caseQty = p.bottlesPerCase || 12;
                  const unitPrice = p.pricePerUnit || 0;
                  const caseTotal = caseQty * unitPrice;
                  const isArchived = p.isActive === false;

                  return (
                    <div key={p._id} className={`set-prod-card ${isArchived ? 'archived' : ''}`}>
                      <div className="set-prod-card-top">
                        <span className="set-prod-card-name">{p.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className={`set-status-pill ${isArchived ? 'archived' : 'active'}`}>
                            {isArchived ? 'Archived' : 'Active'}
                          </span>
                          <span className="set-size-badge">{p.size}</span>
                        </div>
                      </div>

                      <div className="set-prod-card-price">
                        {fmt(unitPrice)} <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>/ bottle</span>
                      </div>

                      <div className="set-prod-card-meta">
                        <span>{caseQty} bottles per case</span>
                      </div>

                      <div className="set-prod-card-case">
                        Price per case: {fmt(caseTotal)}
                      </div>

                      <div className="set-prod-card-footer">
                        <button
                          type="button"
                          className="set-card-action-link"
                          onClick={() => handleStartEdit(p)}
                        >
                          <Edit2 size={13} /> Edit
                        </button>
                        <button
                          type="button"
                          className="set-card-action-link archive"
                          onClick={() => handleToggleArchive(p)}
                        >
                          {isArchived ? <RotateCcw size={13} /> : <Archive size={13} />}
                          {isArchived ? 'Reactivate' : 'Archive'}
                        </button>
                        <button
                          type="button"
                          className="set-card-action-link delete"
                          onClick={() => setDeleteProduct(p)}
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ─── PROFILES CONTAINER: Personal (Section 2) & Business (Section 3) ─── */}
      <div className="set-profiles-grid">

        {/* ─── SECTION 2: Personal Information ─── */}
        <div className="set-card">
          <div className="set-card-header">
            <div className="set-card-title-group">
              <div className="set-card-icon navy">
                <User size={20} />
              </div>
              <div>
                <h2 className="set-card-title">Personal Information</h2>
                <p className="set-card-sub">Your owner account and contact credentials</p>
              </div>
            </div>
            {isPersonalDirty && (
              <span className="set-unsaved-badge">
                <AlertCircle size={12} /> Unsaved
              </span>
            )}
          </div>

          {/* Profile Initials Avatar */}
          <div className="set-avatar-header">
            <div className="set-avatar-circle">
              {getInitials(personalForm.name || user?.name)}
            </div>
            <div className="set-avatar-info">
              <span className="set-avatar-name">{personalForm.name || 'Account Owner'}</span>
              <span className="set-avatar-email">{personalForm.email || 'No email set'}</span>
            </div>
          </div>

          <form onSubmit={handleSavePersonal} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div className="set-form-group">
              <label className="set-form-label">
                <span>Full Name *</span>
              </label>
              <input
                type="text"
                required
                className="set-form-input"
                placeholder="e.g. Rajesh Kumar"
                value={personalForm.name}
                onChange={e => setPersonalForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="set-form-group">
              <label className="set-form-label">
                <span>Email Address *</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  required
                  className="set-form-input"
                  placeholder="owner@example.com"
                  value={personalForm.email}
                  onChange={e => setPersonalForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>

            <div className="set-form-group">
              <label className="set-form-label">
                <span>Phone Number</span>
              </label>
              <input
                type="tel"
                className="set-form-input"
                placeholder="+91 98765 43210"
                value={personalForm.phone}
                onChange={e => setPersonalForm(f => ({ ...f, phone: e.target.value }))}
              />
            </div>

            <div className="set-form-actions">
              <button
                type="submit"
                className="set-btn-save"
                disabled={savingPersonal || !isPersonalDirty}
              >
                <Save size={15} />
                {savingPersonal ? 'Saving...' : 'Save Personal Details'}
              </button>
            </div>
          </form>
        </div>

        {/* ─── SECTION 3: Business Information ─── */}
        <div className="set-card">
          <div className="set-card-header">
            <div className="set-card-title-group">
              <div className="set-card-icon blue">
                <Building2 size={20} />
              </div>
              <div>
                <h2 className="set-card-title">Business Information</h2>
                <p className="set-card-sub">Used for customer invoices and WhatsApp payment reminders</p>
              </div>
            </div>
            {isBusinessDirty && (
              <span className="set-unsaved-badge">
                <AlertCircle size={12} /> Unsaved
              </span>
            )}
          </div>

          <form onSubmit={handleSaveBusiness} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div className="set-form-group">
              <label className="set-form-label">
                <span>Business / Plant Name *</span>
              </label>
              <input
                type="text"
                required
                className="set-form-input"
                placeholder="e.g. Manjeera Beverages"
                value={businessForm.businessName}
                onChange={e => setBusinessForm(f => ({ ...f, businessName: e.target.value }))}
              />
            </div>

            <div className="set-form-grid-2">
              <div className="set-form-group">
                <label className="set-form-label">
                  <span>FSSAI License No.</span>
                </label>
                <input
                  type="text"
                  maxLength={14}
                  className="set-form-input"
                  placeholder="14-digit FSSAI"
                  value={businessForm.fssaiNo}
                  onChange={e => setBusinessForm(f => ({ ...f, fssaiNo: e.target.value }))}
                />
              </div>

              <div className="set-form-group">
                <label className="set-form-label">
                  <span>Business Phone</span>
                </label>
                <input
                  type="tel"
                  className="set-form-input"
                  placeholder="+91 9999 999999"
                  value={businessForm.businessPhone}
                  onChange={e => setBusinessForm(f => ({ ...f, businessPhone: e.target.value }))}
                />
              </div>
            </div>

            <div className="set-form-group">
              <label className="set-form-label">
                <span>UPI ID (For WhatsApp payment reminders)</span>
              </label>
              <input
                type="text"
                className="set-form-input"
                placeholder="yourbusiness@upi"
                value={businessForm.upiId}
                onChange={e => setBusinessForm(f => ({ ...f, upiId: e.target.value }))}
              />
            </div>

            <div className="set-form-group">
              <label className="set-form-label">
                <span>Business / Plant Address</span>
              </label>
              <textarea
                rows={3}
                className="set-form-textarea"
                placeholder="Street address, Industrial area, City, Pin code..."
                value={businessForm.address}
                onChange={e => setBusinessForm(f => ({ ...f, address: e.target.value }))}
              />
            </div>

            <div className="set-form-actions">
              <button
                type="submit"
                className="set-btn-save"
                disabled={savingBusiness || !isBusinessDirty}
              >
                <Save size={15} />
                {savingBusiness ? 'Saving...' : 'Save Business Details'}
              </button>
            </div>
          </form>
        </div>

        <ConfirmDialog
          open={Boolean(deleteProduct)}
          title="Delete product?"
          message={deleteProduct ? `Delete "${deleteProduct.name}"? Products used by historical orders may be archived instead.` : ''}
          loading={deletingProduct}
          onCancel={() => setDeleteProduct(null)}
          onConfirm={() => handleDeleteProduct(deleteProduct)}
        />

      </div>

    </div>
  );
}
