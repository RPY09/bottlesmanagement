import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import {
  Plus, Search, Edit2, Trash2, Receipt, MoreVertical,
  X, Calendar, Building, CreditCard, FileText,
  TrendingDown, Hash, AlertTriangle, ChevronRight, ChevronDown, Eye
} from 'lucide-react';
import '../styles/expenses.css';

// ─── Constants ───────────────────────────────────────────────────────────────
const STANDARD_CATEGORIES = [
  { value: 'purchase', label: 'Purchase' },
  { value: 'transport', label: 'Transportation' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'utilities', label: 'Electricity / Utilities' },
  { value: 'salary', label: 'Salaries' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'rent', label: 'Rent' },
  { value: 'other', label: 'Other' },
];

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

const PERIOD_CHIPS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7days', label: 'Last 7 Days' },
  { value: 'last30days', label: 'Last 30 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'all', label: 'All Time' },
  { value: 'custom', label: 'Custom' },
];

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// ─── Category Badge Component ────────────────────────────────────────────────
function CategoryBadge({ category }) {
  const c = (category || 'other').toLowerCase();
  let badgeClass = 'exp-badge-other';

  if (c.includes('purchase')) badgeClass = 'exp-badge-purchase';
  else if (c.includes('transport')) badgeClass = 'exp-badge-transport';
  else if (c.includes('maint')) badgeClass = 'exp-badge-maintenance';
  else if (c.includes('util') || c.includes('elect')) badgeClass = 'exp-badge-utilities';
  else if (c.includes('salar')) badgeClass = 'exp-badge-salary';
  else if (c.includes('pack')) badgeClass = 'exp-badge-packaging';
  else if (c.includes('rent')) badgeClass = 'exp-badge-rent';
  else if (STANDARD_CATEGORIES.some(sc => sc.value === c)) badgeClass = `exp-badge-${c}`;
  else badgeClass = 'exp-badge-custom';

  return (
    <span className={`exp-badge ${badgeClass}`}>
      {category || 'Other'}
    </span>
  );
}

// ─── Add / Edit Expense Modal ────────────────────────────────────────────────
function ExpenseModal({ expense, onClose, onSave }) {
  const isEdit = Boolean(expense?._id);
  const [form, setForm] = useState(() => ({
    description: expense?.description || '',
    category: expense?.category || 'purchase',
    amount: expense?.amount !== undefined ? String(expense.amount) : '',
    date: expense?.date ? dayjs(expense.date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
    vendor: expense?.vendor || '',
    paymentMode: expense?.paymentMode || 'cash',
    status: expense?.status || 'paid',
    notes: expense?.notes || '',
  }));
  const [loading, setLoading] = useState(false);
  const [customCat, setCustomCat] = useState('');
  const [isCustomCat, setIsCustomCat] = useState(() => {
    return expense?.category && !STANDARD_CATEGORIES.some(c => c.value === expense.category.toLowerCase());
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    const parsedAmount = parseFloat(form.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid expense amount');
      return;
    }
    if (!form.description.trim()) {
      toast.error('Description is required');
      return;
    }

    setLoading(true);
    const finalCategory = isCustomCat ? (customCat.trim() || 'other') : form.category;
    const payload = {
      ...form,
      category: finalCategory,
      amount: parsedAmount,
    };

    try {
      if (isEdit) {
        const { data } = await api.put(`/expenses/${expense._id}`, payload);
        onSave(data, 'edit');
        toast.success('Expense updated successfully');
      } else {
        const { data } = await api.post('/expenses', payload);
        onSave(data, 'add');
        toast.success('Expense added successfully');
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="exp-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="exp-modal">
        <div className="exp-modal-header">
          <span className="exp-modal-title">{isEdit ? 'Edit Expense' : 'Add New Expense'}</span>
          <button type="button" className="exp-sheet-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="exp-modal-form">
          {/* 1. Hero Amount Input */}
          <div className="exp-amount-field">
            <span className="exp-amount-label">Amount (₹) *</span>
            <div className="exp-amount-input-wrap">
              <span className="exp-currency-symbol">₹</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                autoFocus={!isEdit}
                placeholder="0.00"
                className="exp-amount-input"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              />
            </div>
          </div>

          {/* 2. Description */}
          <div className="exp-form-group">
            <label className="exp-form-label">Description *</label>
            <input
              type="text"
              required
              placeholder="e.g. PET Bottles 1L — 1,000 pcs"
              className="exp-form-input"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>

          {/* 3. Category & Date */}
          <div className="exp-form-grid-2">
            <div className="exp-form-group">
              <label className="exp-form-label">Category *</label>
              <select
                className="exp-form-select"
                value={isCustomCat ? '__custom__' : form.category}
                onChange={e => {
                  if (e.target.value === '__custom__') {
                    setIsCustomCat(true);
                  } else {
                    setIsCustomCat(false);
                    setForm(f => ({ ...f, category: e.target.value }));
                  }
                }}
              >
                {STANDARD_CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
                <option value="__custom__">+ Custom Category</option>
              </select>
            </div>

            <div className="exp-form-group">
              <label className="exp-form-label">Date *</label>
              <input
                type="date"
                required
                className="exp-form-input"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              />
            </div>
          </div>

          {/* Custom category input if selected */}
          {isCustomCat && (
            <div className="exp-form-group">
              <label className="exp-form-label">Custom Category Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Laboratory Testing"
                className="exp-form-input"
                value={customCat}
                onChange={e => setCustomCat(e.target.value)}
              />
            </div>
          )}

          {/* 4. Vendor & Payment Mode */}
          <div className="exp-form-grid-2">
            <div className="exp-form-group">
              <label className="exp-form-label">Vendor / Paid To</label>
              <input
                type="text"
                placeholder="Supplier or receiver"
                className="exp-form-input"
                value={form.vendor}
                onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))}
              />
            </div>

            <div className="exp-form-group">
              <label className="exp-form-label">Payment Mode</label>
              <select
                className="exp-form-select"
                value={form.paymentMode}
                onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value }))}
              >
                {PAYMENT_MODES.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 5. Notes */}
          <div className="exp-form-group">
            <label className="exp-form-label">Notes (Optional)</label>
            <textarea
              rows={2}
              placeholder="Invoice #, tax breakdown, warranty details..."
              className="exp-form-textarea"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <div className="exp-modal-footer">
            <button type="button" className="exp-btn-cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="exp-btn-save" disabled={loading}>
              {loading ? 'Saving...' : isEdit ? 'Update Expense' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Expense Details Bottom Sheet / Modal ────────────────────────────────────
function ExpenseDetailsSheet({ expense, onClose, onEdit, onDelete }) {
  if (!expense) return null;

  return (
    <div className="exp-sheet-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="exp-sheet">
        <div className="exp-sheet-handle-wrap">
          <div className="exp-sheet-handle" />
        </div>

        <div className="exp-sheet-header">
          <span className="exp-sheet-title">Expense Details</span>
          <button type="button" className="exp-sheet-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="exp-sheet-content">
          {/* Hero Amount */}
          <div className="exp-detail-hero">
            <span className="exp-detail-hero-label">Amount Paid</span>
            <div className="exp-detail-hero-amount">{fmt(expense.amount)}</div>
          </div>

          {/* Key-Value Details */}
          <div className="exp-detail-rows">
            <div className="exp-detail-row">
              <span className="exp-detail-row-label">
                <FileText size={15} /> Description
              </span>
              <span className="exp-detail-row-value">{expense.description}</span>
            </div>

            <div className="exp-detail-row">
              <span className="exp-detail-row-label">Category</span>
              <span className="exp-detail-row-value">
                <CategoryBadge category={expense.category} />
              </span>
            </div>

            <div className="exp-detail-row">
              <span className="exp-detail-row-label">
                <Calendar size={15} /> Date
              </span>
              <span className="exp-detail-row-value">
                {dayjs(expense.date).format('D MMMM YYYY')}
              </span>
            </div>

            {expense.vendor && (
              <div className="exp-detail-row">
                <span className="exp-detail-row-label">
                  <Building size={15} /> Vendor / Paid To
                </span>
                <span className="exp-detail-row-value">{expense.vendor}</span>
              </div>
            )}

            {expense.paymentMode && (
              <div className="exp-detail-row">
                <span className="exp-detail-row-label">
                  <CreditCard size={15} /> Payment Mode
                </span>
                <span className="exp-detail-row-value">
                  <span className="exp-mode-pill">{expense.paymentMode.toUpperCase()}</span>
                </span>
              </div>
            )}
          </div>

          {/* Complete Notes Box if present */}
          {expense.notes && (
            <div className="exp-detail-notes-box">
              <span className="exp-detail-notes-label">Notes & Remarks</span>
              <span>{expense.notes}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="exp-sheet-footer">
          <button
            type="button"
            className="exp-sheet-delete-btn"
            onClick={() => {
              onClose();
              onDelete(expense);
            }}
          >
            <Trash2 size={15} /> Delete
          </button>
          <button
            type="button"
            className="exp-sheet-edit-btn"
            onClick={() => {
              onClose();
              onEdit(expense);
            }}
          >
            <Edit2 size={15} /> Edit Expense
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirmation Modal ───────────────────────────────────────────────
function DeleteConfirmModal({ expense, onClose, onConfirm, loading }) {
  if (!expense) return null;

  return (
    <div className="exp-delete-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="exp-delete-modal">
        <div className="exp-delete-icon-wrap">
          <AlertTriangle size={26} />
        </div>
        <h3 className="exp-delete-title">Delete Expense?</h3>
        <p className="exp-delete-desc">
          Are you sure you want to permanently delete this expense record? This action cannot be undone.
        </p>

        <div className="exp-delete-context-box">
          <div className="exp-delete-context-row">
            <span style={{ color: 'var(--text-secondary)' }}>Amount:</span>
            <strong style={{ color: 'var(--status-danger-text)' }}>{fmt(expense.amount)}</strong>
          </div>
          <div className="exp-delete-context-row">
            <span style={{ color: 'var(--text-secondary)' }}>Description:</span>
            <strong>{expense.description}</strong>
          </div>
          {expense.vendor && (
            <div className="exp-delete-context-row">
              <span style={{ color: 'var(--text-secondary)' }}>Vendor:</span>
              <span>{expense.vendor}</span>
            </div>
          )}
          <div className="exp-delete-context-row">
            <span style={{ color: 'var(--text-secondary)' }}>Date:</span>
            <span>{dayjs(expense.date).format('D MMM YYYY')}</span>
          </div>
        </div>

        <div className="exp-delete-actions">
          <button type="button" className="exp-delete-cancel-btn" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            className="exp-delete-confirm-btn"
            onClick={() => onConfirm(expense._id)}
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete Expense'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Mobile Transaction Card Component ───────────────────────────────────────
function ExpenseCard({ expense, onViewDetails, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  return (
    <div
      className="exp-card"
      onClick={(e) => {
        // Prevent opening details if clicked on more button or menu
        if (e.target.closest('.exp-card-more-btn') || e.target.closest('.exp-popover')) {
          return;
        }
        onViewDetails(expense);
      }}
    >
      {/* Header: Category Badge + Amount */}
      <div className="exp-card-header">
        <CategoryBadge category={expense.category} />
        <span className="exp-card-amount">{fmt(expense.amount)}</span>
      </div>

      {/* Date */}
      <div className="exp-card-date">
        {dayjs(expense.date).format('D MMMM YYYY')}
      </div>

      {/* Primary: Description */}
      <div className="exp-card-primary">
        {expense.description}
      </div>

      {/* Secondary: Vendor & Notes (no dashes when empty) */}
      {(expense.vendor || expense.notes || expense.paymentMode) && (
        <div className="exp-card-secondary">
          {expense.vendor && (
            <div className="exp-card-vendor-row">
              <Building size={13} style={{ color: 'var(--text-muted)' }} />
              <span>Vendor: <strong>{expense.vendor}</strong></span>
              {expense.paymentMode && (
                <span className="exp-mode-pill" style={{ marginLeft: 'auto' }}>
                  {expense.paymentMode.toUpperCase()}
                </span>
              )}
            </div>
          )}
          {expense.notes && (
            <div className="exp-card-notes-preview">
              {expense.notes}
            </div>
          )}
        </div>
      )}

      {/* Footer: View Details & More button */}
      <div className="exp-card-footer">
        <button
          type="button"
          className="exp-card-view-btn"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails(expense);
          }}
        >
          View Details <ChevronRight size={13} />
        </button>

        <div style={{ position: 'relative' }} ref={menuRef}>
          <button
            type="button"
            className="exp-card-more-btn"
            aria-label="More options"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(v => !v);
            }}
          >
            <MoreVertical size={16} />
          </button>

          {menuOpen && (
            <div className="exp-popover">
              <button
                type="button"
                className="exp-popover-item"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onEdit(expense);
                }}
              >
                <Edit2 size={13} /> Edit
              </button>
              <button
                type="button"
                className="exp-popover-item danger"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onDelete(expense);
                }}
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Desktop Table Component ─────────────────────────────────────────────────
function ExpensesTable({ expenses, onEdit, onDelete, onViewDetails }) {
  return (
    <div className="exp-table-card">
      <table className="exp-table">
        <thead>
          <tr>
            <th style={{ width: '110px' }}>Date</th>
            <th>Description</th>
            <th style={{ width: '130px' }}>Category</th>
            <th style={{ width: '140px' }}>Vendor</th>
            <th className="right" style={{ width: '120px' }}>Amount</th>
            <th style={{ width: '110px' }}>Mode</th>
            <th>Notes</th>
            <th className="right" style={{ width: '100px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map(e => (
            <tr key={e._id}>
              <td className="exp-table-date">
                {dayjs(e.date).format('D MMM YYYY')}
              </td>
              <td className="exp-table-desc">
                {e.description}
              </td>
              <td>
                <CategoryBadge category={e.category} />
              </td>
              <td className="exp-table-vendor">
                {e.vendor || <span style={{ color: 'var(--border)' }}>—</span>}
              </td>
              <td className="exp-table-amount right">
                {fmt(e.amount)}
              </td>
              <td>
                {e.paymentMode ? (
                  <span className="exp-mode-pill">{e.paymentMode.toUpperCase()}</span>
                ) : (
                  <span style={{ color: 'var(--border)' }}>—</span>
                )}
              </td>
              <td className="exp-table-notes">
                {e.notes || <span style={{ color: 'var(--border)' }}>—</span>}
              </td>
              <td className="right">
                <div className="exp-table-actions">
                  <button
                    type="button"
                    className="exp-table-action-btn"
                    title="View details"
                    onClick={() => onViewDetails(e)}
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    type="button"
                    className="exp-table-action-btn"
                    title="Edit expense"
                    onClick={() => onEdit(e)}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    type="button"
                    className="exp-table-action-btn delete"
                    title="Delete expense"
                    onClick={() => onDelete(e)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Expenses Page ──────────────────────────────────────────────────────
export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState('all');
  const [period, setPeriod] = useState('thisMonth');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [metricsExpanded, setMetricsExpanded] = useState(false);

  // Modals & Sheets
  const [activeModal, setActiveModal] = useState(null); // 'new' | expense object
  const [detailExpense, setDetailExpense] = useState(null);
  const [deleteExpense, setDeleteExpense] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch all expenses once on mount
  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/expenses');
      setExpenses(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Handle period selector
  const handlePeriodChip = (val) => {
    setPeriod(val);
    if (val === 'custom') {
      setShowCustomPicker(true);
    } else {
      setShowCustomPicker(false);
    }
  };

  // Period filtering logic
  const periodFiltered = useMemo(() => {
    if (period === 'all') return expenses;

    const todayStr = dayjs().format('YYYY-MM-DD');

    return expenses.filter(e => {
      const expDate = dayjs(e.date);
      const expDateStr = expDate.format('YYYY-MM-DD');

      if (period === 'today') {
        return expDateStr === todayStr;
      }
      if (period === 'yesterday') {
        const yestStr = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
        return expDateStr === yestStr;
      }
      if (period === 'last7days') {
        const start7 = dayjs().subtract(6, 'day').startOf('day');
        return expDate.isAfter(start7) || expDate.isSame(start7, 'day');
      }
      if (period === 'last30days') {
        const start30 = dayjs().subtract(29, 'day').startOf('day');
        return expDate.isAfter(start30) || expDate.isSame(start30, 'day');
      }
      if (period === 'thisMonth') {
        return expDate.isSame(dayjs(), 'month');
      }
      if (period === 'lastMonth') {
        return expDate.isSame(dayjs().subtract(1, 'month'), 'month');
      }
      if (period === 'custom') {
        if (!customRange.start || !customRange.end) return true;
        const s = dayjs(customRange.start).startOf('day');
        const en = dayjs(customRange.end).endOf('day');
        return (expDate.isAfter(s) || expDate.isSame(s, 'day')) && (expDate.isBefore(en) || expDate.isSame(en, 'day'));
      }
      return true;
    });
  }, [expenses, period, customRange]);

  // Combined filters: search, category, payment mode
  const filtered = useMemo(() => {
    return periodFiltered.filter(e => {
      // Category filter
      if (catFilter !== 'all') {
        const c = (e.category || '').toLowerCase();
        if (catFilter === 'utilities') {
          if (!c.includes('util') && !c.includes('elect')) return false;
        } else if (catFilter === 'transport') {
          if (!c.includes('transport')) return false;
        } else if (catFilter === 'salary') {
          if (!c.includes('salar')) return false;
        } else if (c !== catFilter.toLowerCase()) {
          return false;
        }
      }

      // Payment mode filter
      if (modeFilter !== 'all') {
        if ((e.paymentMode || 'cash').toLowerCase() !== modeFilter.toLowerCase()) {
          return false;
        }
      }

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const desc = (e.description || '').toLowerCase();
        const vend = (e.vendor || '').toLowerCase();
        const nots = (e.notes || '').toLowerCase();
        if (!desc.includes(q) && !vend.includes(q) && !nots.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [periodFiltered, catFilter, modeFilter, search]);

  // Financial Metrics
  const totalSpent = useMemo(() => {
    return filtered.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [filtered]);

  const countTransactions = filtered.length;

  const averageExpense = useMemo(() => {
    return countTransactions > 0 ? Math.round(totalSpent / countTransactions) : 0;
  }, [totalSpent, countTransactions]);

  // Save (Add / Edit) handler
  const handleSave = (saved, mode) => {
    if (mode === 'add') {
      setExpenses(prev => [saved, ...prev]);
    } else {
      setExpenses(prev => prev.map(e => e._id === saved._id ? saved : e));
    }
  };

  // Delete handler
  const handleConfirmDelete = async (id) => {
    if (deleting) return;
    setDeleting(true);
    try {
      await api.delete(`/expenses/${id}`);
      setExpenses(prev => prev.filter(e => e._id !== id));
      toast.success('Expense deleted successfully');
      setDeleteExpense(null);
    } catch {
      toast.error('Failed to delete expense');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="exp-page">

      {/* ─── 1. Header ─── */}
      <div className="exp-header">
        <div className="exp-title-wrap">
          <h1 className="exp-title">Expenses</h1>
          <p className="exp-subtitle">
            Total spent: <span className="exp-total-pill">{fmt(totalSpent)}</span>
          </p>
        </div>
        <button
          type="button"
          className="exp-btn-add"
          onClick={() => setActiveModal('new')}
        >
          <Plus size={17} /> Add Expense
        </button>
      </div>

      {/* ─── 2. Reporting Period Selector Bar ─── */}
      <div className="exp-period-wrap">
        <div className="exp-period-bar" role="group" aria-label="Filter expenses by period">
          {PERIOD_CHIPS.map(chip => (
            <button
              key={chip.value}
              type="button"
              className={`exp-period-chip${period === chip.value ? ' active' : ''}`}
              onClick={() => handlePeriodChip(chip.value)}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {showCustomPicker && (
          <div className="exp-custom-range">
            <input
              type="date"
              className="exp-date-input"
              value={customRange.start}
              max={customRange.end || dayjs().format('YYYY-MM-DD')}
              onChange={e => setCustomRange(r => ({ ...r, start: e.target.value }))}
              aria-label="Start date"
            />
            <span className="exp-date-sep">→</span>
            <input
              type="date"
              className="exp-date-input"
              value={customRange.end}
              min={customRange.start}
              max={dayjs().format('YYYY-MM-DD')}
              onChange={e => setCustomRange(r => ({ ...r, end: e.target.value }))}
              aria-label="End date"
            />
          </div>
        )}
      </div>

      {/* ─── 3. Metrics Summary Cards ─── */}
      <button
        type="button"
        className="exp-metrics-toggle"
        onClick={() => setMetricsExpanded((expanded) => !expanded)}
        aria-expanded={metricsExpanded}
        aria-controls="expense-metrics"
      >
        <span>Expense metrics</span>
        <ChevronDown size={18} className={metricsExpanded ? 'expanded' : ''} />
      </button>
      <div id="expense-metrics" className={`exp-metrics-grid${metricsExpanded ? ' expanded' : ''}`}>
        <div className="exp-metric-card">
          <div className="exp-metric-icon red">
            <TrendingDown size={20} />
          </div>
          <div className="exp-metric-info">
            <span className="exp-metric-label">Total Expenses</span>
            <span className="exp-metric-value red">{fmt(totalSpent)}</span>
            <span className="exp-metric-sub">{countTransactions} record{countTransactions !== 1 ? 's' : ''} in period</span>
          </div>
        </div>

        <div className="exp-metric-card">
          <div className="exp-metric-icon navy">
            <Hash size={20} />
          </div>
          <div className="exp-metric-info">
            <span className="exp-metric-label">Transactions</span>
            <span className="exp-metric-value">{countTransactions}</span>
            <span className="exp-metric-sub">Recorded entries</span>
          </div>
        </div>

        <div className="exp-metric-card">
          <div className="exp-metric-icon amber">
            <CreditCard size={20} />
          </div>
          <div className="exp-metric-info">
            <span className="exp-metric-label">Average Expense</span>
            <span className="exp-metric-value">{fmt(averageExpense)}</span>
            <span className="exp-metric-sub">Per transaction</span>
          </div>
        </div>
      </div>

      {/* ─── 4. Search and Filters Bar ─── */}
      <div className="exp-filter-bar">
        <div className="exp-search-wrap">
          <Search size={16} className="exp-search-icon" />
          <input
            type="text"
            className="exp-search-input"
            placeholder="Search description, vendor, notes..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="exp-search-clear"
              onClick={() => setSearchInput('')}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <select
          className="exp-select"
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          aria-label="Filter by category"
        >
          <option value="all">All Categories</option>
          {STANDARD_CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

        <select
          className="exp-select"
          value={modeFilter}
          onChange={e => setModeFilter(e.target.value)}
          aria-label="Filter by payment mode"
        >
          <option value="all">All Modes</option>
          {PAYMENT_MODES.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* ─── 5. Content: Mobile Cards (< 1024px) & Desktop Table (>= 1024px) ─── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="exp-skeleton" style={{ height: 125, borderRadius: 14 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="exp-empty-card">
          <div className="exp-empty-icon">
            <Receipt size={28} />
          </div>
          <h3 className="exp-empty-title">No expenses found</h3>
          <p className="exp-empty-sub">
            {search || catFilter !== 'all' || modeFilter !== 'all' || period !== 'all'
              ? 'No expense records match your selected filters. Try clearing some filters.'
              : 'Start logging your plant operating expenses and purchases.'}
          </p>
          <button
            type="button"
            className="exp-btn-add"
            style={{ marginTop: '0.4rem' }}
            onClick={() => setActiveModal('new')}
          >
            <Plus size={15} /> Add First Expense
          </button>
        </div>
      ) : (
        <>
          {/* Mobile Layout: Transaction Cards (< 1024px) */}
          <div className="exp-mobile-only">
            <div className="exp-cards-list">
              {filtered.map(exp => (
                <ExpenseCard
                  key={exp._id}
                  expense={exp}
                  onViewDetails={setDetailExpense}
                  onEdit={setActiveModal}
                  onDelete={setDeleteExpense}
                />
              ))}
            </div>
          </div>

          {/* Desktop Layout: Full BI Table (>= 1024px) */}
          <div className="exp-desktop-only">
            <ExpensesTable
              expenses={filtered}
              onViewDetails={setDetailExpense}
              onEdit={setActiveModal}
              onDelete={setDeleteExpense}
            />
          </div>
        </>
      )}

      {/* ─── 6. Modals & Sheets ─── */}

      {/* Add / Edit Expense Modal */}
      {activeModal && (
        <ExpenseModal
          expense={activeModal === 'new' ? null : activeModal}
          onClose={() => setActiveModal(null)}
          onSave={handleSave}
        />
      )}

      {/* Expense Details Bottom Sheet */}
      {detailExpense && (
        <ExpenseDetailsSheet
          expense={detailExpense}
          onClose={() => setDetailExpense(null)}
          onEdit={setActiveModal}
          onDelete={setDeleteExpense}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteExpense && (
        <DeleteConfirmModal
          expense={deleteExpense}
          onClose={() => setDeleteExpense(null)}
          onConfirm={handleConfirmDelete}
          loading={deleting}
        />
      )}

    </div>
  );
}
