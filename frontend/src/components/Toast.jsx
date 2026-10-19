import React from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export default function Toast({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container" id="toast-container">
      {toasts.map((toast) => {
        let Icon = CheckCircle2;
        let iconClass = 'text-success';

        if (toast.type === 'error') {
          Icon = AlertTriangle;
          iconClass = 'text-danger';
        } else if (toast.type === 'info') {
          Icon = Info;
          iconClass = 'text-primary';
        }

        return (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <Icon size={20} className={iconClass} />
            <div style={{ flex: 1, fontSize: '13px' }}>
              <strong>{toast.title}</strong>
              <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                {toast.message}
              </div>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
