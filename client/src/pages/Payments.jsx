import { useEffect, useState, useMemo } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import {
  Plus,
  Search,
  Trash2,
  Wallet,
  MoreVertical,
  X,
  FileText,
  CreditCard,
  ChevronRight,
  Calendar,
  User,
  Hash,
  ArrowDownLeft,
} from 'lucide-react';
import '../styles/payments.css';

/* ─── Helper: Initials Avatar ─── */
function getInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ─── Helper: Date & Time ─── */
function formatPaymentDateTime(p) {
  if (!p) return '—';
  if (p.createdAt) {
    return dayjs(p.createdAt).format('DD MMM YYYY · hh:mm A');
  }
  return dayjs(p.date).format('DD MMM YYYY');
}

/* ─── Component: Payment Method Badge ─── */
export function PaymentMethodBadge({ mode }) {
  const m = (mode || 'other').toLowerCase();
  let badgeClass = 'pm-badge-other';
  let label = mode ? mode.toUpperCase() : 'OTHER';

  if (m === 'upi') {
    badgeClass = 'pm-badge-upi';
    label = 'UPI';
  } else if (m === 'cash') {
    badgeClass = 'pm-badge-cash';
    label = 'CASH';
  } else if (m === 'bank' || m === 'bank transfer') {
    badgeClass = 'pm-badge-bank';
    label = 'BANK TRANSFER';
  } else if (m === 'cheque') {
    badgeClass = 'pm-badge-other';
    label = 'CHEQUE';
  } else {
    badgeClass = 'pm-badge-other';
    label = (mode || 'OTHER').toUpperCase();
  }

  return (
    <span className={`pm-badge ${badgeClass}`}>
      {label}
    </span>
  );
}

/* ─── Component: Record Payment Modal ─── */
function PaymentModal({ orders, customers, onClose, onSave }) {
  const [form, setForm] = useState({
    customerId: '',
    orderId: '',
    amount: '',
    mode: 'upi',
    reference: '',
    date: dayjs().format('YYYY-MM-DD'),
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  // Derive customer orders dynamically during render
  const customerOrders = useMemo(() => {
    if (!form.customerId) return [];
    return orders.filter(
      (o) =>
        (o.customer?._id === form.customerId || o.customer === form.customerId) &&
        o.paymentStatus !== 'paid'
    );
  }, [form.customerId, orders]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customerId) {
      toast.error('Please select a customer');
      return;
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/payments', {
        orderId: form.orderId || undefined,
        customerId: form.customerId,
        amount: parseFloat(form.amount),
        mode: form.mode,
        reference: form.reference?.trim() || undefined,
        date: form.date,
        notes: form.notes?.trim() || undefined,
      });
      onSave(data);
      toast.success('Payment recorded successfully!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const selectedOrder = orders.find((o) => o._id === form.orderId);

  return (
    <div
      className="pm-record-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="pm-record-modal-dialog">
        <div className="pm-detail-header">
          <div className="pm-detail-title">Record Payment</div>
          <button
            type="button"
            className="pm-detail-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="pm-record-form-body">
            <div className="pm-record-field">
              <label className="pm-record-label">Customer *</label>
              <select
                className="pm-record-select"
                value={form.customerId}
                onChange={(e) =>
                  setForm({ ...form, customerId: e.target.value, orderId: '' })
                }
                required
              >
                <option value="">Select customer...</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="pm-record-field">
              <label className="pm-record-label">Link to Order (Optional)</label>
              <select
                className="pm-record-select"
                value={form.orderId}
                onChange={(e) => {
                  const o = orders.find((ord) => ord._id === e.target.value);
                  const pending = o ? o.totalAmount - (o.paidAmount || 0) : '';
                  setForm({
                    ...form,
                    orderId: e.target.value,
                    amount: pending > 0 ? String(pending) : form.amount,
                  });
                }}
              >
                <option value="">No specific order (general payment)</option>
                {customerOrders.map((o) => (
                  <option key={o._id} value={o._id}>
                    {o.orderNumber} — ₹{(o.totalAmount - (o.paidAmount || 0)).toLocaleString('en-IN')} pending
                  </option>
                ))}
              </select>
            </div>

            {selectedOrder && (
              <div className="pm-record-order-info">
                <div style={{ fontWeight: 700, color: '#03045E' }}>
                  {selectedOrder.orderNumber} Summary
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
                  <span>Total: <strong>₹{selectedOrder.totalAmount?.toLocaleString('en-IN')}</strong></span>
                  <span>Paid: <strong>₹{(selectedOrder.paidAmount || 0).toLocaleString('en-IN')}</strong></span>
                  <span style={{ color: '#DC2626', fontWeight: 700 }}>
                    Pending: ₹{(selectedOrder.totalAmount - (selectedOrder.paidAmount || 0)).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            )}

            <div className="pm-record-grid-2">
              <div className="pm-record-field">
                <label className="pm-record-label">Amount (₹) *</label>
                <input
                  className="pm-record-input"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                />
              </div>

              <div className="pm-record-field">
                <label className="pm-record-label">Payment Mode *</label>
                <select
                  className="pm-record-select"
                  value={form.mode}
                  onChange={(e) => setForm({ ...form, mode: e.target.value })}
                >
                  <option value="upi">UPI</option>
                  <option value="cash">Cash</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="pm-record-grid-2">
              <div className="pm-record-field">
                <label className="pm-record-label">Reference No.</label>
                <input
                  className="pm-record-input"
                  placeholder="UPI ref / Cheque no."
                  value={form.reference}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                />
              </div>

              <div className="pm-record-field">
                <label className="pm-record-label">Date</label>
                <input
                  className="pm-record-input"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
            </div>

            <div className="pm-record-field">
              <label className="pm-record-label">Notes</label>
              <textarea
                className="pm-record-textarea"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional notes or remarks..."
                rows={2}
              />
            </div>
          </div>

          <div className="pm-record-footer">
            <button
              type="button"
              className="pm-record-btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="pm-record-btn-save"
              disabled={loading}
            >
              {loading ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Component: Delete Confirmation Modal ─── */
function DeleteConfirmModal({ payment, onConfirm, onCancel, deleting }) {
  if (!payment) return null;

  return (
    <div className="pm-delete-modal-overlay" onClick={onCancel}>
      <div
        className="pm-delete-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pm-delete-icon-wrap">
          <Trash2 size={24} />
        </div>
        <h3 className="pm-delete-title">Delete Payment?</h3>
        <p className="pm-delete-desc">
          Are you sure you want to delete the payment of{' '}
          <span className="pm-delete-highlight">
            ₹{payment.amount?.toLocaleString('en-IN')}
          </span>{' '}
          from{' '}
          <span className="pm-delete-highlight">
            {payment.customer?.name || 'Customer'}
          </span>
          {payment.order?.orderNumber ? ` for order ${payment.order.orderNumber}` : ''}?
          <br />
          This will update the outstanding order balance.
        </p>

        <div className="pm-delete-actions">
          <button
            type="button"
            className="pm-delete-btn-cancel"
            onClick={onCancel}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="pm-delete-btn-confirm"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Component: Payment Details Bottom Sheet / Modal ─── */
export function PaymentDetailsSheet({ payment, onClose, onDelete }) {
  if (!payment) return null;

  return (
    <div
      className="pm-detail-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="pm-detail-sheet">
        <div className="pm-detail-header">
          <div className="pm-detail-title">Payment Details</div>
          <button
            type="button"
            className="pm-detail-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="pm-detail-content">
          {/* Amount Hero */}
          <div className="pm-detail-hero">
            <span className="pm-detail-hero-label">Payment Received</span>
            <div className="pm-detail-hero-amount">
              ₹{payment.amount?.toLocaleString('en-IN')}
            </div>
            <PaymentMethodBadge mode={payment.mode} />
          </div>

          {/* Key-Value Breakdown */}
          <div className="pm-detail-rows">
            <div className="pm-detail-row">
              <span className="pm-detail-row-label">
                <User size={15} /> Customer
              </span>
              <span className="pm-detail-row-value">
                {payment.customer?.name || '—'}
              </span>
            </div>

            {payment.customer?.phone && (
              <div className="pm-detail-row">
                <span className="pm-detail-row-label">Phone</span>
                <span className="pm-detail-row-value">
                  {payment.customer.phone}
                </span>
              </div>
            )}

            <div className="pm-detail-row">
              <span className="pm-detail-row-label">
                <Hash size={15} /> Related Order
              </span>
              <span className="pm-detail-row-value" style={{ color: '#0277B6' }}>
                {payment.order?.orderNumber || 'General Payment'}
              </span>
            </div>

            <div className="pm-detail-row">
              <span className="pm-detail-row-label">
                <Calendar size={15} /> Date & Time
              </span>
              <span className="pm-detail-row-value">
                {formatPaymentDateTime(payment)}
              </span>
            </div>

            <div className="pm-detail-row">
              <span className="pm-detail-row-label">
                <CreditCard size={15} /> Payment Mode
              </span>
              <span className="pm-detail-row-value">
                <PaymentMethodBadge mode={payment.mode} />
              </span>
            </div>

            {payment.reference && (
              <div className="pm-detail-row">
                <span className="pm-detail-row-label">Reference No.</span>
                <span className="pm-detail-row-value mono">
                  {payment.reference}
                </span>
              </div>
            )}
          </div>

          {/* Notes Section (only if available) */}
          {payment.notes && (
            <div className="pm-detail-notes-box">
              <span className="pm-detail-notes-label">Notes</span>
              <div>{payment.notes}</div>
            </div>
          )}
        </div>

        <div className="pm-detail-footer">
          <button
            type="button"
            className="pm-detail-delete-btn"
            onClick={() => onDelete(payment)}
          >
            <Trash2 size={15} /> Delete
          </button>
          <button
            type="button"
            className="pm-detail-done-btn"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Component: Mobile Transaction Card (Banking Style) ─── */
export function PaymentTransactionCard({
  payment,
  onViewDetails,
  onDelete,
  activeMenuId,
  setActiveMenuId,
}) {
  const isMenuOpen = activeMenuId === payment._id;

  const handleMenuToggle = (e) => {
    e.stopPropagation();
    setActiveMenuId(isMenuOpen ? null : payment._id);
  };

  return (
    <div
      className="pm-card"
      onClick={() => onViewDetails(payment)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onViewDetails(payment);
        }
      }}
    >
      {/* 1. Header: Customer Avatar + Name + Order ID + Mode Badge */}
      <div className="pm-card-header">
        <div className="pm-card-customer-meta">
          <div className="pm-card-avatar">
            {getInitials(payment.customer?.name)}
          </div>
          <div className="pm-card-customer-text">
            <div className="pm-card-customer-name" title={payment.customer?.name}>
              {payment.customer?.name || 'Customer'}
            </div>
            {payment.order?.orderNumber ? (
              <div className="pm-card-order-id">
                {payment.order.orderNumber}
              </div>
            ) : (
              <div className="pm-card-order-id" style={{ color: '#64748B' }}>
                General Payment
              </div>
            )}
          </div>
        </div>

        <div className="pm-card-badge-wrap">
          <PaymentMethodBadge mode={payment.mode} />
        </div>
      </div>

      {/* 2. Body: Primary Amount & Payment Received + Date */}
      <div className="pm-card-body">
        <div className="pm-card-amount-group">
          <div className="pm-card-amount">
            ₹{payment.amount?.toLocaleString('en-IN')}
          </div>
          <div className="pm-card-amount-label">Payment received</div>
        </div>
        <div className="pm-card-date-time">
          {formatPaymentDateTime(payment)}
        </div>
      </div>

      {/* 3. Notes Preview (if available) */}
      {payment.notes && (
        <div className="pm-card-notes-preview">
          <FileText size={13} />
          <span>{payment.notes}</span>
        </div>
      )}

      {/* 4. Footer: View Details & More Options Menu */}
      <div className="pm-card-footer">
        <button
          type="button"
          className="pm-card-details-btn"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails(payment);
          }}
        >
          View Details <ChevronRight size={14} />
        </button>

        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="pm-card-more-btn"
            onClick={handleMenuToggle}
            aria-label="More options"
          >
            <MoreVertical size={16} />
          </button>

          {isMenuOpen && (
            <>
              <div
                className="pm-popover-backdrop"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenuId(null);
                }}
              />
              <div
                className="pm-popover-menu"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="pm-popover-item view"
                  onClick={() => {
                    setActiveMenuId(null);
                    onViewDetails(payment);
                  }}
                >
                  <ArrowDownLeft size={14} /> View Details
                </button>
                <button
                  type="button"
                  className="pm-popover-item delete"
                  onClick={() => {
                    setActiveMenuId(null);
                    onDelete(payment);
                  }}
                >
                  <Trash2 size={14} /> Delete Payment
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Component: Desktop Payments Table ─── */
export function PaymentsTable({ payments, onDelete }) {
  return (
    <div className="pm-table-wrapper">
      <table className="pm-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Customer</th>
            <th>Order #</th>
            <th className="pm-th-amount">Amount</th>
            <th>Payment Mode</th>
            <th>Reference</th>
            <th>Notes</th>
            <th className="pm-th-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p._id}>
              <td className="pm-td-date">
                {dayjs(p.date).format('D MMM YYYY')}
              </td>
              <td className="pm-td-customer">
                {p.customer?.name || '—'}
              </td>
              <td className="pm-td-order">
                {p.order?.orderNumber || '—'}
              </td>
              <td className="pm-td-amount">
                ₹{p.amount?.toLocaleString('en-IN')}
              </td>
              <td>
                <PaymentMethodBadge mode={p.mode} />
              </td>
              <td className="pm-td-ref">
                {p.reference || '—'}
              </td>
              <td className="pm-td-notes" title={p.notes || ''}>
                {p.notes || '—'}
              </td>
              <td className="pm-td-actions">
                <button
                  type="button"
                  className="pm-table-action-btn"
                  title="Delete payment"
                  onClick={() => onDelete(p)}
                >
                  <Trash2 size={15} />
                </button>
              </td>
            </tr>
          ))}
          {!payments.length && (
            <tr>
              <td colSpan={8}>
                <div className="pm-empty-state">
                  <div className="pm-empty-icon">
                    <Wallet size={28} />
                  </div>
                  <h3 className="pm-empty-title">No payments found</h3>
                  <p className="pm-empty-desc">
                    Record your first payment to start tracking.
                  </p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Main Payments Page ─── */
export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState('');

  // Modals state
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedDetailPayment, setSelectedDetailPayment] = useState(null);
  const [paymentToDelete, setPaymentToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    Promise.all([api.get('/payments'), api.get('/orders'), api.get('/customers')])
      .then(([p, o, c]) => {
        setPayments(p.data || []);
        setOrders(o.data || []);
        setCustomers(c.data || []);
      })
      .catch(() => toast.error('Failed to load payments data'))
      .finally(() => setLoading(false));
  }, []);

  // Filtered payments list
  const filtered = useMemo(() => {
    return payments.filter((p) => {
      // Payment mode filter
      if (modeFilter) {
        const pMode = (p.mode || '').toLowerCase();
        if (modeFilter === 'bank') {
          if (pMode !== 'bank' && pMode !== 'bank transfer') return false;
        } else if (pMode !== modeFilter.toLowerCase()) {
          return false;
        }
      }

      // Search by customer name, order number, or reference
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchCustomer = p.customer?.name?.toLowerCase().includes(q);
        const matchOrder = p.order?.orderNumber?.toLowerCase().includes(q);
        const matchRef = p.reference?.toLowerCase().includes(q);
        if (!matchCustomer && !matchOrder && !matchRef) return false;
      }

      return true;
    });
  }, [payments, modeFilter, search]);

  const totalCollected = useMemo(() => {
    return filtered.reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [filtered]);

  // Handle delete execution
  const handleConfirmDelete = async () => {
    if (!paymentToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/payments/${paymentToDelete._id}`);
      setPayments((prev) => prev.filter((p) => p._id !== paymentToDelete._id));
      if (selectedDetailPayment?._id === paymentToDelete._id) {
        setSelectedDetailPayment(null);
      }
      toast.success('Payment deleted');
      setPaymentToDelete(null);
    } catch {
      toast.error('Failed to delete payment');
    } finally {
      setDeleting(false);
    }
  };

  const modeFilters = [
    { label: 'All Modes', value: '' },
    { label: 'UPI', value: 'upi' },
    { label: 'Cash', value: 'cash' },
    { label: 'Bank Transfer', value: 'bank' },
    { label: 'Cheque', value: 'cheque' },
    { label: 'Other', value: 'other' },
  ];

  return (
    <div className="payments-page">
      {/* ─── Page Header ─── */}
      <div className="payments-header">
        <div className="payments-title-wrap">
          <h1 className="payments-title">Payments</h1>
          <p className="payments-subtitle">
            Total collected:
            <span className="payments-total-pill">
              ₹{totalCollected.toLocaleString('en-IN')}
            </span>
          </p>
        </div>

        <button
          type="button"
          className="payments-btn-record"
          onClick={() => setShowRecordModal(true)}
        >
          <Plus size={16} />Payment
        </button>
      </div>

      {/* ─── Search & Filter Bar ─── */}
      <div className="payments-filter-bar">
        <div className="payments-search-wrap">
          <Search size={16} className="payments-search-icon" />
          <input
            className="payments-search-input"
            placeholder="Search by customer or order ID..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="payments-search-clear"
              onClick={() => setSearchInput('')}
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Mode filter select */}
        {/* <div className="payments-filter-select-wrap">
          <select
            className="payments-filter-select"
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
          >
            {modeFilters.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div> */}

        {/* Mobile quick mode pills */}
        <div className="payments-mode-chips">
          {modeFilters.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`payments-mode-chip ${modeFilter === opt.value ? 'active' : ''}`}
              onClick={() => setModeFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Content Area ─── */}
      {loading ? (
        <div className="loading-page">
          <div className="loading-spinner" />
        </div>
      ) : (
        <>
          {/* 1. Desktop View (>= 1024px): Preserved & Refined Table */}
          <div className="payments-desktop-view">
            <PaymentsTable
              payments={filtered}
              onDelete={(p) => setPaymentToDelete(p)}
              onViewDetails={(p) => setSelectedDetailPayment(p)}
            />
          </div>

          {/* 2. Mobile View (< 1024px): Compact Banking Transaction Cards */}
          <div className="payments-mobile-view">
            {filtered.map((p) => (
              <PaymentTransactionCard
                key={p._id}
                payment={p}
                onViewDetails={(pay) => setSelectedDetailPayment(pay)}
                onDelete={(pay) => setPaymentToDelete(pay)}
                activeMenuId={activeMenuId}
                setActiveMenuId={setActiveMenuId}
              />
            ))}

            {!filtered.length && (
              <div className="pm-empty-state">
                <div className="pm-empty-icon">
                  <Wallet size={28} />
                </div>
                <h3 className="pm-empty-title">No payments found</h3>
                <p className="pm-empty-desc">
                  No transaction records match your search or filter.
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── Record Payment Modal ─── */}
      {showRecordModal && (
        <PaymentModal
          orders={orders}
          customers={customers}
          onClose={() => setShowRecordModal(false)}
          onSave={(newPayment) => {
            setPayments((prev) => [newPayment, ...prev]);
          }}
        />
      )}

      {/* ─── Payment Details Sheet / Modal ─── */}
      {selectedDetailPayment && (
        <PaymentDetailsSheet
          payment={selectedDetailPayment}
          onClose={() => setSelectedDetailPayment(null)}
          onDelete={(p) => {
            setPaymentToDelete(p);
          }}
        />
      )}

      {/* ─── Delete Confirmation Modal ─── */}
      {paymentToDelete && (
        <DeleteConfirmModal
          payment={paymentToDelete}
          deleting={deleting}
          onCancel={() => setPaymentToDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}
