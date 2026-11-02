import { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';
import { MessageSquare, Phone, CheckCircle, Clock, Send } from 'lucide-react';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

function buildWhatsAppLink(phone, customerName, orderNumber, pendingAmount, businessName, upiId) {
  const cleanPhone = phone?.replace(/\D/g, '');
  const finalPhone = cleanPhone?.startsWith('91') ? cleanPhone : (cleanPhone ? `91${cleanPhone}` : '');
  const upiPayLink = upiId ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(businessName || 'Water Plant')}&am=${pendingAmount}&cu=INR` : '';

  const msg = encodeURIComponent(
    `Dear *${customerName}*,\n\n` +
    `This is a friendly payment reminder from *${businessName || 'Water Plant'}*.\n\n` +
    `📦 *Order:* #${orderNumber}\n` +
    `💰 *Total Amount Due:* ${fmt(pendingAmount)}\n\n` +
    (upiId ? `💳 *To Pay via UPI:*\nUPI ID: *${upiId}*\nPay Link: ${upiPayLink}\n\n` : '') +
    `📸 _Please share the screenshot / receipt if payment is done._\n\n` +
    `Please clear the payment at your earliest convenience.\n` +
    `Thank you for your business! 🙏`
  );
  return `https://wa.me/${finalPhone}?text=${msg}`;
}

export default function Reminders() {
  const { user } = useAuth();
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sentIds, setSentIds] = useState(new Set());

  useEffect(() => {
    api.get('/orders/pending/reminders')
      .then(r => setPendingOrders(r.data))
      .catch(() => toast.error('Failed to load pending orders'))
      .finally(() => setLoading(false));
  }, []);

  const markSent = async (orderId) => {
    try {
      await api.patch(`/orders/${orderId}/reminder`);
      setSentIds(prev => new Set([...prev, orderId]));
      toast.success('Reminder marked as sent');
    } catch { toast.error('Failed to mark'); }
  };

  const handleSendReminder = async (order) => {
    const link = buildWhatsAppLink(
      order.customer?.phone,
      order.customer?.name,
      order.orderNumber,
      order.totalAmount - order.paidAmount,
      user?.businessName,
      user?.upiId
    );
    window.open(link, '_blank');
    await markSent(order._id);
  };

  const totalPending = pendingOrders.reduce((s, o) => s + (o.totalAmount - o.paidAmount), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Payment Reminders</h1>
          <p className="page-subtitle">
            {pendingOrders.length} pending order{pendingOrders.length !== 1 ? 's' : ''} • Total due:
            <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}> {fmt(totalPending)}</span>
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div style={{ background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <MessageSquare size={20} style={{ color: '#25D366', flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.15rem' }}>WhatsApp Reminder System</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Clicking "Send Reminder" will open WhatsApp with a pre-filled message from your number to the customer. No API or subscription needed!
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-page"><div className="loading-spinner" /></div>
      ) : pendingOrders.length === 0 ? (
        <div className="empty-state">
          <CheckCircle size={50} style={{ color: 'var(--accent-green)', opacity: 1 }} />
          <h3 style={{ color: 'var(--accent-green)' }}>All Payments Cleared! 🎉</h3>
          <p>No pending payments found. Great job!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {pendingOrders.map(order => {
            const pending = order.totalAmount - order.paidAmount;
            const isSent = sentIds.has(order._id) || order.reminderSent;
            return (
              <div key={order._id} className={`reminder-card ${isSent ? 'sent' : ''}`}>
                {/* Customer info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>{order.customer?.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', background: 'rgba(59,130,246,0.1)', padding: '0.15rem 0.5rem', borderRadius: 9999, fontWeight: 600 }}>{order.orderNumber}</span>
                    {isSent && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <CheckCircle size={12} /> Reminder sent
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Order Total: </span>
                      <span style={{ fontWeight: 600 }}>{fmt(order.totalAmount)}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Paid: </span>
                      <span style={{ fontWeight: 600, color: 'var(--accent-green)' }}>{fmt(order.paidAmount)}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Pending: </span>
                      <span style={{ fontWeight: 700, color: 'var(--accent-red)', fontSize: '0.9rem' }}>{fmt(pending)}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={12} />
                      {dayjs(order.createdAt).format('D MMM YYYY')}
                    </div>
                  </div>
                  {order.customer?.phone && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Phone size={12} />{order.customer.phone}
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div style={{ width: 150, flexShrink: 0 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.3rem', textAlign: 'right' }}>
                    {Math.round((order.paidAmount / order.totalAmount) * 100)}% paid
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${(order.paidAmount / order.totalAmount) * 100}%`, background: 'var(--accent-green)' }} />
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0 }}>
                  <a
                    href={buildWhatsAppLink(order.customer?.phone, order.customer?.name, order.orderNumber, pending, user?.businessName, user?.upiId)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-whatsapp btn-sm"
                    onClick={() => markSent(order._id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Send size={13} /> Send WhatsApp
                  </a>
                  <a
                    href={`tel:${order.customer?.phone}`}
                    className="btn btn-outline btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}
                  >
                    <Phone size={13} /> Call
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
