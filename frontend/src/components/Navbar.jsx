import React from 'react';
import { Car, Plus, RefreshCw, ShieldCheck } from 'lucide-react';

export default function Navbar({ onOpenBooking, onRefresh, isRefreshing }) {
  return (
    <header className="app-header" id="app-header">
      <div className="brand-section">
        <div className="brand-icon-wrapper">
          <Car size={26} strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="brand-title">
            SK Driving Academy
            <span className="brand-badge">Bookings & Slots</span>
          </h1>
          <p className="brand-subtitle">
            Appointment Booking, Real-Time Availability & Concurrency Guard System
          </p>
        </div>
      </div>

      <div className="header-actions">
        <button
          id="btn-refresh-data"
          className="btn btn-secondary btn-sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh availability and appointments"
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? 'Syncing...' : 'Sync'}
        </button>

        <button
          id="btn-open-booking-modal"
          className="btn btn-primary"
          onClick={() => onOpenBooking()}
        >
          <Plus size={18} strokeWidth={2.4} />
          <span>Book Appointment</span>
        </button>
      </div>
    </header>
  );
}
