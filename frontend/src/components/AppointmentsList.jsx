import React from 'react';
import { Search, Mail, Phone, Calendar, Clock, User, Check, X, AlertCircle } from 'lucide-react';

export default function AppointmentsList({
  appointments,
  isLoading,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchChange,
  onOpenCancelModal,
  onMarkCompleted
}) {
  const getBadgeClass = (status) => {
    switch (status) {
      case 'BOOKED': return 'badge-booked';
      case 'COMPLETED': return 'badge-completed';
      case 'CANCELLED': return 'badge-cancelled';
      default: return 'badge-past';
    }
  };

  return (
    <div className="content-panel" id="appointments-directory-panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">
            <Calendar size={22} className="text-primary" />
            <span>Appointments Directory</span>
          </h2>
          <p className="panel-subtitle">
            Manage student bookings, cancel lessons, track completion & prevent scheduling conflicts
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search size={18} className="search-icon" />
          <input
            id="search-appointments-input"
            type="text"
            className="search-input"
            placeholder="Search by student name, email, phone, or notes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="status-filter-pills" id="status-filter-pills">
          {['ALL', 'BOOKED', 'COMPLETED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              id={`filter-pill-${st.toLowerCase()}`}
              className={`filter-pill ${statusFilter === st ? 'active' : ''}`}
              onClick={() => onStatusFilterChange(st)}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* List Content */}
      {isLoading ? (
        <div className="empty-state">
          <p style={{ color: 'var(--text-secondary)' }}>Loading appointments...</p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="empty-state" id="empty-appointments">
          <AlertCircle className="empty-icon" />
          <h3 style={{ fontSize: '18px', color: '#fff', marginBottom: '6px' }}>No Appointments Found</h3>
          <p style={{ fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>
            There are no appointments matching your current search or status filters.
          </p>
        </div>
      ) : (
        <div className="appointments-list" id="appointments-list">
          {appointments.map((appt) => (
            <div key={appt.id} className="appointment-item" id={`appointment-row-${appt.id}`}>
              <div className="appointment-main">
                <div className="date-time-box">
                  <div className="dt-date">{appt.date}</div>
                  <div className="dt-time">{appt.formatted_time || `${appt.start_time.slice(0, 5)} - ${appt.end_time.slice(0, 5)}`}</div>
                </div>

                <div className="client-info-box">
                  <div className="client-name-row">
                    <span className="client-name">{appt.client_name}</span>
                    <span className={`badge ${getBadgeClass(appt.status)}`}>
                      {appt.status_display || appt.status}
                    </span>
                  </div>

                  <div className="client-meta">
                    <span>
                      <User size={13} />
                      {appt.service_type_display || appt.service_type}
                    </span>
                    <span>
                      <Mail size={13} />
                      {appt.client_email}
                    </span>
                    <span>
                      <Phone size={13} />
                      {appt.client_phone}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Instructor: <strong>{appt.instructor_name}</strong>
                    {appt.notes && ` • Notes: ${appt.notes}`}
                  </div>

                  {appt.status === 'CANCELLED' && appt.cancellation_reason && (
                    <div className="cancellation-reason-box">
                      <strong>Cancellation Reason:</strong> {appt.cancellation_reason} (Time slot was freed)
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="appointment-actions">
                {appt.status === 'BOOKED' && (
                  <>
                    <button
                      id={`btn-complete-appt-${appt.id}`}
                      className="btn btn-secondary btn-sm"
                      title="Mark as completed lesson"
                      onClick={() => onMarkCompleted(appt.id)}
                    >
                      <Check size={14} className="text-success" />
                      <span>Complete</span>
                    </button>
                    <button
                      id={`btn-cancel-appt-${appt.id}`}
                      className="btn btn-danger btn-sm"
                      title="Cancel appointment"
                      onClick={() => onOpenCancelModal(appt)}
                    >
                      <X size={14} />
                      <span>Cancel</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
