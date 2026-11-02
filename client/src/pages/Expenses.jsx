import { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { Plus, Search, Edit2, Trash2, Receipt } from 'lucide-react';

const CATEGORIES = ['purchase', 'transport', 'utilities', 'salary', 'maintenance', 'rent', 'other'];
const CAT_COLORS = {
  purchase: 'badge-blue', transport: 'badge-purple', utilities: 'badge-yellow',
  salary: 'badge-green', maintenance: 'badge-red', rent: 'badge-gray', other: 'badge-gray'
};

function ExpenseModal({ expense, onClose, onSave }) {
  const [form, setForm] = useState(expense || { description: '', category: 'purchase', amount: '', date: dayjs().format('YYYY-MM-DD'), vendor: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const f = (field) => ({ value: form[field] || '', onChange: e => setForm({ ...form, [field]: e.target.value }) });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (expense?._id) {
        const { data } = await api.put(`/expenses/${expense._id}`, form);
        onSave(data, 'edit'); toast.success('Expense updated!');
      } else {
        const { data } = await api.post('/expenses', { ...form, amount: parseFloat(form.amount) });
        onSave(data, 'add'); toast.success('Expense added!');
      }
      onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{expense?._id ? 'Edit Expense' : 'Add Expense'}</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Description *</label>
            <input className="form-input" placeholder="e.g. PET Bottles 1L — 1000 pcs" {...f('description')} required />
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select className="form-select" {...f('category')}>
                {CATEGORIES.map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Amount (₹) *</label>
              <input className="form-input" type="number" min="1" step="0.01" placeholder="0.00" {...f('amount')} required />
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" {...f('date')} />
            </div>
            <div className="form-group">
              <label className="form-label">Vendor / Paid To</label>
              <input className="form-input" placeholder="Supplier name" {...f('vendor')} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" placeholder="Additional details..." {...f('notes')} style={{ minHeight: 60 }} />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-danger" disabled={loading}>{loading ? 'Saving...' : 'Save Expense'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [catFilter, setCatFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/expenses').then(r => setExpenses(r.data)).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  }, []);

  const filtered = expenses.filter(e => {
    if (catFilter && e.category !== catFilter) return false;
    if (search && !e.description?.toLowerCase().includes(search.toLowerCase()) && !e.vendor?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  const handleSave = (saved, mode) => {
    if (mode === 'add') setExpenses(prev => [saved, ...prev]);
    else setExpenses(prev => prev.map(e => e._id === saved._id ? saved : e));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      setExpenses(prev => prev.filter(e => e._id !== id));
      toast.success('Expense deleted');
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">Total: <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>₹{total.toLocaleString('en-IN')}</span></p>
        </div>
        <button className="btn btn-danger" onClick={() => setModal('new')}><Plus size={16} /> Add Expense</button>
      </div>

      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={16} />
          <input className="form-input search-input" placeholder="Search description or vendor..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 170 }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>)}
        </select>
      </div>

      {loading ? <div className="loading-page"><div className="loading-spinner" /></div> : (
        <div className="table-wrapper">
          <table>
            <thead><tr>
              <th>Date</th><th>Description</th><th>Category</th><th>Vendor</th><th>Amount</th><th>Notes</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e._id}>
                  <td data-label="Date" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{dayjs(e.date).format('D MMM YYYY')}</td>
                  <td data-label="Description" style={{ fontWeight: 500 }}>{e.description}</td>
                  <td data-label="Category"><span className={`badge ${CAT_COLORS[e.category] || 'badge-gray'}`} style={{ textTransform: 'capitalize' }}>{e.category}</span></td>
                  <td data-label="Vendor" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{e.vendor || '—'}</td>
                  <td data-label="Amount" style={{ fontWeight: 700, color: 'var(--accent-red)', fontSize: '1rem' }}>₹{e.amount?.toLocaleString('en-IN')}</td>
                  <td data-label="Notes" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: 150 }} className="truncate">{e.notes || '—'}</td>
                  <td data-label="Actions">
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button className="btn btn-ghost btn-icon btn-sm" style={{ minHeight: 'unset' }} onClick={() => setModal(e)}><Edit2 size={14} /></button>
                      <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--accent-red)', minHeight: 'unset' }} onClick={() => handleDelete(e._id)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={7}>
                  <div className="empty-state"><Receipt size={40} /><h3>No expenses found</h3><p>Start tracking your business expenses</p></div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal && <ExpenseModal expense={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSave={handleSave} />}
    </div>
  );
}
