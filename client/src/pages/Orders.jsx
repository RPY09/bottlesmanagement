import { useEffect, useState, useRef } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import {
  Plus, Search, Edit2, Trash2, ShoppingCart, MessageCircle,
  IndianRupee, X, Send, Clock, Calendar, TrendingUp,
  ChevronDown, ChevronUp, Filter
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

function PaymentBadge({ status }) {
  const payMap = { paid: 'badge-green', partial: 'badge-yellow', unpaid: 'badge-red' };
  return <span className={`badge ${payMap[status] || 'badge-gray'}`} style={{ textTransform: 'capitalize' }}>{status}</span>;
}

/* ─── WhatsApp Order Confirmation Modal ─── */
export function WhatsAppModal({ order, upiId, businessName, onClose }) {
  const customer = order.customer || {};
  const phone = customer.phone ? customer.phone.replace(/\D/g, '') : '';
  const cleanPhone = phone.startsWith('91') ? phone : (phone ? `91${phone}` : '');

  const linesSummary = (order.lines || []).map(l => {
    const bpc = l.bottlesPerCase || 12;
    return `💧 *${l.productName}* (${l.size})\n   ↳ ${l.cases} case${l.cases !== 1 ? 's' : ''} × ${bpc} bottles = ${l.cases * bpc} bottles @ ₹${l.pricePerBottle}/bottle`;
  }).join('\n\n');

  const totalCases = (order.lines || []).reduce((s, l) => s + (l.cases || 0), 0);
  const totalBottles = (order.lines || []).reduce((s, l) => s + ((l.cases || 0) * (l.bottlesPerCase || 12)), 0);
  const address = customer.address || 'your registered address';
  const effectiveUpi = upiId || 'Not set (Update in Settings)';
  const upiPayLink = upiId ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(businessName || 'Water Plant')}&am=${order.totalAmount}&cu=INR` : '';

  const messageText =
    `👋 Hello *${customer.name || 'Customer'}*,\n\n` +
    `✅ Your order *#${order.orderNumber}* has been placed successfully!\n\n` +
    `📦 *Order Details:*\n${linesSummary}\n\n` +
    `📊 *Total Quantity:* ${totalCases} cases (${totalBottles} bottles)\n` +
    `💰 *Total Amount:* ₹${order.totalAmount?.toLocaleString('en-IN')}\n\n` +
    `🚚 *Delivery Address:*\nSoon to be delivered to your address:\n📍 _${address}_\n\n` +
    `💳 *To Pay via UPI:*\n` +
    `📲 UPI ID: *${effectiveUpi}*\n` +
    (upiId ? `🔗 Pay Link: ${upiPayLink}\n\n` : '\n') +
    `📸 _Please share the screenshot / receipt if payment is done._\n\n` +
    `🙏 Thank you for choosing *${businessName || 'Water Plant'}*! 💧`;

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
            <div style={{ width: 38, height: 38, borderRadius: 12, background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 10px rgba(37,211,102,0.3)' }}>
              <MessageCircle size={20} />
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
            <Send size={15} /> Send on WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Quick Payment Modal ─── */
function QuickPaymentModal({ order, onClose, onPaid }) {
  const due = Math.max(0, (order.totalAmount || 0) - (order.paidAmount || 0));
  const [amount, setAmount] = useState(due);
  const [mode, setMode] = useState('Cash');
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async (e) => {
    e.preventDefault();
    if (amount <= 0) return toast.error('Enter a valid amount');
    setLoading(true);
    try {
      if (amount >= due) {
        // Quick full pay
        const { data } = await api.patch(`/orders/${order._id}/pay`, { mode, reference });
        onPaid(data);
        toast.success(`Order ${order.orderNumber} marked as Paid!`);
      } else {
        // Partial payment record
        await api.post('/payments', {
          orderId: order._id,
          customerId: order.customer?._id || order.customer,
          amount: parseFloat(amount),
          mode,
          reference,
          date: new Date(),
          notes: `Partial payment for ${order.orderNumber}`,
        });
        const { data } = await api.get(`/orders/${order._id}`);
        onPaid(data.order);
        toast.success(`Payment of ₹${amount} recorded!`);
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(2,119,182,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)' }}>
              <IndianRupee size={18} />
            </div>
            <div>
              <span className="modal-title" style={{ fontSize: '1.05rem' }}>Mark Order as Paid</span>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Order #{order.orderNumber} • {order.customer?.name}</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleConfirm} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '0.9rem', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total: ₹{order.totalAmount?.toLocaleString('en-IN')}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)', fontWeight: 600 }}>Already Paid: ₹{(order.paidAmount || 0).toLocaleString('en-IN')}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Pending Due</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-red)' }}>₹{due.toLocaleString('en-IN')}</div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Payment Amount (₹) *</label>
            <input
              type="number"
              className="form-input"
              value={amount}
              onChange={e => setAmount(parseFloat(e.target.value) || 0)}
              max={due}
              min="1"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Payment Mode *</label>
            <select className="form-select" value={mode} onChange={e => setMode(e.target.value)}>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Reference / Transaction ID <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span></label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. UPI Ref # or receipt #"
              value={reference}
              onChange={e => setReference(e.target.value)}
            />
          </div>

          <div className="modal-footer" style={{ marginTop: '0.5rem', paddingTop: '0.75rem' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Processing...' : `Confirm Payment (₹${amount})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Create / Edit Order Modal ─── */
export function OrderModal({ order, customers, products, onClose, onSave }) {
  const buildDefaultLines = () => products.map(p => ({
    product: p._id,
    productName: p.name,
    size: p.size,
    bottlesPerCase: p.bottlesPerCase || 12,
    pricePerBottle: p.pricePerUnit,
    cases: 0,
  }));

  const parseExistingLines = (ord = order) => {
    if (!ord?.lines?.length) return buildDefaultLines();
    return products.map(p => {
      const existing = ord.lines.find(l => String(l.product?._id || l.product) === String(p._id));
      return {
        product: p._id,
        productName: p.name,
        size: p.size,
        bottlesPerCase: existing?.bottlesPerCase ?? p.bottlesPerCase ?? 12,
        pricePerBottle: existing?.pricePerBottle ?? p.pricePerUnit,
        cases: existing?.cases ?? 0,
      };
    });
  };

  const initialCustomerId = order?.customer?._id
    ? String(order.customer._id)
    : (order?.customer ? String(order.customer) : '');

  const [form, setForm] = useState({
    customer: initialCustomerId,
    notes: order?.notes || '',
    markPaid: order?.paymentStatus === 'paid',
    paymentMode: 'Cash',
  });
  const [lines, setLines] = useState(() => parseExistingLines(order));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (order) {
      const custId = order.customer?._id
        ? String(order.customer._id)
        : (order.customer ? String(order.customer) : '');
      setForm({
        customer: custId,
        notes: order.notes || '',
        markPaid: order.paymentStatus === 'paid',
        paymentMode: 'Cash',
      });
      setLines(parseExistingLines(order));
    } else {
      setForm({
        customer: '',
        notes: '',
        markPaid: false,
        paymentMode: 'Cash',
      });
      setLines(buildDefaultLines());
    }
  }, [order, products]);

  const updateLine = (idx, field, value) => {
    const updated = [...lines];
    if (field === 'cases') updated[idx] = { ...updated[idx], cases: Math.max(0, parseInt(value) || 0) };
    if (field === 'price') updated[idx] = { ...updated[idx], pricePerBottle: parseFloat(value) || 0 };
    setLines(updated);
  };

  const activeLines = lines.filter(l => l.cases > 0);
  const totalAmount = activeLines.reduce(
    (sum, l) => sum + l.cases * (l.bottlesPerCase || 12) * l.pricePerBottle, 0
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer) return toast.error('Please select a customer');
    if (!activeLines.length) return toast.error('Enter at least 1 case for any product');

    setLoading(true);
    try {
      const payload = {
        customer: form.customer,
        notes: form.notes,
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

      if (order?._id) {
        const { data } = await api.put(`/orders/${order._id}`, payload);
        onSave(data, 'edit');
        toast.success('Order updated!');
      } else {
        const { data } = await api.post('/orders', payload);
        onSave(data, 'add');
        toast.success('Order created!');
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div>
            <span className="modal-title">{order?._id ? `Edit Order #${order.orderNumber}` : 'Create New Order'}</span>
            {order?._id && order.customer?.name && (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Customer: <strong>{order.customer.name}</strong>
              </div>
            )}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Customer Selection */}
          <div className="form-group">
            <label className="form-label">Customer *</label>
            <select
              className="form-select"
              value={form.customer}
              onChange={e => setForm({ ...form, customer: e.target.value })}
              required
            >
              <option value="">Select customer...</option>
              {customers.map(c => (
                <option key={String(c._id)} value={String(c._id)}>
                  {c.name} {c.phone ? `(${c.phone})` : ''}
                </option>
              ))}
              {order?.customer && !customers.some(c => String(c._id) === String(order.customer?._id || order.customer)) && (
                <option value={String(order.customer._id || order.customer)}>
                  {order.customer.name || 'Selected Customer'}
                </option>
              )}
            </select>
          </div>

          {/* Cases + editable price per product */}
          <div>
            <label className="form-label" style={{ marginBottom: '0.75rem', display: 'block' }}>
              Order Quantity
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {lines.map((line, i) => {
                const bpc = line.bottlesPerCase || 12;
                const lineTotal = line.cases * bpc * line.pricePerBottle;
                return (
                  <div
                    key={line.product}
                    className="order-line-item-row"
                    style={{
                      padding: '0.75rem 1rem',
                      background: 'var(--bg-secondary)',
                      borderRadius: 8,
                      border: line.cases > 0 ? '1px solid var(--accent-blue)' : '1px solid var(--border)',
                      transition: 'border-color 0.15s',
                    }}
                  >
                    {/* Product info */}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{line.productName}</div>
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                        {line.size} • <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{bpc} bottles/case</span>
                      </div>
                    </div>

                    {/* Cases */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.71rem' }}>Cases</label>
                      <input
                        className="form-input"
                        type="number"
                        min="0"
                        value={line.cases || ''}
                        placeholder="0"
                        onChange={e => updateLine(i, 'cases', e.target.value)}
                        style={{ textAlign: 'center' }}
                      />
                    </div>

                    {/* Price per bottle (editable) */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.71rem' }}>₹ / Bottle</label>
                      <input
                        className="form-input"
                        type="number"
                        min="0"
                        step="0.5"
                        value={line.pricePerBottle}
                        onChange={e => updateLine(i, 'price', e.target.value)}
                      />
                    </div>

                    {/* Bottles auto-calc */}
                    <div style={{ fontSize: '0.82rem' }}>
                      <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)', marginBottom: 2 }}>Total Bottles</div>
                      <div style={{ fontWeight: 600 }}>{line.cases * bpc}</div>
                    </div>

                    {/* Subtotal */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)', marginBottom: 2 }}>Subtotal</div>
                      <div style={{ fontWeight: 700, color: lineTotal > 0 ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
                        ₹{lineTotal.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total */}
            <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'var(--palette-ocean-soft)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Order Total</span>
              <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--accent-blue)' }}>₹{totalAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Quick Mark as Paid on Creation / Edit */}
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '0.85rem 1rem',
            borderRadius: 8,
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Mark as Paid in Full?
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Check if the customer is paying on the spot (₹{totalAmount.toLocaleString('en-IN')})
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {form.markPaid && (
                <select
                  className="form-select"
                  style={{ width: 110, padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                  value={form.paymentMode}
                  onChange={e => setForm({ ...form, paymentMode: e.target.value })}
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank">Bank</option>
                </select>
              )}
              <input
                type="checkbox"
                id="markPaidCheckbox"
                checked={form.markPaid}
                onChange={e => setForm({ ...form, markPaid: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: 'var(--accent-blue)', cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              className="form-textarea"
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Any special payment or order instructions..."
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : order?._id ? 'Update Order' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
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

  // Progressive infinite scroll loading to maintain smooth 60fps scrolling
  const PAGE_SIZE = 12;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loaderRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Debounce search input by 300ms for smooth typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => (prev.search === searchInput ? prev : { ...prev, search: searchInput }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    Promise.all([
      api.get('/orders'),
      api.get('/customers'),
      api.get('/products'),
    ]).then(([o, c, p]) => {
      setOrders(o.data);
      setCustomers(c.data);
      setProducts(p.data);
    }).catch(() => toast.error('Failed to load orders')).finally(() => setLoading(false));

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

  const hasMore = visibleCount < filtered.length;
  const displayedOrders = filtered.slice(0, visibleCount);

  // Infinite scroll intersection observer watching sentinel inside scroll container
  useEffect(() => {
    if (!hasMore || isLoadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsLoadingMore(true);
          setTimeout(() => {
            setVisibleCount(prev => prev + PAGE_SIZE);
            setIsLoadingMore(false);
          }, 250);
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
  }, [hasMore, isLoadingMore]);

  // Container scroll listener fallback to load more orders when nearing bottom of scroll container
  useEffect(() => {
    if (!hasMore || isLoadingMore) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const remainingScroll = container.scrollHeight - container.scrollTop - container.clientHeight;
      if (remainingScroll < 220) {
        setIsLoadingMore(true);
        setTimeout(() => {
          setVisibleCount(prev => prev + PAGE_SIZE);
          setIsLoadingMore(false);
        }, 250);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoadingMore]);

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
    if (!window.confirm('Delete this order?')) return;
    try {
      await api.delete(`/orders/${id}`);
      setOrders(prev => prev.filter(o => o._id !== id));
      toast.success('Order deleted');
    } catch {
      toast.error('Failed to delete');
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
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Payment Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedOrders.map(o => {
                  const isPaid = o.paymentStatus === 'paid';
                  return (
                    <tr key={o._id}>
                      <td data-label="Order #" style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>{o.orderNumber}</td>
                      <td data-label="Date" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{dayjs(o.createdAt).format('D MMM YY')}</td>
                      <td data-label="Customer" style={{ fontWeight: 600 }}>{o.customer?.name}</td>
                      <td data-label="Quantity" style={{ fontSize: '0.8rem' }}>{summarizeLines(o.lines)}</td>
                      <td data-label="Total" style={{ fontWeight: 600 }}>₹{o.totalAmount?.toLocaleString('en-IN')}</td>
                      <td data-label="Paid" style={{ color: isPaid ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>
                        ₹{(o.paidAmount || 0).toLocaleString('en-IN')}
                      </td>
                      <td data-label="Status"><PaymentBadge status={o.paymentStatus} /></td>
                      <td data-label="Actions">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {!isPaid && (
                            <button
                              className="btn btn-outline btn-sm"
                              style={{
                                padding: '0.3rem 0.6rem',
                                fontSize: '0.75rem',
                                gap: '0.25rem',
                                borderColor: 'var(--accent-green)',
                                color: 'var(--accent-green)',
                                minHeight: 'unset',
                              }}
                              onClick={() => setPayModal(o)}
                              title="Mark order as paid / Record payment"
                            >
                              <IndianRupee size={12} /> Pay
                            </button>
                          )}
                          {!isPaid && (
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              style={{ color: '#25D366', minHeight: 'unset' }}
                              onClick={() => setWhatsappOrder(o)}
                              title="Send order & UPI payment details via WhatsApp"
                            >
                              <MessageCircle size={15} />
                            </button>
                          )}
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            onClick={() => setModal(o)}
                            title="Edit Order"
                            style={{ minHeight: 'unset' }}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            style={{ color: 'var(--accent-red)', minHeight: 'unset' }}
                            onClick={() => handleDelete(o._id)}
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

          {/* Mobile Neo-Glass Order Cards List (matching user reference design) */}
          <div className="orders-mobile-card-list">
            {displayedOrders.map(o => {
              const due = o.totalAmount - (o.paidAmount || 0);
              const isPaid = o.paymentStatus === 'paid';
              const lines = o.lines || [];
              const customerName = o.customer?.name || 'Walk-in Customer';
              const totalCases = lines.reduce((sum, l) => sum + (l.cases || 0), 0);
              const totalBottles = lines.reduce((sum, l) => sum + ((l.cases || 0) * (l.bottlesPerCase || 12)), 0);
              const isExpanded = expandedOrderId === o._id;

              return (
                <div key={o._id} className="neo-order-card">
                  {/* Top Bar: Left Tab + Right Time & Date */}
                  <div className="neo-order-topbar">
                    <div className="neo-order-tab">
                      {isPaid ? 'Paid' : due > 0 && (o.paidAmount || 0) > 0 ? 'Partial' : 'Pending'}
                    </div>
                    <div className="neo-order-meta">
                      <span className="neo-order-meta-item">
                        <Clock size={13} /> {dayjs(o.createdAt).format('HH:mm')}
                      </span>
                      <span className="neo-order-meta-item">
                        <Calendar size={13} /> {dayjs(o.createdAt).format('DD-MM-YYYY')}
                      </span>
                    </div>
                  </div>

                  {/* Main Body */}
                  <div className="neo-order-body">
                    <div className="neo-order-title" onClick={() => setExpandedOrderId(isExpanded ? null : o._id)}>
                      {customerName} (Order #{o.orderNumber})
                    </div>

                    {/* Frosted Pills */}
                    <div className="neo-order-pills" onClick={() => setExpandedOrderId(isExpanded ? null : o._id)}>
                      <span className="neo-order-pill">
                        <TrendingUp size={12} /> {totalCases > 0 ? `${totalCases} Cases (${totalBottles} Btls)` : 'Standard Order'}
                      </span>
                    </div>

                    {/* Bottom Stats Row */}
                    <div className="neo-order-footer">
                      <div>
                        Total Billed : <span className="neo-order-stat-val">₹{o.totalAmount.toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        {due > 0 ? (
                          <span>Due : <span className="neo-order-stat-val" style={{ color: '#fca5a5' }}>₹{due.toLocaleString('en-IN')}</span></span>
                        ) : (
                          <span>Profit : <span className="neo-order-stat-val">₹{o.totalAmount.toLocaleString('en-IN')}</span></span>
                        )}
                      </div>
                    </div>

                    {/* Quick Action Strip + Expand Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem', paddingTop: '0.65rem', borderTop: '1px dashed rgba(255,255,255,0.22)' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        {!isPaid && (
                          <button
                            className="btn btn-sm"
                            style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '0.3rem 0.65rem', fontSize: '0.75rem', fontWeight: 700, borderRadius: 8 }}
                            onClick={() => setPayModal(o)}
                          >
                            <IndianRupee size={12} /> Pay
                          </button>
                        )}
                        {!isPaid && (
                          <button
                            className="btn btn-sm"
                            style={{ background: '#25D366', color: '#fff', border: 'none', padding: '0.3rem 0.6rem', borderRadius: 8 }}
                            onClick={() => setWhatsappOrder(o)}
                            title="Send WhatsApp"
                          >
                            <MessageCircle size={14} />
                          </button>
                        )}
                        <button
                          className="btn btn-sm"
                          style={{ background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.25)', padding: '0.3rem 0.6rem', borderRadius: 8, color: '#fff' }}
                          onClick={() => setModal(o)}
                          title="Edit Order"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{ background: 'rgba(220,38,38,0.3)', border: '1px solid rgba(220,38,38,0.4)', padding: '0.3rem 0.6rem', borderRadius: 8, color: '#fee2e2' }}
                          onClick={() => handleDelete(o._id)}
                          title="Delete Order"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <button
                        type="button"
                        style={{ background: 'transparent', border: 'none', color: 'var(--palette-ice-blue)', display: 'flex', alignItems: 'center', gap: 2, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                        onClick={() => setExpandedOrderId(isExpanded ? null : o._id)}
                      >
                        <span>{isExpanded ? 'Hide' : 'Items'}</span>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>

                    {/* Expandable Line Items breakdown */}
                    {isExpanded && lines.length > 0 && (
                      <div className="neo-order-expanded">
                        <div style={{ fontWeight: 800, opacity: 0.9 }}>Items Ordered:</div>
                        {lines.map((l, idx) => (
                          <div key={idx} className="neo-order-expanded-row">
                            <span>💧 {l.productName} ({l.size}) × {l.cases} cases ({l.cases * (l.bottlesPerCase || 12)} bottles)</span>
                            <span style={{ fontWeight: 800 }}>₹{((l.cases * (l.bottlesPerCase || 12)) * (l.pricePerBottle || 0)).toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                        {o.notes && (
                          <div style={{ opacity: 0.85, fontStyle: 'italic', marginTop: 4 }}>
                            Note: {o.notes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {!filtered.length && (
              <div className="empty-state" style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)' }}>
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
