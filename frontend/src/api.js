const API_BASE = '/api';

/**
 * Fetch available time slots for a specified date (YYYY-MM-DD)
 */
export async function getAvailableSlots(dateString) {
  const url = dateString ? `${API_BASE}/available-slots/?date=${dateString}` : `${API_BASE}/available-slots/`;
  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new Error('Cannot connect to backend server. Make sure Django is running on port 8000.');
  }

  const text = await res.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    if (!res.ok) {
      throw new Error(`Backend error (${res.status}): Make sure Django is running on port 8000.`);
    }
  }

  if (!res.ok) {
    throw new Error(data.error || data.detail || `Failed to fetch slots (Status ${res.status})`);
  }
  return data;
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
  let res;
  try {
    res = await fetch(`${API_BASE}/appointments/${query}`);
  } catch (err) {
    throw new Error('Cannot connect to backend server. Make sure Django is running on port 8000.');
  }

  const text = await res.text();
  let data = [];
  try {
    data = JSON.parse(text);
  } catch {
    if (!res.ok) {
      throw new Error(`Backend error (${res.status}): Make sure Django is running on port 8000.`);
    }
  }

  if (!res.ok) {
    throw new Error(data.error || data.detail || `Failed to fetch appointments (Status ${res.status})`);
  }
  return data;
}

/**
 * Create a new appointment
 */
export async function createAppointment(appointmentData) {
  let res;
  try {
    res = await fetch(`${API_BASE}/appointments/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(appointmentData),
    });
  } catch (networkErr) {
    throw new Error('Cannot connect to backend server. Please verify Django is running on port 8000.');
  }

  const text = await res.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}: Backend connection refused or error.`);
    }
  }

  if (!res.ok) {
    let errorMessage = data.error || data.detail || '';
    if (!errorMessage && data.non_field_errors) {
      errorMessage = Array.isArray(data.non_field_errors) ? data.non_field_errors.join(' ') : data.non_field_errors;
    }
    if (!errorMessage && typeof data === 'object') {
      const entries = Object.entries(data);
      if (entries.length > 0) {
        const [field, val] = entries[0];
        errorMessage = Array.isArray(val) ? `${field}: ${val.join(' ')}` : `${field}: ${val}`;
      }
    }
    const err = new Error(errorMessage || `Request failed with status ${res.status}`);
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
  let res;
  try {
    res = await fetch(`${API_BASE}/appointments/${appointmentId}/cancel/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cancellation_reason: reason }),
    });
  } catch (err) {
    throw new Error('Cannot connect to backend server.');
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || data.detail || 'Failed to cancel appointment');
  }

  return data;
}

/**
 * Update appointment status (e.g. COMPLETED or BOOKED)
 */
export async function updateAppointmentStatus(appointmentId, newStatus, reason = '') {
  let res;
  try {
    res = await fetch(`${API_BASE}/appointments/${appointmentId}/status/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: newStatus, cancellation_reason: reason }),
    });
  } catch (err) {
    throw new Error('Cannot connect to backend server.');
  }

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
  let res;
  try {
    res = await fetch(`${API_BASE}/stats/`);
  } catch (err) {
    throw new Error('Cannot connect to backend server.');
  }
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
