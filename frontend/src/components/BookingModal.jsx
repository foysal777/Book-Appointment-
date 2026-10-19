import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { createAppointment } from '../api';

const SERVICE_OPTIONS = [
  { value: 'STANDARD_LESSON', label: 'Standard Driving Lesson (1h) - $65' },
  { value: 'MOCK_DRIVING_TEST', label: 'Mock Driving Test & Assessment (1h) - $80' },
  { value: 'HIGHWAY_TRAINING', label: 'Highway & Dual Carriageway (1h) - $75' },
  { value: 'PARKING_REFRESHER', label: 'Maneuvers & Parallel Parking (1h) - $60' },
  { value: 'ROAD_TEST_CAR_HIRE', label: 'Official Road Test Car Hire (1h) - $110' },
];

const INSTRUCTOR_OPTIONS = [
  'Alex Carter (Senior ADI)',
  'Sarah Jenkins (Grade A Instructor)',
  'David Lee (DVSA Approved Specialist)'
];

const STANDARD_TIME_SLOTS = [
  { start: '09:00:00', end: '10:00:00', label: '09:00 AM - 10:00 AM' },
  { start: '10:00:00', end: '11:00:00', label: '10:00 AM - 11:00 AM' },
  { start: '11:00:00', end: '12:00:00', label: '11:00 AM - 12:00 PM' },
  { start: '12:00:00', end: '13:00:00', label: '12:00 PM - 01:00 PM' },
  { start: '13:00:00', end: '14:00:00', label: '01:00 PM - 02:00 PM' },
  { start: '14:00:00', end: '15:00:00', label: '02:00 PM - 03:00 PM' },
  { start: '15:00:00', end: '16:00:00', label: '03:00 PM - 04:00 PM' },
  { start: '16:00:00', end: '17:00:00', label: '04:00 PM - 05:00 PM' },
  { start: '17:00:00', end: '18:00:00', label: '05:00 PM - 06:00 PM' },
];

export default function BookingModal({
  isOpen,
  onClose,
  initialDate,
  initialSlot,
  onBookingSuccess
}) {
  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    service_type: 'STANDARD_LESSON',
    instructor_name: 'Alex Carter (Senior ADI)',
    date: '',
    start_time: '09:00:00',
    end_time: '10:00:00',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const todayStr = new Date().toISOString().split('T')[0];
      const targetDate = initialDate || todayStr;
      const targetStartTime = initialSlot ? `${initialSlot.start_time}:00` : '09:00:00';
      const targetEndTime = initialSlot ? `${initialSlot.end_time}:00` : '10:00:00';

      setFormData(prev => ({
        ...prev,
        date: targetDate,
        start_time: targetStartTime,
        end_time: targetEndTime,
      }));
      setErrors({});
      setServerError('');
    }
  }, [isOpen, initialDate, initialSlot]);

  if (!isOpen) return null;

  const handleSlotSelect = (e) => {
    const selectedStart = e.target.value;
    const found = STANDARD_TIME_SLOTS.find(s => s.start === selectedStart);
    if (found) {
      setFormData(prev => ({
        ...prev,
        start_time: found.start,
        end_time: found.end
      }));
    }
  };

  const validate = () => {
    const errs = {};
    const today = new Date().toISOString().split('T')[0];

    if (!formData.client_name.trim()) {
      errs.client_name = 'Full name is required.';
    } else if (formData.client_name.trim().length < 2) {
      errs.client_name = 'Name must be at least 2 characters.';
    }

    if (!formData.client_email.trim()) {
      errs.client_email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.client_email)) {
      errs.client_email = 'Please enter a valid email address.';
    }

    if (!formData.client_phone.trim()) {
      errs.client_phone = 'Phone number is required.';
    } else if (formData.client_phone.replace(/\D/g, '').length < 7) {
      errs.client_phone = 'Please provide a valid phone number with digits.';
    }

    if (!formData.date) {
      errs.date = 'Date is required.';
    } else if (formData.date < today) {
      errs.date = 'Cannot schedule appointments for past dates.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const created = await createAppointment(formData);
      onBookingSuccess(created);
      onClose();
    } catch (err) {
      console.error('Booking failed:', err);
      if (err.status === 409) {
        setServerError('Scheduling Conflict: This time slot was already booked or conflicted with an existing appointment. Please pick a different slot.');
      } else {
        setServerError(err.message || 'An error occurred while creating the appointment.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" id="booking-modal-overlay">
      <div className="modal-content" id="booking-modal-content">
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Book Driving Appointment</h3>
            <p className="panel-subtitle">Select your lesson details and confirm time slot</p>
          </div>
          <button
            id="btn-close-booking-modal"
            className="modal-close-btn"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {serverError && (
          <div className="notice-box danger" id="booking-server-error">
            <AlertTriangle size={18} />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} id="booking-form">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="booking-date">
                Appointment Date *
              </label>
              <input
                id="booking-date"
                type="date"
                className="form-input"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
              {errors.date && <div className="form-error">{errors.date}</div>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="booking-slot">
                Time Slot (1 Hour) *
              </label>
              <select
                id="booking-slot"
                className="form-select"
                value={formData.start_time}
                onChange={handleSlotSelect}
              >
                {STANDARD_TIME_SLOTS.map((slot) => (
                  <option key={slot.start} value={slot.start}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="booking-service">
              Driving Service Type *
            </label>
            <select
              id="booking-service"
              className="form-select"
              value={formData.service_type}
              onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
            >
              {SERVICE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="booking-instructor">
              Assigned Driving Instructor *
            </label>
            <select
              id="booking-instructor"
              className="form-select"
              value={formData.instructor_name}
              onChange={(e) => setFormData({ ...formData, instructor_name: e.target.value })}
            >
              {INSTRUCTOR_OPTIONS.map((inst) => (
                <option key={inst} value={inst}>
                  {inst}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="booking-client-name">
              Student / Client Full Name *
            </label>
            <input
              id="booking-client-name"
              type="text"
              className="form-input"
              placeholder="e.g. Jessica Taylor"
              value={formData.client_name}
              onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
            />
            {errors.client_name && <div className="form-error">{errors.client_name}</div>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="booking-client-email">
                Email Address *
              </label>
              <input
                id="booking-client-email"
                type="email"
                className="form-input"
                placeholder="jessica@example.com"
                value={formData.client_email}
                onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
              />
              {errors.client_email && <div className="form-error">{errors.client_email}</div>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="booking-client-phone">
                Phone Number *
              </label>
              <input
                id="booking-client-phone"
                type="tel"
                className="form-input"
                placeholder="+1 555-0199"
                value={formData.client_phone}
                onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
              />
              {errors.client_phone && <div className="form-error">{errors.client_phone}</div>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="booking-notes">
              Pickup Address / Learning Focus (Optional)
            </label>
            <textarea
              id="booking-notes"
              rows={2}
              className="form-textarea"
              placeholder="e.g. Pickup at 42 High Street, learner has provisional license"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button
              id="btn-cancel-modal"
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              id="btn-confirm-booking"
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Confirming...' : 'Confirm Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
