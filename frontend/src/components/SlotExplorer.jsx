import React from 'react';
import { Calendar, Clock, AlertCircle, CheckCircle, User, ShieldAlert } from 'lucide-react';

export default function SlotExplorer({
  selectedDate,
  onDateChange,
  slotsData,
  isLoading,
  onBookSlot
}) {
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Calculate preset dates
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);
  const dayAfterStr = dayAfter.toISOString().split('T')[0];

  const isPastDate = slotsData?.is_past_date || (selectedDate < todayStr);

  return (
    <div className="content-panel" id="slot-explorer-panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">
            <Calendar size={22} className="text-primary" />
            <span>Available Driving Slots</span>
          </h2>
          <p className="panel-subtitle">
            {slotsData?.formatted_date || selectedDate} — Select a slot to schedule a driving appointment
          </p>
        </div>

        {slotsData?.summary && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <span className="badge badge-available">
              {slotsData.summary.available} Available
            </span>
            <span className="badge badge-booked">
              {slotsData.summary.booked} Booked
            </span>
            {slotsData.summary.past > 0 && (
              <span className="badge badge-past">
                {slotsData.summary.past} Passed
              </span>
            )}
          </div>
        )}
      </div>

      {/* Date Selector Navigation Bar */}
      <div className="date-selector-bar" id="date-selector-bar">
        <button
          id="btn-date-today"
          className={`date-preset-btn ${selectedDate === todayStr ? 'active' : ''}`}
          onClick={() => onDateChange(todayStr)}
        >
          Today
        </button>
        <button
          id="btn-date-tomorrow"
          className={`date-preset-btn ${selectedDate === tomorrowStr ? 'active' : ''}`}
          onClick={() => onDateChange(tomorrowStr)}
        >
          Tomorrow
        </button>
        <button
          id="btn-date-dayafter"
          className={`date-preset-btn ${selectedDate === dayAfterStr ? 'active' : ''}`}
          onClick={() => onDateChange(dayAfterStr)}
        >
          In 2 Days
        </button>

        <div className="custom-date-picker-wrap">
          <label htmlFor="custom-date-input" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Specific Date:
          </label>
          <input
            id="custom-date-input"
            type="date"
            className="date-input"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
          />
        </div>
      </div>

      {/* Date Validation Notice */}
      {isPastDate && (
        <div className="notice-box danger" id="past-date-notice">
          <ShieldAlert size={18} />
          <div>
            <strong>Past Date Validation:</strong> You have selected a past date ({selectedDate}). 
            The system strictly prevents scheduling appointments in the past. Please select today or a future date.
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="empty-state">
          <div className="stat-value" style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>
            Checking real-time slot availability...
          </div>
        </div>
      ) : (
        <div className="slots-grid" id="slots-grid">
          {slotsData?.slots?.map((slot) => {
            const isAvail = slot.is_available;
            const isBooked = slot.is_booked;
            const isPast = slot.is_past;

            let cardClass = 'slot-card';
            let badgeClass = 'badge-available';
            let badgeText = 'Available';

            if (isBooked) {
              cardClass += ' booked';
              badgeClass = 'badge-booked';
              badgeText = 'Booked';
            } else if (isPast) {
              cardClass += ' past';
              badgeClass = 'badge-past';
              badgeText = 'Passed';
            } else {
              cardClass += ' available';
            }

            return (
              <div key={slot.slot_key} className={cardClass} id={`slot-${slot.start_time.replace(':', '')}`}>
                <div>
                  <div className="slot-top">
                    <span className="slot-time">
                      <Clock size={16} />
                      {slot.label}
                    </span>
                    <span className={`badge ${badgeClass}`}>
                      {badgeText}
                    </span>
                  </div>

                  <div className="slot-details" style={{ marginTop: '12px' }}>
                    {isBooked && slot.appointment ? (
                      <div>
                        <div className="slot-booked-client">
                          <User size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                          {slot.appointment.client_name}
                        </div>
                        <div className="slot-booked-service">
                          {slot.appointment.service_type.replace(/_/g, ' ')}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Instructor: {slot.appointment.instructor_name}
                        </div>
                      </div>
                    ) : isPast ? (
                      <span style={{ color: 'var(--text-muted)' }}>
                        This time slot has already elapsed.
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>
                        Slot open for booking with senior driving instructor.
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  {isAvail ? (
                    <button
                      id={`btn-book-slot-${slot.start_time.replace(':', '')}`}
                      className="btn btn-primary btn-sm"
                      style={{ width: '100%' }}
                      onClick={() => onBookSlot(slot)}
                    >
                      Book This Slot
                    </button>
                  ) : isBooked ? (
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ width: '100%', opacity: 0.7 }}
                      disabled
                    >
                      Slot Occupied
                    </button>
                  ) : (
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ width: '100%', opacity: 0.5 }}
                      disabled
                    >
                      Unavailable
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
