import datetime
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from appointments.models import Appointment, AppointmentStatus, ServiceType

class AppointmentBookingTests(APITestCase):
    def setUp(self):
        self.today = timezone.localdate()
        self.future_date = self.today + datetime.timedelta(days=3)
        self.past_date = self.today - datetime.timedelta(days=2)

    def test_get_available_slots(self):
        """Test fetching available slots for a future date returns 9 slots and all available initially."""
        url = reverse('available-slots') + f"?date={self.future_date.isoformat()}"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("slots", response.data)
        self.assertEqual(len(response.data["slots"]), 9)
        self.assertEqual(response.data["summary"]["available"], 9)
        self.assertEqual(response.data["summary"]["booked"], 0)

    def test_create_appointment_success(self):
        """Test successful booking of an appointment in an available time slot."""
        url = reverse('appointment-list-create')
        data = {
            "client_name": "John Doe",
            "client_email": "john.doe@example.com",
            "client_phone": "+1 234 567 8900",
            "service_type": ServiceType.STANDARD_LESSON,
            "instructor_name": "Alex Carter (Senior ADI)",
            "date": self.future_date.isoformat(),
            "start_time": "10:00:00",
            "end_time": "11:00:00",
            "notes": "First driving lesson"
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["client_name"], "John Doe")
        self.assertEqual(response.data["status"], AppointmentStatus.BOOKED)

        # Check that slot is now booked in available slots
        slots_url = reverse('available-slots') + f"?date={self.future_date.isoformat()}"
        slots_response = self.client.get(slots_url)
        slot_10 = next(s for s in slots_response.data["slots"] if s["start_time"] == "10:00")
        self.assertFalse(slot_10["is_available"])
        self.assertTrue(slot_10["is_booked"])

    def test_prevent_double_booking(self):
        """Test that booking the same time slot twice is strictly rejected."""
        url = reverse('appointment-list-create')
        data_first = {
            "client_name": "First Booker",
            "client_email": "first@example.com",
            "client_phone": "+1 234 567 8901",
            "date": self.future_date.isoformat(),
            "start_time": "14:00:00",
            "end_time": "15:00:00",
        }
        res1 = self.client.post(url, data_first, format='json')
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        # Second booking for identical date & time slot
        data_second = {
            "client_name": "Second Booker",
            "client_email": "second@example.com",
            "client_phone": "+1 234 567 8902",
            "date": self.future_date.isoformat(),
            "start_time": "14:00:00",
            "end_time": "15:00:00",
        }
        res2 = self.client.post(url, data_second, format='json')
        self.assertIn(res2.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_409_CONFLICT])

    def test_prevent_past_date_booking(self):
        """Test that attempting to book a past date is rejected with validation error."""
        url = reverse('appointment-list-create')
        data = {
            "client_name": "Past Booker",
            "client_email": "past@example.com",
            "client_phone": "+1 234 567 8903",
            "date": self.past_date.isoformat(),
            "start_time": "10:00:00",
            "end_time": "11:00:00",
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("date", response.data)

    def test_cancel_appointment_and_free_slot(self):
        """Test cancelling an appointment changes status and frees the time slot."""
        # Book an appointment
        appt = Appointment.objects.create(
            client_name="Cancel Test",
            client_email="cancel@example.com",
            client_phone="+1 234 567 8904",
            date=self.future_date,
            start_time=datetime.time(15, 0),
            end_time=datetime.time(16, 0),
            status=AppointmentStatus.BOOKED
        )

        cancel_url = reverse('appointment-cancel', kwargs={'pk': appt.pk})
        cancel_response = self.client.post(cancel_url, {"cancellation_reason": "Emergency conflict"}, format='json')
        self.assertEqual(cancel_response.status_code, status.HTTP_200_OK)
        appt.refresh_from_db()
        self.assertEqual(appt.status, AppointmentStatus.CANCELLED)
        self.assertEqual(appt.cancellation_reason, "Emergency conflict")

        # Verify the slot is available again for someone else!
        slots_url = reverse('available-slots') + f"?date={self.future_date.isoformat()}"
        slots_response = self.client.get(slots_url)
        slot_15 = next(s for s in slots_response.data["slots"] if s["start_time"] == "15:00")
        self.assertTrue(slot_15["is_available"])
        self.assertFalse(slot_15["is_booked"])

    def test_update_status_to_completed(self):
        """Test marking appointment as completed."""
        appt = Appointment.objects.create(
            client_name="Completion Test",
            client_email="comp@example.com",
            client_phone="+1 234 567 8905",
            date=self.future_date,
            start_time=datetime.time(16, 0),
            end_time=datetime.time(17, 0),
            status=AppointmentStatus.BOOKED
        )
        status_url = reverse('appointment-status-update', kwargs={'pk': appt.pk})
        patch_response = self.client.patch(status_url, {"status": AppointmentStatus.COMPLETED}, format='json')
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        appt.refresh_from_db()
        self.assertEqual(appt.status, AppointmentStatus.COMPLETED)
