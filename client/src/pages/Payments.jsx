import { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { Plus, Search, Trash2, Wallet } from 'lucide-react';

function PaymentModal({ orders, customers, onClose, onSave }) {
  const [form, setForm] = useState({ customerId: '', orderId: '', amount: '', mode: 'cash', reference: '', date: dayjs().format('YYYY-MM-DD'), notes: '' });
  const [loading, setLoading] = useState(false);
  const [customerOrders, setCustomerOrders] = useState([]);

  useEffect(() => {
    if (form.customerId) {
      const co = orders.filter(o => o.customer?._id === form.customerId && o.paymentStatus !== 'paid');
      setCustomerOrders(co);
    } else {
      setCustomerOrders([]);
    }
  }, [form.customerId, orders]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/payments', {
        orderId: form.orderId || undefined,
        customerId: form.customerId,
        amount: parseFloat(form.amount),
        mode: form.mode,
        reference: form.reference,
        date: form.date,
        notes: form.notes,
      });
      onSave(data);
      toast.success('Payment recorded!');
      onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const selectedOrder = orders.find(o => o._id === form.orderId);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Record Payment</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Customer *</label>
            <select className="form-select" value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value, orderId: '' })} required>
              <option value="">Select customer...</option>
              {customers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Link to Order (Optional)</label>
            <select className="form-select" value={form.orderId} onChange={e => {
              const o = orders.find(ord => ord._id === e.target.value);
              const pending = o ? (o.totalAmount - o.paidAmount) : '';
              setForm({ ...form, orderId: e.target.value, amount: pending || form.amount });
            }}>
              <option value="">No specific order</option>
              {customerOrders.map(o => (
                <option key={o._id} value={o._id}>
                  {o.orderNumber} — ₹{(o.totalAmount - o.paidAmount).toLocaleString('en-IN')} pending
                </option>
              ))}
            </select>
          </div>
          {selectedOrder && (
            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '0.75rem', fontSize: '0.85rem' }}>
              <strong>{selectedOrder.orderNumber}</strong> — Total: ₹{selectedOrder.totalAmount?.toLocaleString('en-IN')} | Paid: ₹{selectedOrder.paidAmount?.toLocaleString('en-IN')} |
              <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}> Pending: ₹{(selectedOrder.totalAmount - selectedOrder.paidAmount)?.toLocaleString('en-IN')}</span>
            </div>
          )}
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Amount (₹) *</label>
              <input className="form-input" type="number" min="1" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Payment Mode *</label>
              <select className="form-select" value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value })}>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="bank">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Reference No.</label>
              <input className="form-input" placeholder="UPI ref / Cheque no." value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." style={{ minHeight: 60 }} />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-success" disabled={loading}>{loading ? 'Saving...' : 'Record Payment'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const modeColor = { cash: 'badge-green', upi: 'badge-blue', bank: 'badge-purple', cheque: 'badge-yellow', other: 'badge-gray' };

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState('');

  useEffect(() => {
    Promise.all([api.get('/payments'), api.get('/orders'), api.get('/customers')])
      .then(([p, o, c]) => { setPayments(p.data); setOrders(o.data); setCustomers(c.data); })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = payments.filter(p => {
    if (modeFilter && p.mode !== modeFilter) return false;
    if (search && !p.customer?.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const total = filtered.reduce((s, p) => s + p.amount, 0);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this payment? This will also update the order balance.')) return;
    try {
      await api.delete(`/payments/${id}`);
      setPayments(prev => prev.filter(p => p._id !== id));
      toast.success('Payment deleted');
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Payments</h1>
          <p className="page-subtitle">Total collected: <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>₹{total.toLocaleString('en-IN')}</span></p>
        </div>
        <button className="btn btn-success" onClick={() => setShowModal(true)}><Plus size={16} /> Record Payment</button>
      </div>

      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={16} />
          <input className="form-input search-input" placeholder="Search by customer..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 150 }} value={modeFilter} onChange={e => setModeFilter(e.target.value)}>
          <option value="">All Modes</option>
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="bank">Bank</option>
          <option value="cheque">Cheque</option>
          <option value="other">Other</option>
        </select>
      </div>

      {loading ? <div className="loading-page"><div className="loading-spinner" /></div> : (
        <div className="table-wrapper">
          <table>
            <thead><tr>
              <th>Date</th><th>Customer</th><th>Order #</th><th>Amount</th><th>Mode</th><th>Reference</th><th>Notes</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p._id}>
                  <td data-label="Date" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{dayjs(p.date).format('D MMM YYYY')}</td>
                  <td data-label="Customer" style={{ fontWeight: 600 }}>{p.customer?.name || '—'}</td>
                  <td data-label="Order #" style={{ color: 'var(--accent-blue)', fontWeight: 500, fontSize: '0.85rem' }}>{p.order?.orderNumber || '—'}</td>
                  <td data-label="Amount" style={{ fontWeight: 700, color: 'var(--accent-green)', fontSize: '1rem' }}>₹{p.amount?.toLocaleString('en-IN')}</td>
                  <td data-label="Mode"><span className={`badge ${modeColor[p.mode] || 'badge-gray'}`} style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{p.mode}</span></td>
                  <td data-label="Reference" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{p.reference || '—'}</td>
                  <td data-label="Notes" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: 120 }} className="truncate">{p.notes || '—'}</td>
                  <td data-label="Actions">
                    <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--accent-red)', minHeight: 'unset' }} onClick={() => handleDelete(p._id)}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={8}>
                  <div className="empty-state"><Wallet size={40} /><h3>No payments found</h3><p>Record your first payment to start tracking</p></div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <PaymentModal orders={orders} customers={customers} onClose={() => setShowModal(false)} onSave={p => setPayments(prev => [p, ...prev])} />}
    </div>
  );
}
