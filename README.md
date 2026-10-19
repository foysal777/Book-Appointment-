# SK Driving School — Appointment Booking System

An appointment scheduling and slot management system designed to manage bookings, check real-time availability, and prevent scheduling conflicts.

Built with:
- **Backend:** Python 3, Django 6, Django REST Framework, SQLite (with transactions & database constraints)
- **Frontend:** React 19, Vite, Vanilla CSS Design System, Lucide Icons

---

## Key Features

1. **Available Slots Explorer:**
   - Real-time time slot availability calculation (`09:00 AM` to `06:00 PM` in 1-hour slots).
   - Date picker with quick presets (*Today*, *Tomorrow*, *In 2 Days*, or custom date).
   - Past date & time slot validation (past dates and passed time slots are automatically locked).

2. **Appointment Booking Flow:**
   - Interactive modal with service selection (*Standard Driving Lesson*, *Mock Driving Test*, *Highway Training*, *Parking Refresher*, *Road Test Car Hire*).
   - Instructor assignment (*Alex Carter*, *Sarah Jenkins*, *David Lee*).
   - Input validation for student name, email, phone number, and learner notes.

3. **Double Booking & Race Condition Prevention:**
   - Atomic database transactions (`transaction.atomic()`).
   - Row-level lock checking (`select_for_update()`).
   - Database-level unique constraint on `(date, start_time)` for active (non-cancelled) bookings.
   - Graceful HTTP 409 Conflict / 400 Bad Request error handling.

4. **Appointment Management & Status Tracking:**
   - Status transitions: `BOOKED`, `COMPLETED`, `CANCELLED`.
   - Real-time search by client name, email, phone, or notes.
   - Filter by status (`ALL`, `BOOKED`, `COMPLETED`, `CANCELLED`).
   - One-click cancellation with cancellation reason recording.
   - **Slot Release:** Cancelling an appointment immediately frees the time slot for other students to book.

5. **Built-in Concurrency & Race Condition Tester:**
   - Dedicated tab in the UI that fires two simultaneous parallel HTTP POST requests at the exact same millisecond.
   - Visual comparison showing one request succeeding (`201 CREATED`) and the duplicate being safely rejected (`409 CONFLICT`).

---

## Project Structure

```
Book Appointment/
├── backend/
│   ├── appointments/          # Django App
│   │   ├── models.py          # Appointment model & UniqueConstraint
│   │   ├── serializers.py     # DRF serializers & validations
│   │   ├── slots.py           # Slot availability generator
│   │   ├── views.py           # API views (Slots, Appointments, Cancel, Stats)
│   │   ├── urls.py            # API routing
│   │   └── tests.py           # Automated unit test suite
│   ├── config/                # Django project settings & root URLs
│   ├── db.sqlite3             # SQLite database
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── components/        # React components (Navbar, SlotExplorer, etc.)
│   │   ├── api.js             # Centralized API service
│   │   ├── App.jsx            # Main application coordinator
│   │   ├── App.css            # Component styles
│   │   └── index.css          # Design system & tokens
│   ├── index.html
│   ├── vite.config.js         # Vite configuration with /api proxy
│   └── package.json
└── venv/                      # Python virtual environment
```

---

## Quick Start & Running Locally

### 1. Backend (Django REST Framework)
The Python virtual environment is located in `./venv`.

```bash
# Activate virtual environment
source venv/bin/activate

# Run database migrations
python backend/manage.py migrate

# Run automated tests
python backend/manage.py test appointments

# Start the Django development server (Port 8000)
python backend/manage.py runserver 0.0.0.0:8000
```

### 2. Frontend (React + Vite)
In a separate terminal:

```bash
cd frontend

# Install dependencies (if not already installed)
npm install

# Start Vite dev server (Port 5173)
npm run dev
```

Open **`http://localhost:5173`** in your browser.

---

## Backend Admin Panel Credentials

You can manage all appointments, instructors, services, and students directly from the Django Admin Panel:

- **Admin URL:** [http://localhost:8000/admin/](http://localhost:8000/admin/)
- **Username:** `admin`
- **Password:** `adminpassword123`
- **Email:** `admin@skdriving.com`

---

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/available-slots/?date=YYYY-MM-DD` | `GET` | Get available, booked, and past time slots for a date |
| `/api/appointments/` | `GET` | List all appointments (filterable by `status`, `date`, `search`) |
| `/api/appointments/` | `POST` | Book a new appointment (validates date/time, checks double booking) |
| `/api/appointments/<id>/` | `GET` | Retrieve appointment details |
| `/api/appointments/<id>/cancel/` | `POST` | Cancel appointment and free up its time slot |
| `/api/appointments/<id>/status/` | `PATCH` | Update status (`BOOKED`, `COMPLETED`, `CANCELLED`) |
| `/api/stats/` | `GET` | Dashboard metrics (total, booked, completed, cancelled) |
| `/api/seed-demo/` | `POST` | Seed realistic demo appointments |
