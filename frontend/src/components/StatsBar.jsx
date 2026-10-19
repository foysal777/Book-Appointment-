import React from 'react';
import { CalendarCheck, Clock, CheckCircle2, XCircle } from 'lucide-react';

export default function StatsBar({ stats }) {
  if (!stats) return null;

  return (
    <div className="stats-grid" id="stats-grid">
      <div className="stat-card" id="stat-card-total">
        <div className="stat-icon primary">
          <CalendarCheck size={24} />
        </div>
        <div>
          <div className="stat-value">{stats.total_appointments ?? 0}</div>
          <div className="stat-label">Total Appointments</div>
        </div>
      </div>

      <div className="stat-card" id="stat-card-booked">
        <div className="stat-icon primary">
          <Clock size={24} />
        </div>
        <div>
          <div className="stat-value">{stats.booked_appointments ?? 0}</div>
          <div className="stat-label">Active Booked</div>
        </div>
      </div>

      <div className="stat-card" id="stat-card-completed">
        <div className="stat-icon success">
          <CheckCircle2 size={24} />
        </div>
        <div>
          <div className="stat-value">{stats.completed_appointments ?? 0}</div>
          <div className="stat-label">Completed Lessons</div>
        </div>
      </div>

      <div className="stat-card" id="stat-card-cancelled">
        <div className="stat-icon danger">
          <XCircle size={24} />
        </div>
        <div>
          <div className="stat-value">{stats.cancelled_appointments ?? 0}</div>
          <div className="stat-label">Cancelled (Freed Slots)</div>
        </div>
      </div>
    </div>
  );
}
