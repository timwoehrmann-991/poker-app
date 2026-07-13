import React from 'react';

interface ConfirmDialogProps {
  open: boolean;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Ersetzt window.confirm() — passt zum Design statt zum Browser */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open, message, confirmLabel, cancelLabel, onConfirm, onCancel,
}) => {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)',
      }}
      onClick={onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--border-strong)',
          borderRadius: 16, padding: '20px 24px',
          maxWidth: 320, width: 'calc(100vw - 48px)',
          boxShadow: 'var(--glass-shadow-lg)',
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16, lineHeight: 1.4 }}>
          {message}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '9px 12px', borderRadius: 10,
              background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            style={{
              flex: 1, padding: '9px 12px', borderRadius: 10,
              background: 'var(--color-danger)', border: 'none',
              color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
