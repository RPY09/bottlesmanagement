import { useEffect, useState, useRef, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { CustomerModal } from './Customers';
import ConfirmDialog from '../components/ConfirmDialog';
import '../styles/orders.css';
import {
  Search, Edit2, Trash2, ShoppingCart,
  IndianRupee, X, Clock, Calendar, TrendingUp,
  ChevronDown, ChevronUp, Filter, MoreVertical, CheckCircle2, AlertCircle,
  Plus, FileText, CreditCard, Loader2, Check,
  User, UserPlus, Package, Droplets
} from 'lucide-react';

const PAYMENT_STATUS_OPTIONS = ['unpaid', 'partial', 'paid'];

const MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const currentYearNum = dayjs().year();
const YEARS = [currentYearNum - 2, currentYearNum - 1, currentYearNum, currentYearNum + 1].map(String);

function getOrderStatusInfo(order) {
  // If explicitly cancelled
  if (order.status === 'cancelled') {
    return { label: 'Cancelled', classKey: 'cancelled' };
  }
  // If payment status is paid or amount paid covers total
  const isPaid = order.paymentStatus === 'paid' || ((order.paidAmount || 0) >= (order.totalAmount || 0));
  if (isPaid) {
    return { label: 'Paid', classKey: 'paid' };
  }
  // Check if overdue: unpaid or partial, and order was created more than 7 days ago (or custom due date)
  const isOlderThan7Days = dayjs().diff(dayjs(order.createdAt), 'day') >= 7;
  if (isOlderThan7Days) {
    return { label: 'Overdue', classKey: 'overdue' };
  }
  // If partial payment made
  if ((order.paidAmount || 0) > 0 || order.paymentStatus === 'partial') {
    return { label: 'Partially Paid', classKey: 'partial' };
  }
  // Otherwise Pending
  return { label: 'Pending', classKey: 'pending' };
}

function PaymentBadge({ status, order }) {
  if (order) {
    const info = getOrderStatusInfo(order);
    return <span className={`saas-status-badge ${info.classKey}`}>{info.label}</span>;
  }
  const payMap = { paid: 'paid', partial: 'partial', unpaid: 'pending', overdue: 'overdue', cancelled: 'cancelled' };
  return <span className={`saas-status-badge ${payMap[status] || 'pending'}`}>{status}</span>;
}

/* ─── WhatsApp Order Confirmation Modal ─── */
export function WhatsAppModal({ order, upiId, businessName, onClose }) {
  const customer = order.customer || {};
  const phone = customer.phone ? customer.phone.replace(/\D/g, '') : '';
  const cleanPhone = phone.startsWith('91') ? phone : (phone ? `91${phone}` : '');

  const linesSummary = (order.lines || []).map(l => {
    const bpc = l.bottlesPerCase || 12;
    return `*${l.productName}* (${l.size})\n   - ${l.cases} case${l.cases !== 1 ? 's' : ''} × ${bpc} bottles = ${l.cases * bpc} bottles @ ₹${l.pricePerBottle}/bottle`;
  }).join('\n\n');

  const totalCases = (order.lines || []).reduce((s, l) => s + (l.cases || 0), 0);
  const totalBottles = (order.lines || []).reduce((s, l) => s + ((l.cases || 0) * (l.bottlesPerCase || 12)), 0);
  const address = customer.address || 'your registered address';
  const effectiveUpi = upiId || 'Not set (Update in Settings)';
  const upiPayLink = upiId ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(businessName || 'Water Plant')}&am=${order.totalAmount}&cu=INR` : '';

  const messageText =
    `Hello *${customer.name || 'Customer'}*,\n\n` +
    `Your order *#${order.orderNumber}* has been placed successfully!\n\n` +
    `*Order Details:*\n${linesSummary}\n\n` +
    `*Total Quantity:* ${totalCases} cases (${totalBottles} bottles)\n` +
    `*Total Amount:* ₹${order.totalAmount?.toLocaleString('en-IN')}\n\n` +
    `*Delivery Address:*\nSoon to be delivered to your address:\n_${address}_\n\n` +
    `*To Pay via UPI:*\n` +
    `UPI ID: *${effectiveUpi}*\n` +
    (upiId ? `Pay Link: ${upiPayLink}\n\n` : '\n') +
    `_Please share the screenshot / receipt if payment is done._\n\n` +
    `Thank you for choosing *${businessName || 'Water Plant'}*!`;

  const handleSendWhatsApp = () => {
    if (!phone) {
      toast.error('Customer phone number not available');
      return;
    }
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;
    window.open(url, '_blank');
    onClose();
  };

  return (
    <div className="modal-overlay preview-modal-overlay" style={{ zIndex: 1100 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal preview-modal-dialog" style={{ maxWidth: 540 }}>
        <div className="preview-sheet-handle" />

        <div className="modal-header" style={{ padding: '1.25rem 1.4rem 0.5rem', marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--palette-ocean-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 10px rgba(37,211,102,0.3)', fontSize: '1.25rem' }}>
              <i className="bi bi-whatsapp" />
            </div>
            <div>
              <span className="modal-title" style={{ fontSize: '1.05rem', fontWeight: 800 }}>WhatsApp Message Preview</span>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>To: {customer.name} ({customer.phone || 'No phone'})</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ padding: '1rem 1.4rem' }}>
          {/* Authentic WhatsApp Chat Window Preview */}
          <div className="whatsapp-chat-preview">
            <div className="whatsapp-chat-header">
              <div className="whatsapp-chat-avatar">
                {(customer.name || 'C')[0]?.toUpperCase()}
              </div>
              <div className="whatsapp-chat-info">
                <div className="whatsapp-chat-name">{customer.name || 'Customer'}</div>
                <div className="whatsapp-chat-status">
                  {customer.phone || 'Ready to send'}
                </div>
              </div>
            </div>
            <div className="whatsapp-chat-body">
              <div className="whatsapp-chat-bubble">
                {messageText}
                <div className="whatsapp-bubble-time">
                  <span>{dayjs().format('h:mm A')}</span>
                  <span className="whatsapp-double-tick">✓✓</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="preview-modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>Close</button>
          <button
            type="button"
            className="btn btn-whatsapp"
            onClick={handleSendWhatsApp}
            disabled={!phone}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
          >
            <i className="bi bi-whatsapp" aria-hidden="true" /> Send on WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Refined Payment Recording Modal (Fintech UI) ─── */
function QuickPaymentModal({ order, onClose, onPaid }) {
  const customerName = order.customer?.name || 'Walk-in Customer';
  const totalBilled = order.totalAmount || 0;
  const alreadyPaid = order.paidAmount || 0;
  const due = Math.max(0, totalBilled - alreadyPaid);

  const [rawAmount, setRawAmount] = useState(String(due));
  const [mode, setMode] = useState('Cash');
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const dialogRef = useRef(null);
  const inputRef = useRef(null);

  const parsedAmount = parseFloat(rawAmount) || 0;
  const remainingDue = Math.max(0, due - parsedAmount);

  // Validation
  let errorMsg = '';
  if (!rawAmount || parsedAmount <= 0) {
    errorMsg = 'Please enter an amount greater than ₹0';
  } else if (parsedAmount > due) {
    errorMsg = `Amount cannot exceed current due (₹${due.toLocaleString('en-IN')})`;
  }

  const triggerClose = useCallback(() => {
    if (loading) return;
    setClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  }, [loading, onClose]);

  // Auto-focus input on open
  useEffect(() => {
    const t = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 150);
    return () => clearTimeout(t);
  }, []);

  // Keyboard accessibility: Escape to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        triggerClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerClose]);

  const handleConfirm = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (errorMsg) return toast.error(errorMsg);

    setLoading(true);
    try {
      let updatedOrder = null;
      if (parsedAmount >= due) {
        // Full settlement
        const { data } = await api.patch(`/orders/${order._id}/pay`, {
          mode,
          reference: mode === 'Cash' && !reference.trim() ? undefined : reference.trim()
        });
        updatedOrder = data;
        onPaid(data);
      } else {
        // Partial payment record
        await api.post('/payments', {
          orderId: order._id,
          customerId: order.customer?._id || order.customer,
          amount: parsedAmount,
          mode,
          reference: mode === 'Cash' && !reference.trim() ? undefined : reference.trim(),
          date: new Date(),
          notes: `Partial payment for #${order.orderNumber}`,
        });
        const { data } = await api.get(`/orders/${order._id}`);
        updatedOrder = data.order;
        onPaid(data.order);
      }

      // Success screen
      setSuccessData({
        amountPaid: parsedAmount,
        mode,
        reference: reference.trim(),
        remainingDue: Math.max(0, due - parsedAmount),
        isFullPay: parsedAmount >= due,
        updatedOrder,
      });
      toast.success(`Payment of ₹${parsedAmount.toLocaleString('en-IN')} recorded!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment recording failed');
    } finally {
      setLoading(false);
    }
  };

  const getReferencePlaceholder = () => {
    if (mode === 'UPI') return 'e.g. 12-digit UPI Ref ID / UTR';
    if (mode === 'Bank Transfer') return 'e.g. Bank IMPS/NEFT UTR #';
    if (mode === 'Cheque') return 'e.g. Cheque # & Bank Name';
    return 'Optional receipt or note #';
  };

  return (
    <div
      className={`payment-modal-overlay ${closing ? 'closing' : ''}`}
      onClick={(e) => e.target === e.currentTarget && triggerClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
    >
      <div
        ref={dialogRef}
        className={`payment-modal-dialog ${closing ? 'closing' : ''}`}
      >
        <div className="payment-sheet-handle" />

        {/* ─── SUCCESS CONFIRMATION STATE ─── */}
        {successData ? (
          <div className="pm-success-pane">
            <div className="pm-success-icon-wrap">
              <CheckCircle2 size={34} />
            </div>

            <div className="pm-success-title">Payment Recorded!</div>
            <div className="pm-success-amount">
              ₹{successData.amountPaid.toLocaleString('en-IN')}
            </div>

            <div className="pm-success-receipt-card">
              <div className="pm-success-row">
                <span>Customer</span>
                <span>{customerName}</span>
              </div>
              <div className="pm-success-row">
                <span>Order ID</span>
                <span style={{ color: 'var(--palette-ocean-blue)' }}>#{order.orderNumber}</span>
              </div>
              <div className="pm-success-row">
                <span>Payment Method</span>
                <span>{successData.mode}</span>
              </div>
              {successData.reference && (
                <div className="pm-success-row">
                  <span>Reference ID</span>
                  <span>{successData.reference}</span>
                </div>
              )}
              <div className="pm-success-row" style={{ paddingTop: '0.4rem', borderTop: '1px dashed var(--border)' }}>
                <span>Remaining Balance</span>
                <span style={{ color: successData.remainingDue === 0 ? 'var(--status-success-text)' : 'var(--palette-ocean-blue)', fontWeight: 800 }}>
                  {successData.remainingDue === 0 ? 'Fully Settled (₹0)' : `₹${successData.remainingDue.toLocaleString('en-IN')}`}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn-pm-done"
              onClick={triggerClose}
              autoFocus
            >
              Done
            </button>
          </div>
        ) : (
          /* ─── PAYMENT RECORDING FORM ─── */
          <>
            {/* 3. Header */}
            <div className="payment-modal-header">
              <div className="pm-header-left">
                <div className="pm-header-icon">
                  <IndianRupee size={22} />
                </div>
                <div className="pm-title-wrap">
                  <div id="payment-modal-title" className="pm-title">Record Payment</div>
                  <div className="pm-subtitle">
                    <strong>{customerName}</strong>
                    <span>·</span>
                    <span className="pm-subtitle-id">#{order.orderNumber}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="pm-close-btn"
                onClick={triggerClose}
                aria-label="Close dialog"
                disabled={loading}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirm} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="payment-modal-body">
                {/* 4. Payment Summary Panel */}
                <div className="pm-summary-panel">
                  <div className="pm-summary-item">
                    <span className="pm-summary-label">Total Billed</span>
                    <span className="pm-summary-val">₹{totalBilled.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="pm-summary-item">
                    <span className="pm-summary-label">Already Paid</span>
                    <span className="pm-summary-val green">₹{alreadyPaid.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="pm-summary-item">
                    <span className="pm-summary-label">Pending Due</span>
                    <div>
                      <span className="pm-summary-val due">₹{due.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* 5. Payment Amount Field */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <label htmlFor="payment-amount-input" className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                    Payment Amount *
                  </label>

                  <div className={`pm-amount-box ${errorMsg ? 'error' : ''}`}>
                    <span className="pm-currency-symbol">₹</span>
                    <input
                      id="payment-amount-input"
                      ref={inputRef}
                      type="number"
                      step="any"
                      min="1"
                      max={due}
                      className="pm-amount-input"
                      placeholder="0.00"
                      value={rawAmount}
                      onChange={(e) => setRawAmount(e.target.value)}
                      required
                    />
                  </div>

                  {/* Quick-Pay Presets */}
                  {/* <div className="pm-preset-row">
                    <button
                      type="button"
                      className={`pm-preset-chip ${parsedAmount === due ? 'active' : ''}`}
                      onClick={() => setRawAmount(String(due))}
                    >
                      Pay Full Due (₹{due.toLocaleString('en-IN')})
                    </button>
                    {due >= 1000 && (
                      <button
                        type="button"
                        className={`pm-preset-chip ${parsedAmount === Math.round(due / 2) ? 'active' : ''}`}
                        onClick={() => setRawAmount(String(Math.round(due / 2)))}
                      >
                        50% (₹{Math.round(due / 2).toLocaleString('en-IN')})
                      </button>
                    )}
                  </div> */}

                  {/* Inline Error Message */}
                  {errorMsg && (
                    <div className="pm-error-text">
                      <AlertCircle size={13} />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Live Remaining Balance Calculation */}
                  <div className="pm-live-balance-box">
                    {/* <div className="pm-live-balance-item">
                      <span>Previous Due:</span>
                      <strong>₹{due.toLocaleString('en-IN')}</strong>
                    </div> */}
                    <div className="pm-live-balance-item">
                      <span>Paying:</span>
                      <strong style={{ color: 'var(--palette-ocean-blue)' }}>₹{parsedAmount.toLocaleString('en-IN')}</strong>
                    </div>
                    <div className={`pm-live-balance-item remaining ${remainingDue === 0 ? 'settled' : ''}`}>
                      <span>Remaining:</span>
                      <strong>₹{remainingDue.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                </div>

                {/* 6. Payment Methods Selector */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                    Payment Method *
                  </label>
                  <div className="pm-modes-grid">
                    {[
                      { id: 'Cash', label: 'Cash', icon: 'bi-cash-stack' },
                      { id: 'UPI', label: 'UPI', icon: 'bi-qr-code' },
                      { id: 'Bank Transfer', label: 'Bank', icon: 'bi-bank' },
                      { id: 'Cheque', label: 'Cheque', icon: 'bi-card-heading' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className={`pm-mode-tab ${mode === m.id ? 'active' : ''}`}
                        onClick={() => setMode(m.id)}
                      >
                        <i className={`bi ${m.icon} pm-mode-icon`} />
                        <span>{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 7. Contextual Transaction Reference */}
                <div className="pm-reference-group">
                  <label htmlFor="payment-ref-input" className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>
                    {mode === 'Cash' ? (
                      <>Receipt # / Note <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span></>
                    ) : (
                      <>{mode} Transaction Reference <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span></>
                    )}
                  </label>
                  <input
                    id="payment-ref-input"
                    type="text"
                    className="form-input"
                    placeholder={getReferencePlaceholder()}
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </div>
              </div>

              {/* 8. Primary Actions Footer */}
              <div className="payment-modal-footer">
                <button
                  type="button"
                  className="btn-pm-cancel"
                  onClick={triggerClose}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-pm-submit"
                  disabled={loading || Boolean(errorMsg)}
                >
                  {loading ? (
                    <>
                      <div className="orders-scroll-spinner" style={{ width: 18, height: 18, borderWidth: 2, borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <>
                      <span>Record Payment · ₹{parsedAmount.toLocaleString('en-IN')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Searchable Customer Selection Bottom Sheet ─── */
function CustomerSelectSheet({ customers, selectedCustomerId, onSelect, onClose, onAddNew }) {
  const [search, setSearch] = useState('');
  const [customerItems, setCustomerItems] = useState(customers);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(false);
  const loaderRef = useRef(null);

  const fetchCustomers = useCallback(async (requestedPage, append, query) => {
    setLoading(true);
    try {
      const { data } = await api.get('/customers', {
        params: { page: requestedPage, limit: 25, search: query || undefined },
      });
      const items = data.items || data;
      setCustomerItems(prev => append ? [...prev, ...items] : items);
      setPage(requestedPage);
      setHasNextPage(Boolean(data.pagination?.hasNextPage));
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers(1, false, search.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchCustomers, search]);

  useEffect(() => {
    const loader = loaderRef.current;
    if (!loader || !hasNextPage) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !loading) {
        fetchCustomers(page + 1, true, search.trim());
      }
    }, { rootMargin: '120px' });
    observer.observe(loader);
    return () => observer.disconnect();
  }, [fetchCustomers, hasNextPage, loading, page, search]);

  return (
    <div className="om-nested-sheet-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="om-nested-sheet-dialog">
        <div className="order-sheet-handle" />

        {/* Header */}
        <div className="om-nested-header">
          <div>
            <div className="om-nested-title">Select Customer</div>
            <div className="om-nested-sub">Search directory or create new</div>
          </div>
          <button type="button" className="om-close-btn" onClick={onClose} aria-label="Close customer picker">
            <X size={18} />
          </button>
        </div>

        {/* Sticky Search Input */}
        <div className="om-nested-search-wrap">
          <Search size={16} className="om-nested-search-icon" />
          <input
            type="text"
            className="om-nested-search-input"
            placeholder="Search by name, phone or address..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          {search && (
            <button
              type="button"
              className="om-nested-clear-btn"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Scrollable Customer List */}
        <div className="om-nested-list">
          {customerItems.length > 0 ? (
            customerItems.map(c => {
              const isSelected = String(c._id) === String(selectedCustomerId);
              const initials = c.name
                ? c.name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
                : 'C';
              return (
                <div
                  key={c._id}
                  className={`om-customer-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => { onSelect(c); onClose(); }}
                >
                  <div className="om-customer-item-avatar">{initials}</div>
                  <div className="om-customer-item-info">
                    <div className="om-customer-item-name">{c.name}</div>
                    <div className="om-customer-item-meta">
                      {c.phone && <span>{c.phone}</span>}
                      {c.address && <span>· {c.address}</span>}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="om-customer-item-check">
                      <Check size={16} />
                    </div>
                  )}
                </div>
              );
            })
          ) : !loading ? (
            <div className="om-nested-empty">
              <User size={34} style={{ color: 'var(--text-muted)' }} />
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.4rem' }}>No customers found</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                No customer matching "{search}"
              </div>
              <button
                type="button"
                className="om-btn-add-new-cust"
                onClick={() => { onClose(); onAddNew(); }}
              >
                <UserPlus size={15} /> Add New Customer
              </button>
            </div>
          ) : null}
          {loading && <div className="om-nested-loading">Loading customers...</div>}
          <div ref={loaderRef} style={{ height: 1 }} />
        </div>

        {/* Bottom Bar with Add New Customer */}
        {customerItems.length > 0 && (
          <div className="om-nested-footer">
            <button
              type="button"
              className="om-btn-add-new-cust"
              onClick={() => { onClose(); onAddNew(); }}
            >
              <UserPlus size={15} /> Add New Customer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Searchable Product Selection Bottom Sheet ─── */
function ProductSelectSheet({ products, currentLines, onAdd, onClose }) {
  const [search, setSearch] = useState('');
  const existingProductIds = new Set(currentLines.map(l => String(l.product)));

  const filtered = products.filter(p => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const nameMatch = p.name?.toLowerCase().includes(q);
    const sizeMatch = p.size?.toLowerCase().includes(q);
    return nameMatch || sizeMatch;
  });

  return (
    <div className="om-nested-sheet-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="om-nested-sheet-dialog">
        <div className="order-sheet-handle" />

        {/* Header */}
        <div className="om-nested-header">
          <div>
            <div className="om-nested-title">Add Product</div>
            <div className="om-nested-sub">Select from catalogue to add to order</div>
          </div>
          <button type="button" className="om-close-btn" onClick={onClose} aria-label="Close product selector">
            <X size={18} />
          </button>
        </div>

        {/* Sticky Search Input */}
        <div className="om-nested-search-wrap">
          <Search size={16} className="om-nested-search-icon" />
          <input
            type="text"
            className="om-nested-search-input"
            placeholder="Search by product name or size..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          {search && (
            <button
              type="button"
              className="om-nested-clear-btn"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Scrollable Product Catalogue List */}
        <div className="om-nested-list">
          {filtered.length > 0 ? (
            filtered.map(p => {
              const isAdded = existingProductIds.has(String(p._id));
              const bpc = p.bottlesPerCase || 12;
              return (
                <div key={p._id} className="om-product-picker-item">
                  <div className="om-product-picker-icon">
                    <Droplets size={18} />
                  </div>
                  <div className="om-product-picker-info">
                    <div className="om-product-picker-name">
                      {p.name} <span className="om-product-picker-size">({p.size})</span>
                    </div>
                    <div className="om-product-picker-meta">
                      {bpc} bottles/case · ₹{p.pricePerUnit} / bottle
                    </div>
                  </div>
                  {isAdded ? (
                    <span className="om-product-added-badge">
                      <Check size={13} /> In Order
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="om-btn-add-product-item"
                      onClick={() => onAdd(p)}
                    >
                      <Plus size={14} /> Add
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <div className="om-nested-empty">
              <Package size={34} style={{ color: 'var(--text-muted)' }} />
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.4rem' }}>No products found</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                No catalogue item matching "{search}"
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Compact Premium Create / Edit Order Modal with Dynamic Products ─── */
export function OrderModal({ order, customers, products, onClose, onSave }) {
  const [customersList, setCustomersList] = useState(customers);
  useEffect(() => { setCustomersList(customers); }, [customers]);

  const buildDefaultLines = useCallback(() => {
    // If order has existing lines, load them
    if (order?.lines?.length) {
      return order.lines.map(l => ({
        product: l.product?._id || l.product,
        productName: l.productName || l.product?.name || 'Water',
        size: l.size || l.product?.size || '',
        bottlesPerCase: l.bottlesPerCase || 12,
        pricePerBottle: l.pricePerBottle ?? 0,
        cases: l.cases ?? 0,
      }));
    }
    // For new order, seed with catalogue products so user can enter directly
    return products.map(p => ({
      product: p._id,
      productName: p.name,
      size: p.size,
      bottlesPerCase: p.bottlesPerCase || 12,
      pricePerBottle: p.pricePerUnit,
      cases: 0,
    }));
  }, [order, products]);

  const initialCustomerId = order?.customer?._id
    ? String(order.customer._id)
    : (order?.customer ? String(order.customer) : '');

  const [form, setForm] = useState({
    customer: initialCustomerId,
    notes: order?.notes || '',
    markPaid: order?.paymentStatus === 'paid',
    paymentMode: order?.paymentMode || 'Cash',
  });
  const [lines, setLines] = useState(() => buildDefaultLines());
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showNotes, setShowNotes] = useState(() => Boolean(order?.notes));

  // Nested sheet states
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);

  // Customer context state
  const [customerContext, setCustomerContext] = useState(null);
  const [loadingContext, setLoadingContext] = useState(false);

  const isEdit = Boolean(order?._id);

  // Sync lines and form when order changes
  useEffect(() => {
    if (order) {
      const custId = order.customer?._id
        ? String(order.customer._id)
        : (order.customer ? String(order.customer) : '');
      setForm({
        customer: custId,
        notes: order.notes || '',
        markPaid: order.paymentStatus === 'paid',
        paymentMode: order.paymentMode || 'Cash',
      });
      setLines(buildDefaultLines());
      setShowNotes(Boolean(order.notes));
    } else {
      setForm({
        customer: '',
        notes: '',
        markPaid: false,
        paymentMode: 'Cash',
      });
      setLines(buildDefaultLines());
      setShowNotes(false);
    }
  }, [order, buildDefaultLines]);

  // Fetch Customer Business Context (Outstanding balance & previous orders)
  useEffect(() => {
    if (!form.customer) {
      setCustomerContext(null);
      return;
    }
    let cancelled = false;
    setLoadingContext(true);
    api.get(`/customers/${form.customer}`)
      .then(res => {
        if (!cancelled && res.data) {
          setCustomerContext(res.data.summary || null);
        }
      })
      .catch(() => {
        if (!cancelled) setCustomerContext(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingContext(false);
      });
    return () => { cancelled = true; };
  }, [form.customer]);

  // Selected Customer Details
  const selectedCustomer = customersList.find(c => String(c._id) === String(form.customer))
    || (order?.customer?.name ? order.customer : null);

  // Smooth exit transition
  const triggerClose = useCallback(() => {
    if (loading) return;
    setClosing(true);
    setTimeout(() => {
      onClose();
    }, 180);
  }, [loading, onClose]);

  // Keyboard accessibility: Escape to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !showCustomerPicker && !showProductPicker && !showNewCustomerModal) {
        e.preventDefault();
        triggerClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerClose, showCustomerPicker, showProductPicker, showNewCustomerModal]);

  const updateLine = (idx, field, value) => {
    const updated = [...lines];
    if (field === 'cases') {
      const val = value === '' ? 0 : Math.max(0, parseInt(value, 10) || 0);
      updated[idx] = { ...updated[idx], cases: val };
    }
    if (field === 'price') {
      const val = value === '' ? 0 : Math.max(0, parseFloat(value) || 0);
      updated[idx] = { ...updated[idx], pricePerBottle: val };
    }
    setLines(updated);
  };

  const removeLine = (idx) => {
    setLines(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddProduct = (prod) => {
    if (lines.some(l => String(l.product) === String(prod._id))) {
      toast('Product is already in this order');
      return;
    }
    setLines(prev => [
      ...prev,
      {
        product: prod._id,
        productName: prod.name,
        size: prod.size,
        bottlesPerCase: prod.bottlesPerCase || 12,
        pricePerBottle: prod.pricePerUnit,
        cases: 1,
      }
    ]);
    toast.success(`Added ${prod.name}`);
    setShowProductPicker(false);
  };

  // Calculations
  const totalProducts = lines.length;
  const totalCases = lines.reduce((sum, l) => sum + (l.cases || 0), 0);
  const totalBottles = lines.reduce((sum, l) => sum + ((l.cases || 0) * (l.bottlesPerCase || 12)), 0);
  const activeLines = lines.filter(l => (l.cases || 0) > 0);
  const totalAmount = activeLines.reduce(
    (sum, l) => sum + (l.cases * (l.bottlesPerCase || 12) * l.pricePerBottle), 0
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!form.customer) return toast.error('Please select a customer');
    if (!activeLines.length) return toast.error('Please enter at least 1 case for any product');

    setLoading(true);
    try {
      const payload = {
        customer: form.customer,
        notes: form.notes.trim(),
        paymentStatus: form.markPaid ? 'paid' : (order?.paymentStatus || 'unpaid'),
        paidAmount: form.markPaid ? totalAmount : (order?.paidAmount || 0),
        paymentMode: form.paymentMode,
        lines: activeLines.map(l => ({
          product: l.product,
          cases: l.cases,
          bottlesPerCase: l.bottlesPerCase || 12,
          pricePerBottle: l.pricePerBottle,
        })),
      };

      if (isEdit) {
        const { data } = await api.put(`/orders/${order._id}`, payload);
        onSave(data, 'edit');
        toast.success(`Order #${order.orderNumber} updated!`);
      } else {
        const { data } = await api.post('/orders', payload);
        onSave(data, 'add');
        toast.success('Order created successfully!');
      }
      triggerClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save order');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerCreated = (newCust) => {
    setCustomersList(prev => [newCust, ...prev]);
    setForm(prev => ({ ...prev, customer: newCust._id }));
    setShowNewCustomerModal(false);
    toast.success(`Selected new customer: ${newCust.name}`);
  };

  return (
    <>
      <div
        className={`order-modal-overlay ${closing ? 'closing' : ''}`}
        onClick={e => e.target === e.currentTarget && triggerClose()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-modal-heading"
      >
        <div className={`order-modal-dialog ${closing ? 'closing' : ''}`}>
          {/* Mobile drag handle */}
          <div className="order-sheet-handle" />

          {/* ══════════════════════════════════════════════════════
              1. FIXED HEADER: Title + Customer Selector + Context
             ══════════════════════════════════════════════════════ */}
          <div className="order-modal-header">
            <div className="om-header-left">
              <div className="om-header-icon">
                {isEdit ? <Edit2 size={18} /> : <ShoppingCart size={18} />}
              </div>
              <div>
                <div id="order-modal-heading" className="om-title">
                  {isEdit ? `Edit Order #${order.orderNumber}` : 'Create New Order'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  {isEdit ? 'Update items, quantities & rates' : 'Select customer and add products'}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="om-close-btn"
              onClick={triggerClose}
              aria-label="Close dialog"
              disabled={loading}
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            {/* Pinned Subheader: Customer Selector & Business Context */}
            <div style={{ padding: '0.65rem 1.25rem 0.5rem', background: '#FFFFFF', borderBottom: '1px solid #F1F5F9', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div
                className="om-customer-card-trigger"
                onClick={() => setShowCustomerPicker(true)}
                role="button"
                tabIndex={0}
                aria-label="Select customer"
              >
                <div className="om-cust-trigger-left">
                  <div className={`om-cust-trigger-avatar ${!selectedCustomer ? 'empty' : ''}`}>
                    {selectedCustomer
                      ? (selectedCustomer.name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'C')
                      : <User size={18} />}
                  </div>
                  <div className="om-cust-trigger-info">
                    {selectedCustomer ? (
                      <>
                        <div className="om-cust-trigger-name">{selectedCustomer.name}</div>
                        <div className="om-cust-trigger-phone">
                          <span>{selectedCustomer.phone || 'No phone'}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="om-cust-trigger-name" style={{ color: 'var(--palette-ocean-blue)' }}>Select a Customer *</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Tap to search directory</div>
                      </>
                    )}
                  </div>
                </div>

                <div className="om-cust-trigger-btn">
                  {selectedCustomer ? 'Change' : 'Choose'}
                </div>
              </div>

              {/* Customer Business Context Panel */}
              {selectedCustomer && (
                <div className="om-customer-context-card">
                  <div className="om-context-item">
                    <span className="om-context-label">Previous Due</span>
                    <span className={`om-context-val ${customerContext?.pending > 0 ? 'due' : 'settled'}`}>
                      {loadingContext
                        ? 'Loading...'
                        : customerContext?.pending > 0
                          ? `₹${customerContext.pending.toLocaleString('en-IN')}`
                          : '✓ No outstanding balance'}
                    </span>
                  </div>
                  <div className="om-context-item">
                    <span className="om-context-label">Past Orders</span>
                    <span className="om-context-val">
                      {loadingContext ? '...' : `${customerContext?.totalOrders ?? 0} placed`}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* ══════════════════════════════════════════════════════
                2. MIDDLE: INDEPENDENTLY SCROLLABLE PRODUCT LIST
               ══════════════════════════════════════════════════════ */}
            <div className="order-modal-body">
              {/* Products Section Header Bar */}
              <div className="om-products-bar">
                <span className="om-products-count-label">
                  Products ({lines.length})
                </span>
                <button
                  type="button"
                  className="om-btn-add-product"
                  onClick={() => setShowProductPicker(true)}
                >
                  <Plus size={14} /> Add Product
                </button>
              </div>

              {/* Dynamic Product Cards List */}
              <div className="om-products-section">
                {lines.length > 0 ? (
                  lines.map((line, i) => {
                    const bpc = line.bottlesPerCase || 12;
                    const totalBottles = (line.cases || 0) * bpc;
                    const subtotal = totalBottles * (line.pricePerBottle || 0);
                    const isSelected = (line.cases || 0) > 0;

                    return (
                      <div key={line.product} className={`om-product-card ${isSelected ? 'active' : ''}`}>
                        {/* Product Header */}
                        <div className="om-product-header">
                          <div className="om-product-title-wrap">
                            <span className="om-product-name">{line.productName}</span>
                            <span className="om-product-meta">· {line.size} · {bpc} bottles/case</span>
                          </div>

                          <div className="om-product-actions-right">
                            <div className={`om-product-subtotal ${isSelected ? 'active' : ''}`}>
                              Subtotal: ₹{subtotal.toLocaleString('en-IN')}
                            </div>
                            <button
                              type="button"
                              className="om-remove-btn"
                              title="Remove product"
                              onClick={() => removeLine(i)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* 3-Column Input Grid: Cases, Price, Total Bottles */}
                        <div className="om-product-inputs-grid">
                          <div className="om-input-col">
                            <label htmlFor={`cases-input-${i}`} className="om-col-label">Cases</label>
                            <input
                              id={`cases-input-${i}`}
                              type="number"
                              min="0"
                              className="om-cases-input"
                              value={line.cases === 0 ? '' : line.cases}
                              placeholder="0"
                              onChange={e => updateLine(i, 'cases', e.target.value)}
                            />
                          </div>

                          <div className="om-input-col">
                            <label htmlFor={`price-input-${i}`} className="om-col-label">Price / Bottle</label>
                            <div className="om-price-wrap">
                              <span className="om-currency-tag">₹</span>
                              <input
                                id={`price-input-${i}`}
                                type="number"
                                min="0"
                                step="0.5"
                                className="om-price-input"
                                value={line.pricePerBottle}
                                onChange={e => updateLine(i, 'price', e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="om-input-col">
                            <span className="om-col-label">Total Bottles</span>
                            <div className="om-bottles-box">
                              {totalBottles}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="om-products-empty">
                    <Package size={30} style={{ color: 'var(--text-muted)' }} />
                    <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      No products added yet
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Click below to choose items from the catalogue
                    </div>
                    <button
                      type="button"
                      className="om-btn-add-product"
                      style={{ marginTop: '0.25rem' }}
                      onClick={() => setShowProductPicker(true)}
                    >
                      <Plus size={14} /> Browse Catalogue
                    </button>
                  </div>
                )}
              </div>

              {/* Collapsible Optional Notes */}
              {!showNotes && !form.notes ? (
                <button
                  type="button"
                  className="om-notes-toggle"
                  onClick={() => setShowNotes(true)}
                >
                  <FileText size={13} />
                  <span>+ Add order notes</span>
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label htmlFor="order-notes-input" className="om-label" style={{ fontSize: '0.74rem' }}>
                      Order Notes
                    </label>
                    {!form.notes && (
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.72rem', cursor: 'pointer', padding: 0 }}
                        onClick={() => setShowNotes(false)}
                      >
                        Hide
                      </button>
                    )}
                  </div>
                  <textarea
                    id="order-notes-input"
                    className="om-notes-textarea"
                    placeholder="Add delivery instructions, preferences or order notes..."
                    value={form.notes}
                    onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              )}
            </div>

            {/* ══════════════════════════════════════════════════════
                3. BOTTOM: FIXED FINANCIAL SUMMARY & SUBMIT ACTIONS
               ══════════════════════════════════════════════════════ */}
            <div style={{ borderTop: '1px solid var(--border)', background: '#FFFFFF', padding: '0.65rem 1.25rem', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {/* 4-Metric Financial Summary */}
              <div className="om-summary-panel">
                <div className="om-summary-metric">
                  <span className="om-metric-label">Products</span>
                  <span className="om-metric-val">{totalProducts}</span>
                </div>
                <div className="om-summary-metric">
                  <span className="om-metric-label">Cases</span>
                  <span className="om-metric-val">{totalCases}</span>
                </div>
                <div className="om-summary-metric">
                  <span className="om-metric-label">Bottles</span>
                  <span className="om-metric-val">{totalBottles}</span>
                </div>
                <div className="om-summary-metric">
                  <span className="om-metric-label">Order Total</span>
                  <span className="om-metric-val total">₹{totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Mark as Paid Toggle */}
              <div className="om-payment-card">
                <div
                  className="om-payment-header"
                  onClick={() => setForm(prev => ({ ...prev, markPaid: !prev.markPaid }))}
                >
                  <div className="om-payment-title">
                    <CreditCard size={15} style={{ color: 'var(--palette-ocean-blue)' }} />
                    <span>Collect payment now</span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.markPaid}
                    aria-label="Collect payment now"
                    className={`om-toggle-switch ${form.markPaid ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setForm(prev => ({ ...prev, markPaid: !prev.markPaid }));
                    }}
                  >
                    <span className="om-toggle-knob" />
                  </button>
                </div>

                {form.markPaid && (
                  <div className="om-payment-mode-row">
                    {['Cash', 'UPI', 'Bank'].map(mode => (
                      <button
                        key={mode}
                        type="button"
                        className={`om-mode-chip ${form.paymentMode === mode ? 'active' : ''}`}
                        onClick={() => setForm(prev => ({ ...prev, paymentMode: mode }))}
                      >
                        {mode}
                      </button>
                    ))}
                    <span className="om-payment-subtext">
                      Full payment (₹{totalAmount.toLocaleString('en-IN')})
                    </span>
                  </div>
                )}
              </div>

              {/* Primary Sticky Action Button */}
              <button
                type="submit"
                className="om-submit-btn"
                disabled={loading || !form.customer || !activeLines.length}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Saving...
                  </>
                ) : isEdit ? (
                  <>
                    <Check size={18} /> Update Order · ₹{totalAmount.toLocaleString('en-IN')}
                  </>
                ) : (
                  <>
                    <Plus size={18} /> Create Order · ₹{totalAmount.toLocaleString('en-IN')}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ─── Searchable Customer Selection Bottom Sheet ─── */}
      {showCustomerPicker && (
        <CustomerSelectSheet
          customers={customersList}
          selectedCustomerId={form.customer}
          onSelect={(c) => setForm(prev => ({ ...prev, customer: c._id }))}
          onClose={() => setShowCustomerPicker(false)}
          onAddNew={() => setShowNewCustomerModal(true)}
        />
      )}

      {/* ─── Searchable Product Selection Bottom Sheet ─── */}
      {showProductPicker && (
        <ProductSelectSheet
          products={products}
          currentLines={lines}
          onAdd={handleAddProduct}
          onClose={() => setShowProductPicker(false)}
        />
      )}

      {/* ─── Create Customer Modal (Opens directly if requested from picker) ─── */}
      {showNewCustomerModal && (
        <CustomerModal
          customer={null}
          onClose={() => setShowNewCustomerModal(false)}
          onSave={handleCustomerCreated}
        />
      )}
    </>
  );
}

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteOrderId, setDeleteOrderId] = useState(null);
  const [modal, setModal] = useState(null); // 'new' or order object for edit
  const [payModal, setPayModal] = useState(null); // order object for quick payment
  const [whatsappOrder, setWhatsappOrder] = useState(null); // order object for WhatsApp confirmation
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({
    paymentStatus: '',
    dateMode: 'all', // 'all' | 'monthYear' | 'range'
    month: String(dayjs().month() + 1),
    year: String(dayjs().year()),
    startDate: '',
    endDate: '',
    search: '',
  });
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Progressive infinite scroll loading to maintain smooth 60fps scrolling
  const PAGE_SIZE = 12;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [serverPage, setServerPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const loaderRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Debounce search input by 300ms for smooth typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => (prev.search === searchInput ? prev : { ...prev, search: searchInput }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchOrders = useCallback(async (requestedPage = 1, append = false) => {
    const params = { page: requestedPage, limit: 24 };
    if (filters.paymentStatus) params.paymentStatus = filters.paymentStatus;
    if (filters.search) params.search = filters.search;
    if (filters.dateMode === 'monthYear') {
      params.startDate = dayjs(`${filters.year}-${filters.month}-01`).startOf('month').toISOString();
      params.endDate = dayjs(`${filters.year}-${filters.month}-01`).endOf('month').toISOString();
    } else if (filters.dateMode === 'range') {
      if (filters.startDate) params.startDate = dayjs(filters.startDate).startOf('day').toISOString();
      if (filters.endDate) params.endDate = dayjs(filters.endDate).endOf('day').toISOString();
    }

    try {
      const { data } = await api.get('/orders', { params });
      const items = data.items || data;
      setOrders(prev => append ? [...prev, ...items] : items);
      setServerPage(requestedPage);
      setHasNextPage(Boolean(data.pagination?.hasNextPage));
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  }, [filters.paymentStatus, filters.search, filters.dateMode, filters.month, filters.year, filters.startDate, filters.endDate]);

  useEffect(() => {
    setLoading(true);
    setVisibleCount(PAGE_SIZE);
    fetchOrders(1);
  }, [fetchOrders]);

  useEffect(() => {
    Promise.all([
      api.get('/customers', { params: { page: 1, limit: 25 } }),
      api.get('/products'),
    ])
      .then(([c, p]) => {
        setCustomers(c.data.items || c.data);
        setProducts(p.data.items || p.data);
      })
      .catch(() => toast.error('Failed to load order form data'));

    const handleGlobalOrder = (e) => {
      if (e.detail) {
        setOrders(prev => [e.detail, ...prev.filter(o => o._id !== e.detail._id)]);
      }
    };
    window.addEventListener('app:order-saved', handleGlobalOrder);
    return () => window.removeEventListener('app:order-saved', handleGlobalOrder);
  }, []);

  const filtered = orders.filter(o => {
    // 1. Payment status filter
    if (filters.paymentStatus && o.paymentStatus !== filters.paymentStatus) return false;

    // 2. Debounced search filter (customer name or order #)
    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      const customerName = o.customer?.name?.toLowerCase() || '';
      const orderNum = o.orderNumber?.toLowerCase() || '';
      if (!customerName.includes(q) && !orderNum.includes(q)) return false;
    }

    // 3. Date filtering (Month/Year or Date Range)
    if (filters.dateMode === 'monthYear') {
      const d = dayjs(o.createdAt);
      if (filters.year && d.year() !== parseInt(filters.year, 10)) return false;
      if (filters.month && (d.month() + 1) !== parseInt(filters.month, 10)) return false;
    } else if (filters.dateMode === 'range') {
      const d = dayjs(o.createdAt);
      if (filters.startDate && d.isBefore(dayjs(filters.startDate).startOf('day'))) return false;
      if (filters.endDate && d.isAfter(dayjs(filters.endDate).endOf('day'))) return false;
    }

    return true;
  });

  // Reset pagination count on search or filter change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filters.search, filters.paymentStatus, filters.dateMode, filters.month, filters.year, filters.startDate, filters.endDate]);

  const hasMore = hasNextPage || visibleCount < filtered.length;
  const displayedOrders = filtered.slice(0, visibleCount);

  // Infinite scroll intersection observer watching sentinel inside scroll container
  useEffect(() => {
    if (!hasMore || isLoadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsLoadingMore(true);
          if (hasNextPage) fetchOrders(serverPage + 1, true);
          else {
            setVisibleCount(prev => prev + PAGE_SIZE);
            setIsLoadingMore(false);
          }
        }
      },
      {
        root: scrollContainerRef.current,
        threshold: 0.1,
        rootMargin: '100px',
      }
    );
    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, hasNextPage, serverPage, fetchOrders]);

  // Container scroll listener fallback to load more orders when nearing bottom of scroll container
  useEffect(() => {
    if (!hasMore || isLoadingMore) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const remainingScroll = container.scrollHeight - container.scrollTop - container.clientHeight;
      if (remainingScroll < 220) {
        setIsLoadingMore(true);
        if (hasNextPage) fetchOrders(serverPage + 1, true);
        else {
          setVisibleCount(prev => prev + PAGE_SIZE);
          setIsLoadingMore(false);
        }
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoadingMore, hasNextPage, serverPage, fetchOrders]);

  const handleSave = (saved, mode) => {
    if (mode === 'add') {
      setOrders(prev => [saved, ...prev]);
      // When amount is fully paid, there is no need to send the WhatsApp message
      const isSavedPaid = saved.paymentStatus === 'paid' || ((saved.paidAmount || 0) >= (saved.totalAmount || 0));
      if (!isSavedPaid) {
        setWhatsappOrder(saved);
      }
    } else {
      setOrders(prev => prev.map(o => o._id === saved._id ? saved : o));
    }
  };

  const handlePaidUpdate = (updatedOrder) => {
    setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
  };

  const handleDelete = async (id) => {
    if (deletingId) return;
    setDeletingId(id);
    try {
      await api.delete(`/orders/${id}`);
      setOrders(prev => prev.filter(o => o._id !== id));
      setDeleteOrderId(null);
      toast.success('Order deleted');
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const summarizeLines = (lines) => {
    if (!lines?.length) return '—';
    return lines.map(l => `${l.cases} case${l.cases > 1 ? 's' : ''} (${l.size})`).join(', ');
  };

  // Filter badge and active counter
  const isDateFiltered = filters.dateMode === 'monthYear' || (filters.dateMode === 'range' && (filters.startDate || filters.endDate));
  const activeFilterCount = (filters.paymentStatus ? 1 : 0) + (isDateFiltered ? 1 : 0);

  const getFilterButtonLabel = () => {
    if (activeFilterCount === 0) return 'Filter';
    if (filters.paymentStatus && !isDateFiltered) {
      return `Status: ${filters.paymentStatus.toUpperCase()}`;
    }
    if (isDateFiltered && !filters.paymentStatus) {
      if (filters.dateMode === 'monthYear') {
        const m = MONTHS.find(x => x.value === filters.month);
        return `${m ? m.label.slice(0, 3) : ''} ${filters.year}`;
      }
      return 'Date Range';
    }
    return `Filters (${activeFilterCount})`;
  };

  const handleClearFilters = (e) => {
    if (e) e.stopPropagation();
    setFilters(prev => ({
      ...prev,
      paymentStatus: '',
      dateMode: 'all',
      startDate: '',
      endDate: '',
    }));
  };

  return (
    <div className="orders-page-shell">
      {/* Pinned Top Controls: Title, Filter button, and Debounced Search Bar */}
      <div className="orders-top-controls">
        {/* Header with Title and Filter button on top-right side (New Order button removed) */}
        <div className="page-header" style={{ position: 'relative' }}>
          <div>
            <h1 className="page-title">Orders</h1>
          <p className="page-subtitle">{filtered.length} order{filtered.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Filter Button with Icon at Header Top-Right Side */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className={`btn ${activeFilterCount > 0 ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.45rem 0.85rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              borderRadius: 10,
            }}
            title="Filter orders by payment status, month, year, or date range"
          >
            <Filter size={15} />
            <span>{getFilterButtonLabel()}</span>
            {activeFilterCount > 0 && (
              <span
                onClick={handleClearFilters}
                style={{
                  marginLeft: 4,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.3)',
                  fontSize: '0.65rem',
                }}
                title="Clear all filters"
              >
                ✕
              </span>
            )}
          </button>

          {/* Filter Popover Menu with Payment Status, Month & Year, and Date Range */}
          {showFilterDropdown && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 100 }}
                onClick={() => setShowFilterDropdown(false)}
              />
              <div className="orders-filter-popover">
                {/* Popover Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0.4rem 0.6rem', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Filter size={14} /> Filter Orders
                  </div>
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-red)', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', padding: '0.2rem 0.4rem' }}
                    >
                      Reset All
                    </button>
                  )}
                </div>

                {/* Section 1: Payment Status */}
                <div style={{ padding: '0.6rem 0.2rem 0.35rem' }}>
                  <div className="orders-filter-section-title">Payment Status</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem', marginTop: '0.35rem' }}>
                    <button
                      type="button"
                      className={`orders-filter-chip ${filters.paymentStatus === '' ? 'active' : ''}`}
                      onClick={() => setFilters({ ...filters, paymentStatus: '' })}
                    >
                      All Statuses
                    </button>
                    {PAYMENT_STATUS_OPTIONS.map(status => (
                      <button
                        key={status}
                        type="button"
                        className={`orders-filter-chip ${filters.paymentStatus === status ? 'active' : ''}`}
                        onClick={() => setFilters({ ...filters, paymentStatus: status })}
                      >
                        <span className={`status-dot status-${status}`} />
                        <span style={{ textTransform: 'capitalize' }}>{status}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section 2: Date Filtering (Month/Year or Range) */}
                <div style={{ padding: '0.6rem 0.2rem 0.35rem', borderTop: '1px solid var(--border)', marginTop: '0.4rem' }}>
                  <div className="orders-filter-section-title">Date Period</div>
                  {/* Mode Tabs */}
                  <div style={{ display: 'flex', gap: '0.3rem', background: 'var(--bg-secondary)', padding: 3, borderRadius: 8, marginTop: '0.35rem' }}>
                    <button
                      type="button"
                      className={`orders-date-tab ${filters.dateMode === 'all' ? 'active' : ''}`}
                      onClick={() => setFilters({ ...filters, dateMode: 'all' })}
                    >
                      All Time
                    </button>
                    <button
                      type="button"
                      className={`orders-date-tab ${filters.dateMode === 'monthYear' ? 'active' : ''}`}
                      onClick={() => setFilters({ ...filters, dateMode: 'monthYear' })}
                    >
                      Month & Year
                    </button>
                    <button
                      type="button"
                      className={`orders-date-tab ${filters.dateMode === 'range' ? 'active' : ''}`}
                      onClick={() => setFilters({ ...filters, dateMode: 'range' })}
                    >
                      Range
                    </button>
                  </div>

                  {/* Mode: Month & Year Picker */}
                  {filters.dateMode === 'monthYear' && (
                    <div style={{ display: 'flex', gap: '0.45rem', marginTop: '0.6rem' }}>
                      <select
                        className="form-select"
                        style={{ flex: 1.35, fontSize: '0.8rem', padding: '0.4rem 0.5rem' }}
                        value={filters.month}
                        onChange={e => setFilters({ ...filters, month: e.target.value })}
                      >
                        {MONTHS.map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                      <select
                        className="form-select"
                        style={{ flex: 1, fontSize: '0.8rem', padding: '0.4rem 0.5rem' }}
                        value={filters.year}
                        onChange={e => setFilters({ ...filters, year: e.target.value })}
                      >
                        {YEARS.map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Mode: Custom Date Range */}
                  {filters.dateMode === 'range' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.6rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', width: 38 }}>From:</span>
                        <input
                          type="date"
                          className="form-input"
                          style={{ flex: 1, fontSize: '0.78rem', padding: '0.35rem 0.5rem' }}
                          value={filters.startDate}
                          onChange={e => setFilters({ ...filters, startDate: e.target.value })}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', width: 38 }}>To:</span>
                        <input
                          type="date"
                          className="form-input"
                          style={{ flex: 1, fontSize: '0.78rem', padding: '0.35rem 0.5rem' }}
                          value={filters.endDate}
                          onChange={e => setFilters({ ...filters, endDate: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Popover Footer Done Button */}
                <div style={{ marginTop: '0.65rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%', justifyContent: 'center', fontWeight: 700 }}
                    onClick={() => setShowFilterDropdown(false)}
                  >
                    Done
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Clean Full-Width Search Bar with 300ms Debounce */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={16} />
          <input
            className="form-input search-input"
            placeholder="Search by customer or order #..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setFilters(prev => ({ ...prev, search: '' }));
              }}
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 2,
              }}
              title="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>
      </div>

      {/* Dedicated Scroll Container - Only this container scrolls, not the whole page */}
      <div className="neo-order-cards-scroll-container" ref={scrollContainerRef}>
        {loading ? (
          <div className="loading-page"><div className="loading-spinner" /></div>
        ) : (
        <>
          {/* Desktop Table View */}
          <div className="table-wrapper orders-desktop-table">
            <table>
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Quantity</th>
                  <th data-col="total" style={{ textAlign: 'right' }}>Total</th>
                  <th data-col="paid" style={{ textAlign: 'right' }}>Paid</th>
                  <th>Payment Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedOrders.map(o => {
                  const isPaid = o.paymentStatus === 'paid' || ((o.paidAmount || 0) >= (o.totalAmount || 0));
                  return (
                    <tr key={o._id}>
                      <td data-label="Order #" style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>{o.orderNumber}</td>
                      <td data-label="Date" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{dayjs(o.createdAt).format('D MMM YY')}</td>
                      <td data-label="Customer" style={{ fontWeight: 600 }}>{o.customer?.name}</td>
                      <td data-label="Quantity" style={{ fontSize: '0.8rem' }}>{summarizeLines(o.lines)}</td>
                      <td data-label="Total" data-col="total" style={{ fontWeight: 600, textAlign: 'right' }}>₹{o.totalAmount?.toLocaleString('en-IN')}</td>
                      <td data-label="Paid" data-col="paid" style={{ color: isPaid ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600, textAlign: 'right' }}>
                        ₹{(o.paidAmount || 0).toLocaleString('en-IN')}
                      </td>
                      <td data-label="Status"><PaymentBadge status={o.paymentStatus} order={o} /></td>
                      <td data-label="Actions">
                        <div className="dt-actions">
                          {!isPaid && (
                            <button
                              className="dt-btn-pay"
                              onClick={() => setPayModal(o)}
                              title="Mark order as paid / Record payment"
                            >
                              <IndianRupee size={12} /> Pay
                            </button>
                          )}
                          {!isPaid && (
                            <button
                              className="dt-icon-btn wa-btn"
                              onClick={() => setWhatsappOrder(o)}
                              title="Send WhatsApp payment details"
                            >
                              <i className="bi bi-whatsapp" style={{ fontSize: '0.95rem' }} />
                            </button>
                          )}
                          <button
                            className="dt-icon-btn"
                            onClick={() => setModal(o)}
                            title="Edit Order"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="dt-icon-btn del-btn"
                            onClick={() => handleDelete(o._id)}
                            disabled={Boolean(deletingId)}
                            title="Delete Order"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filtered.length && (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty-state">
                        <ShoppingCart size={40} />
                        <h3>No orders found</h3>
                        <p>No orders match your search or filter</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Order Cards List (Reference 2 Inspired) */}
          <div className="orders-mobile-card-list">
            {displayedOrders.map(o => {
              const due = Math.max(0, o.totalAmount - (o.paidAmount || 0));
              const isPaid = o.paymentStatus === 'paid' || ((o.paidAmount || 0) >= (o.totalAmount || 0));
              const lines = o.lines || [];
              const customerName = o.customer?.name || 'Walk-in Customer';
              const totalCases = lines.reduce((sum, l) => sum + (l.cases || 0), 0);
              const totalBottles = lines.reduce((sum, l) => sum + ((l.cases || 0) * (l.bottlesPerCase || 12)), 0);
              const isExpanded = expandedOrderId === o._id;
              const isMenuOpen = activeMenuId === o._id;
              const statusInfo = getOrderStatusInfo(o);

              return (
                <div key={o._id} className={`ob-card ${isExpanded ? 'expanded' : ''}`}>
                  {/* A. CARD HEADER: Status badge + Date & Time on Dark Navy Accent */}
                  <div className="ob-card-header">
                    <span className={`saas-status-badge ${statusInfo.classKey}`}>
                      {statusInfo.label}
                    </span>
                    <div className="ob-card-meta">
                      <span className="ob-card-meta-item">
                        <Clock size={12} /> {dayjs(o.createdAt).format('HH:mm')}
                      </span>
                      <span className="ob-card-meta-item">
                        <Calendar size={12} /> {dayjs(o.createdAt).format('DD-MM-YYYY')}
                      </span>
                    </div>
                  </div>

                  {/* B. CUSTOMER INFORMATION & QUANTITY (Clickable body) */}
                  <div
                    className="ob-card-body"
                    onClick={() => setExpandedOrderId(isExpanded ? null : o._id)}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setExpandedOrderId(isExpanded ? null : o._id);
                      }
                    }}
                  >
                    <div>
                      <div className="ob-card-customer-name">{customerName}</div>
                      <div className="ob-card-order-id">#{o.orderNumber}</div>
                    </div>

                    <div className="ob-card-info-row">
                      <span className="ob-card-chip">
                        <TrendingUp size={12} />
                        <span>{totalCases} Cases · {totalBottles} Bottles</span>
                      </span>
                    </div>

                    {/* C. FINANCIAL SUMMARY (Collapsed View) */}
                    <div className="ob-card-financials">
                      <div className="ob-card-fin-item">
                        <span className="ob-card-fin-label">Total Billed</span>
                        <span className="ob-card-fin-value">₹{o.totalAmount.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="ob-card-fin-item">
                        <span className="ob-card-fin-label">Amount Paid</span>
                        <span className="ob-card-fin-value green">₹{(o.paidAmount || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="ob-card-fin-item">
                        <span className="ob-card-fin-label">{due > 0 ? 'Balance Due' : 'Status'}</span>
                        <span className={`ob-card-fin-value ${due > 0 ? 'red' : 'green'}`}>
                          {due > 0 ? `₹${due.toLocaleString('en-IN')}` : 'Settled'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* D. ORDER ITEMS & COMPLETE FINANCIAL BREAKDOWN (Expanded View) */}
                  {isExpanded && (
                    <div className="ob-card-expanded">
                      {/* Detailed Financial Summary Grid */}
                    {/*<div className="ob-fin-grid">
                      <div className="ob-fin-card">
                        <span className="ob-fin-card-label">Total Billed</span>
                        <span className="ob-fin-card-val blue">₹{o.totalAmount?.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="ob-fin-card">
                        <span className="ob-fin-card-label">Amount Paid</span>
                        <span className="ob-fin-card-val green">₹{(o.paidAmount || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="ob-fin-card">
                        <span className="ob-fin-card-label">{due > 0 ? 'Balance Due' : 'Status'}</span>
                        <span className={`ob-fin-card-val ${due > 0 ? 'red' : 'green'}`}>
                          {due > 0 ? `₹${due.toLocaleString('en-IN')}` : 'Fully Settled'}
                        </span>
                      </div>
                    </div>*/}

                      {/* Order Items */}
                      {lines.length > 0 && (
                        <div className="ob-items-section">
                          <div className="ob-items-title">Order Items ({lines.length})</div>
                          {lines.map((l, idx) => {
                            const bpc = l.bottlesPerCase || 12;
                            const lineTotal = (l.cases || 0) * bpc * (l.pricePerBottle || 0);
                            return (
                              <div key={idx} className="ob-item-row">
                                <div className="ob-item-top">
                                  <span className="ob-item-name"> {l.productName} ({l.size})</span>
                                  <span className="ob-item-price">₹{lineTotal.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="ob-item-detail">
                                  {l.cases} {l.cases === 1 ? 'case' : 'cases'} × {bpc} bottles = {l.cases * bpc} bottles · ₹{l.pricePerBottle} per bottle
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Order Note */}
                      {o.notes && (
                        <div className="ob-order-note">
                          <strong>Note:</strong> {o.notes}
                        </div>
                      )}
                    </div>
                  )}

                  {/* E. ACTIONS */}
                  <div className="ob-card-actions">
                    <div className="ob-action-group">
                      {/* Pay Now (Primary action in Ocean Blue) */}
                      {!isPaid && (
                        <button
                          type="button"
                          className="ob-btn-pay"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPayModal(o);
                          }}
                          title="Record Payment"
                        >
                          <IndianRupee size={12} />
                          <span>Pay Now</span>
                        </button>
                      )}

                      {/* WhatsApp Reminder (Green) */}
                      {!isPaid && (
                        <button
                          type="button"
                          className="ob-btn-wa"
                          onClick={(e) => {
                            e.stopPropagation();
                            setWhatsappOrder(o);
                          }}
                          title="Send WhatsApp payment reminder"
                        >
                          <i className="bi bi-whatsapp" style={{ fontSize: '0.82rem' }} />
                          <span className="ob-btn-label">Reminder</span>
                        </button>
                      )}

                      {/* Edit (Secondary) */}
                      <button
                        type="button"
                        className="ob-btn-icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setModal(o);
                        }}
                        title="Edit Order"
                        aria-label="Edit Order"
                      >
                        <Edit2 size={13} />
                      </button>

                      {/* More Options Menu (Delete inside) */}
                      <div className="ob-more-wrap">
                        <button
                          type="button"
                          className="ob-btn-icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(isMenuOpen ? null : o._id);
                          }}
                          title="More options"
                          aria-label="More options"
                        >
                          <MoreVertical size={13} />
                        </button>

                        {isMenuOpen && (
                          <>
                            <div
                              style={{ position: 'fixed', inset: 0, zIndex: 19 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                              }}
                            />
                            <div className="ob-more-dropdown" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                className="ob-more-item"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setDeleteOrderId(o._id);
                                }}
                              >
                                <Trash2 size={13} />
                                <span>Delete Order</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Expand/Collapse with chevron */}
                    <button
                      type="button"
                      className="ob-btn-expand"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedOrderId(isExpanded ? null : o._id);
                      }}
                      aria-label={isExpanded ? 'Collapse order' : 'Expand order'}
                    >
                      <span>{isExpanded ? 'Less' : 'Details'}</span>
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>
                </div>
              );
            })}

            {!filtered.length && (
              <div className="empty-state" style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid var(--border)' }}>
                <ShoppingCart size={40} />
                <h3>No orders found</h3>
                <p>No orders match your search or filter</p>
              </div>
            )}
          </div>

          {/* On-Scroll Progressive Page Loader */}
          {hasMore && (
            <div ref={loaderRef} className="orders-scroll-loader">
              <div className="orders-scroll-spinner" />
              <span>Loading more orders...</span>
            </div>
          )}
          {!hasMore && filtered.length > PAGE_SIZE && (
            <div className="orders-end-message">
              <span>All {filtered.length} orders loaded</span>
            </div>
          )}
        </>
      )}
      </div>

      {/* Create / Edit Modal */}
      <ConfirmDialog
        open={Boolean(deleteOrderId)}
        title="Delete order?"
        message="This permanently deletes the order and all payments linked to it."
        loading={Boolean(deletingId)}
        onCancel={() => setDeleteOrderId(null)}
        onConfirm={() => handleDelete(deleteOrderId)}
      />

      {modal && (
        <OrderModal
          order={modal === 'new' ? null : modal}
          customers={customers}
          products={products}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {/* Quick Payment Modal */}
      {payModal && (
        <QuickPaymentModal
          order={payModal}
          onClose={() => setPayModal(null)}
          onPaid={handlePaidUpdate}
        />
      )}

      {/* WhatsApp Message Preview & Send Modal */}
      {whatsappOrder && (
        <WhatsAppModal
          order={whatsappOrder}
          upiId={user?.upiId}
          businessName={user?.businessName}
          onClose={() => setWhatsappOrder(null)}
        />
      )}
    </div>
  );
}
