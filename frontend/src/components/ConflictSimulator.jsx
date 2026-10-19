import React, { useState } from 'react';
import { Zap, ShieldCheck, AlertOctagon, CheckCircle, Clock } from 'lucide-react';
import { createAppointment } from '../api';

export default function ConflictSimulator({ onRefreshAll }) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const [testDate, setTestDate] = useState(tomorrowStr);
  const [testSlot, setTestSlot] = useState('16:00:00');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);

  const runConcurrencyTest = async () => {
    setIsRunning(true);
    setResults(null);

    const bookingPayloadA = {
      client_name: 'Simulated User Alpha',
      client_email: 'alpha.test@example.com',
      client_phone: '+1 555-0101',
      service_type: 'STANDARD_LESSON',
      instructor_name: 'Alex Carter (Senior ADI)',
      date: testDate,
      start_time: testSlot,
      end_time: testSlot === '16:00:00' ? '17:00:00' : '18:00:00',
      notes: 'Concurrency Test Agent Alpha'
    };

    const bookingPayloadB = {
      client_name: 'Simulated User Beta',
      client_email: 'beta.test@example.com',
      client_phone: '+1 555-0202',
      service_type: 'MOCK_DRIVING_TEST',
      instructor_name: 'Sarah Jenkins (Grade A)',
      date: testDate,
      start_time: testSlot,
      end_time: testSlot === '16:00:00' ? '17:00:00' : '18:00:00',
      notes: 'Concurrency Test Agent Beta'
    };

    // Fire both requests simultaneously to test database lock & race condition handling
    const startTimestamp = performance.now();

    const [resA, resB] = await Promise.all([
      createAppointment(bookingPayloadA).then(
        data => ({ success: true, status: 201, data }),
        err => ({ success: false, status: err.status || 409, message: err.message, payload: err.payload })
      ),
      createAppointment(bookingPayloadB).then(
        data => ({ success: true, status: 201, data }),
        err => ({ success: false, status: err.status || 409, message: err.message, payload: err.payload })
      )
    ]);

    const elapsed = Math.round(performance.now() - startTimestamp);

    setResults({
      elapsed,
      userA: resA,
      userB: resB
    });

    setIsRunning(false);
    onRefreshAll();
  };

  return (
    <div className="content-panel" id="conflict-simulator-panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">
            <Zap size={22} className="text-warning" />
            <span>Double Booking & Concurrency Conflict Tester</span>
          </h2>
          <p className="panel-subtitle">
            Directly test the race condition barrier by firing simultaneous booking requests for the exact same slot
          </p>
        </div>
      </div>

      <div className="simulator-box">
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '18px' }}>
          This simulator launches <strong>two simultaneous HTTP POST requests</strong> at the exact same millisecond requesting the exact same slot. 
          The backend leverages <code>transaction.atomic()</code>, <code>select_for_update()</code>, and database unique constraints to ensure only <strong>one</strong> request wins, while the other is rejected with <strong>HTTP 409 Conflict</strong>.
        </p>

        <div className="form-row" style={{ maxWidth: '520px', marginBottom: '20px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Test Date:</label>
            <input
              type="date"
              className="form-input"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Target Slot:</label>
            <select
              className="form-select"
              value={testSlot}
              onChange={(e) => setTestSlot(e.target.value)}
            >
              <option value="09:00:00">09:00 AM - 10:00 AM</option>
              <option value="12:00:00">12:00 PM - 01:00 PM</option>
              <option value="15:00:00">03:00 PM - 04:00 PM</option>
              <option value="16:00:00">04:00 PM - 05:00 PM</option>
              <option value="17:00:00">05:00 PM - 06:00 PM</option>
            </select>
          </div>
        </div>

        <button
          id="btn-run-concurrency-test"
          className="btn btn-primary"
          onClick={runConcurrencyTest}
          disabled={isRunning}
        >
          <Zap size={16} />
          {isRunning ? 'Firing Parallel Requests...' : 'Trigger Simultaneous Booking Test'}
        </button>

        {/* Results view */}
        {results && (
          <div className="simulator-results" id="simulator-results">
            {/* User A Result */}
            <div className={`sim-result-card ${results.userA.success ? 'success' : 'conflict'}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                {results.userA.success ? (
                  <CheckCircle size={20} className="text-success" />
                ) : (
                  <AlertOctagon size={20} className="text-danger" />
                )}
                <strong>Request 1 (User Alpha)</strong>
                <span className={`badge ${results.userA.success ? 'badge-available' : 'badge-cancelled'}`}>
                  {results.userA.success ? '201 CREATED' : `${results.userA.status} CONFLICT`}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {results.userA.success
                  ? `Successfully booked Appointment #${results.userA.data.id} on ${testDate} at ${testSlot.slice(0, 5)}`
                  : `Conflict detected: ${results.userA.message}`}
              </p>
            </div>

            {/* User B Result */}
            <div className={`sim-result-card ${results.userB.success ? 'success' : 'conflict'}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                {results.userB.success ? (
                  <CheckCircle size={20} className="text-success" />
                ) : (
                  <AlertOctagon size={20} className="text-danger" />
                )}
                <strong>Request 2 (User Beta)</strong>
                <span className={`badge ${results.userB.success ? 'badge-available' : 'badge-cancelled'}`}>
                  {results.userB.success ? '201 CREATED' : `${results.userB.status} CONFLICT`}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {results.userB.success
                  ? `Successfully booked Appointment #${results.userB.data.id} on ${testDate} at ${testSlot.slice(0, 5)}`
                  : `Conflict detected: ${results.userB.message}`}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
