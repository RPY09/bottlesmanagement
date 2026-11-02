import { AlertTriangle, X } from 'lucide-react';
import '../styles/confirm-dialog.css';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  loading = false,
  onCancel,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <div
      className="confirm-dialog-overlay"
      role="presentation"
      onClick={(event) => event.target === event.currentTarget && !loading && onCancel()}
    >
      <div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
        <button
          type="button"
          className="confirm-dialog-close"
          onClick={onCancel}
          disabled={loading}
          aria-label="Close confirmation"
        >
          <X size={18} />
        </button>
        <div className="confirm-dialog-icon" aria-hidden="true">
          <AlertTriangle size={22} />
        </div>
        <h2 id="confirm-dialog-title">{title}</h2>
        <p>{message}</p>
        <div className="confirm-dialog-actions">
          <button type="button" className="confirm-dialog-cancel" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button type="button" className="confirm-dialog-confirm" onClick={onConfirm} disabled={loading}>
            {loading ? 'Deleting...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
