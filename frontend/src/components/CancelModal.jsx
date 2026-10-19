import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { cancelAppointment } from '../api';

export default function CancelModal({ isOpen, onClose, appointment, onCancellationSuccess }) {
  const [reason, setReason] = useState('Client requested schedule change');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !appointment) return null;

  const handleConfirm = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await cancelAppointment(appointment.id, reason);
      onCancellationSuccess(response);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to cancel appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" id="cancel-modal-overlay">
      <div className="modal-content" id="cancel-modal-content">
        <div className="modal-header">
          <div>
            <h3 className="modal-title" style={{ color: 'var(--danger)' }}>
              Cancel Appointment
            </h3>
            <p className="panel-subtitle">
              Appointment #{appointment.id} for {appointment.client_name}
            </p>
          </div>
          <button id="btn-close-cancel-modal" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="notice-box warning" style={{ marginBottom: '18px' }}>
          <AlertTriangle size={20} />
          <div>
            <strong>Notice:</strong> Cancelling this appointment will change its status to <em>CANCELLED</em> and <strong>immediately free up the time slot ({appointment.date} at {appointment.start_time.slice(0, 5)})</strong> so other students can book it.
          </div>
        </div>

        {error && (
          <div className="notice-box danger">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleConfirm}>
          <div className="form-group">
            <label className="form-label" htmlFor="cancellation-reason-input">
              Reason for Cancellation:
            </label>
            <textarea
              id="cancellation-reason-input"
              rows={3}
              className="form-textarea"
              placeholder="e.g. Schedule clash, ill health, requested later date"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button
              id="btn-abort-cancel"
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Keep Appointment
            </button>
            <button
              id="btn-confirm-cancel"
              type="submit"
              className="btn btn-danger"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
