import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import StatsBar from './components/StatsBar';
import SlotExplorer from './components/SlotExplorer';
import AppointmentsList from './components/AppointmentsList';
import ConflictSimulator from './components/ConflictSimulator';
import BookingModal from './components/BookingModal';
import CancelModal from './components/CancelModal';
import Toast from './components/Toast';

import {
  getAvailableSlots,
  getAppointments,
  getStats,
  updateAppointmentStatus
} from './api';

import { Calendar, Users, Zap } from 'lucide-react';
import './App.css';

export default function App() {
  const todayStr = new Date().toISOString().split('T')[0];

  // Active view tab: 'slots', 'appointments', 'conflicts'
  const [activeTab, setActiveTab] = useState('slots');

  // Selected date for slot explorer
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Data states
  const [slotsData, setSlotsData] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState(null);

  // Filter states for appointments tab
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Loading states
  const [isSlotsLoading, setIsSlotsLoading] = useState(false);
  const [isApptsLoading, setIsApptsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal states
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingSlotContext, setBookingSlotContext] = useState(null);
  const [cancelModalAppointment, setCancelModalAppointment] = useState(null);

  // Toast notifications
  const [toasts, setToasts] = useState([]);

  const addToast = (type, title, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch slots for current selected date
  const loadSlots = useCallback(async (date) => {
    setIsSlotsLoading(true);
    try {
      const data = await getAvailableSlots(date);
      setSlotsData(data);
    } catch (err) {
      console.error('Failed to load slots:', err);
      addToast('error', 'Error Loading Slots', err.message);
    } finally {
      setIsSlotsLoading(false);
    }
  }, []);

  // Fetch appointments list
  const loadAppointments = useCallback(async () => {
    setIsApptsLoading(true);
    try {
      const data = await getAppointments({
        status: statusFilter,
        search: searchQuery,
      });
      setAppointments(data);
    } catch (err) {
      console.error('Failed to load appointments:', err);
      addToast('error', 'Error Loading Appointments', err.message);
    } finally {
      setIsApptsLoading(false);
    }
  }, [statusFilter, searchQuery]);

  // Fetch stats
  const loadStats = useCallback(async () => {
    try {
      const data = await getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, []);

  // Master refresh
  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      loadSlots(selectedDate),
      loadAppointments(),
      loadStats(),
    ]);
    setIsRefreshing(false);
  }, [selectedDate, loadSlots, loadAppointments, loadStats]);

  // Initial load
  useEffect(() => {
    refreshAll();
  }, []);

  // When selectedDate changes, reload slots
  useEffect(() => {
    loadSlots(selectedDate);
  }, [selectedDate, loadSlots]);

  // When filters change, reload appointments
  useEffect(() => {
    loadAppointments();
  }, [statusFilter, searchQuery, loadAppointments]);

  // Handlers
  const handleOpenBooking = (slot = null) => {
    setBookingSlotContext(slot);
    setIsBookingModalOpen(true);
  };

  const handleBookingSuccess = (newAppt) => {
    addToast(
      'success',
      'Appointment Booked!',
      `Scheduled with ${newAppt.client_name} on ${newAppt.date} (${newAppt.formatted_time || newAppt.start_time}).`
    );
    refreshAll();
  };

  const handleCancellationSuccess = (res) => {
    addToast(
      'info',
      'Appointment Cancelled',
      res.message || 'Appointment has been cancelled and time slot is now available.'
    );
    refreshAll();
  };

  const handleMarkCompleted = async (apptId) => {
    try {
      await updateAppointmentStatus(apptId, 'COMPLETED');
      addToast('success', 'Lesson Completed', `Appointment #${apptId} marked as completed.`);
      refreshAll();
    } catch (err) {
      addToast('error', 'Update Failed', err.message);
    }
  };

  return (
    <div className="app-container">
      {/* Top Header */}
      <Navbar
        onOpenBooking={() => handleOpenBooking(null)}
        onRefresh={refreshAll}
        isRefreshing={isRefreshing}
      />

      {/* Stats Summary Bar */}
      <StatsBar stats={stats} />

      {/* Navigation Tabs */}
      <nav className="tabs-nav" id="navigation-tabs">
        <button
          id="tab-slots"
          className={`tab-btn ${activeTab === 'slots' ? 'active' : ''}`}
          onClick={() => setActiveTab('slots')}
        >
          <Calendar size={16} />
          <span>Available Slots & Booking</span>
        </button>

        <button
          id="tab-appointments"
          className={`tab-btn ${activeTab === 'appointments' ? 'active' : ''}`}
          onClick={() => setActiveTab('appointments')}
        >
          <Users size={16} />
          <span>Appointments Directory</span>
        </button>

        <button
          id="tab-conflicts"
          className={`tab-btn ${activeTab === 'conflicts' ? 'active' : ''}`}
          onClick={() => setActiveTab('conflicts')}
        >
          <Zap size={16} />
          <span>Conflict & Race Condition Tester</span>
        </button>
      </nav>

      {/* Main View Contents */}
      {activeTab === 'slots' && (
        <SlotExplorer
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          slotsData={slotsData}
          isLoading={isSlotsLoading}
          onBookSlot={(slot) => handleOpenBooking(slot)}
        />
      )}

      {activeTab === 'appointments' && (
        <AppointmentsList
          appointments={appointments}
          isLoading={isApptsLoading}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenCancelModal={(appt) => setCancelModalAppointment(appt)}
          onMarkCompleted={handleMarkCompleted}
        />
      )}

      {activeTab === 'conflicts' && (
        <ConflictSimulator onRefreshAll={refreshAll} />
      )}

      {/* Booking Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setBookingSlotContext(null);
        }}
        initialDate={selectedDate}
        initialSlot={bookingSlotContext}
        onBookingSuccess={handleBookingSuccess}
      />

      {/* Cancel Confirmation Modal */}
      <CancelModal
        isOpen={Boolean(cancelModalAppointment)}
        onClose={() => setCancelModalAppointment(null)}
        appointment={cancelModalAppointment}
        onCancellationSuccess={handleCancellationSuccess}
      />

      {/* Toast Notifications */}
      <Toast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
