import datetime
from django.utils import timezone
from .models import Appointment, AppointmentStatus

# Default operating hours: 9:00 AM to 6:00 PM (1-hour slots)
OPERATING_SLOTS = [
    ("09:00", "10:00", "09:00 AM - 10:00 AM"),
    ("10:00", "11:00", "10:00 AM - 11:00 AM"),
    ("11:00", "12:00", "11:00 AM - 12:00 PM"),
    ("12:00", "13:00", "12:00 PM - 01:00 PM"),
    ("13:00", "14:00", "01:00 PM - 02:00 PM"),
    ("14:00", "15:00", "02:00 PM - 03:00 PM"),
    ("15:00", "16:00", "03:00 PM - 04:00 PM"),
    ("16:00", "17:00", "04:00 PM - 05:00 PM"),
    ("17:00", "18:00", "05:00 PM - 06:00 PM"),
]

def get_slots_for_date(target_date: datetime.date):
    """
    Returns all defined time slots for target_date with their current status:
    available, booked, or past.
    """
    today = timezone.localdate()
    now_time = timezone.localtime().time()

    is_past_date = target_date < today
    is_today = target_date == today

    # Fetch all active (non-cancelled) appointments on this date
    active_appointments = Appointment.objects.filter(
        date=target_date
    ).exclude(status=AppointmentStatus.CANCELLED)

    booked_slots_map = {}
    for appt in active_appointments:
        start_str = appt.start_time.strftime("%H:%M")
        booked_slots_map[start_str] = {
            "id": appt.id,
            "client_name": appt.client_name,
            "service_type": appt.service_type,
            "status": appt.status,
            "instructor_name": appt.instructor_name
        }

    results = []
    for start_str, end_str, label in OPERATING_SLOTS:
        slot_time = datetime.datetime.strptime(start_str, "%H:%M").time()
        
        is_past_slot = is_past_date or (is_today and slot_time <= now_time)
        is_booked = start_str in booked_slots_map
        is_available = (not is_past_slot) and (not is_booked)

        booking_info = booked_slots_map.get(start_str)

        results.append({
            "slot_key": f"{target_date.isoformat()}_{start_str}",
            "start_time": start_str,
            "end_time": end_str,
            "label": label,
            "is_available": is_available,
            "is_past": is_past_slot,
            "is_booked": is_booked,
            "appointment": booking_info if is_booked else None
        })

    return results
