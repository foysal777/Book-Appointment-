const API_BASE = '/api';

/**
 * Fetch available time slots for a specified date (YYYY-MM-DD)
 */
export async function getAvailableSlots(dateString) {
  const url = dateString ? `${API_BASE}/available-slots/?date=${dateString}` : `${API_BASE}/available-slots/`;
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch available slots');
  }
  return res.json();
}

/**
 * Fetch list of appointments with optional status, date, or search filter
 */
export async function getAppointments(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== 'ALL') params.append('status', filters.status);
  if (filters.date) params.append('date', filters.date);
  if (filters.search) params.append('search', filters.search);

  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE}/appointments/${query}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch appointments');
  }
  return res.json();
}

/**
 * Create a new appointment
 */
export async function createAppointment(appointmentData) {
  const res = await fetch(`${API_BASE}/appointments/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(appointmentData),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Format error message nicely from DRF response
    let errorMessage = data.error || data.detail || '';
    if (!errorMessage && typeof data === 'object') {
      const keys = Object.keys(data);
      if (keys.length > 0) {
        const firstKey = keys[0];
        const val = data[firstKey];
        errorMessage = Array.isArray(val) ? `${firstKey}: ${val[0]}` : `${firstKey}: ${val}`;
      }
    }
    const err = new Error(errorMessage || 'Failed to create appointment');
    err.status = res.status;
    err.payload = data;
    throw err;
  }

  return data;
}

/**
 * Cancel an appointment
 */
export async function cancelAppointment(appointmentId, reason = '') {
  const res = await fetch(`${API_BASE}/appointments/${appointmentId}/cancel/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ cancellation_reason: reason }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Failed to cancel appointment');
  }

  return data;
}

/**
 * Update appointment status (e.g. COMPLETED or BOOKED)
 */
export async function updateAppointmentStatus(appointmentId, newStatus, reason = '') {
  const res = await fetch(`${API_BASE}/appointments/${appointmentId}/status/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: newStatus, cancellation_reason: reason }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || data.detail || 'Failed to update status');
  }

  return data;
}

/**
 * Delete an appointment
 */
export async function deleteAppointment(appointmentId) {
  const res = await fetch(`${API_BASE}/appointments/${appointmentId}/`, {
    method: 'DELETE',
  });

  if (!res.ok && res.status !== 204) {
    throw new Error('Failed to delete appointment');
  }

  return true;
}

/**
 * Fetch dashboard stats
 */
export async function getStats() {
  const res = await fetch(`${API_BASE}/stats/`);
  if (!res.ok) {
    throw new Error('Failed to fetch stats');
  }
  return res.json();
}

/**
 * Seed demo appointments
 */
export async function seedDemoData(reset = false) {
  const res = await fetch(`${API_BASE}/seed-demo/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reset }),
  });
  return res.json();
}
