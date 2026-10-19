from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.db.models import Q
import datetime

class AppointmentStatus(models.TextChoices):
    BOOKED = 'BOOKED', 'Booked'
    CANCELLED = 'CANCELLED', 'Cancelled'
    COMPLETED = 'COMPLETED', 'Completed'

class ServiceType(models.TextChoices):
    STANDARD_LESSON = 'STANDARD_LESSON', 'Standard Driving Lesson (1h)'
    MOCK_DRIVING_TEST = 'MOCK_DRIVING_TEST', 'Mock Driving Test & Assessment (1h)'
    HIGHWAY_TRAINING = 'HIGHWAY_TRAINING', 'Highway & Dual Carriageway (1h)'
    PARKING_REFRESHER = 'PARKING_REFRESHER', 'Maneuvers & Parallel Parking (1h)'
    ROAD_TEST_CAR_HIRE = 'ROAD_TEST_CAR_HIRE', 'Official Road Test Car Hire (1h)'

class Appointment(models.Model):
    client_name = models.CharField(max_length=120, help_text="Full name of student/client")
    client_email = models.EmailField(help_text="Contact email address")
    client_phone = models.CharField(max_length=30, help_text="Contact phone number")
    
    service_type = models.CharField(
        max_length=50,
        choices=ServiceType.choices,
        default=ServiceType.STANDARD_LESSON,
        help_text="Selected driving service"
    )
    instructor_name = models.CharField(
        max_length=100,
        default='Alex Carter (Senior ADI)',
        help_text="Assigned driving instructor"
    )
    
    date = models.DateField(db_index=True, help_text="Appointment date")
    start_time = models.TimeField(help_text="Start time (e.g. 09:00:00)")
    end_time = models.TimeField(help_text="End time (e.g. 10:00:00)")
    
    status = models.CharField(
        max_length=20,
        choices=AppointmentStatus.choices,
        default=AppointmentStatus.BOOKED,
        db_index=True
    )
    
    cancellation_reason = models.TextField(blank=True, null=True, help_text="Reason for cancellation if applicable")
    notes = models.TextField(blank=True, null=True, help_text="Additional student notes or pickup address")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['date', 'start_time']
        verbose_name = 'Appointment'
        verbose_name_plural = 'Appointments'
        constraints = [
            # Ensure no two active appointments can have the same date and start_time
            models.UniqueConstraint(
                fields=['date', 'start_time'],
                condition=~Q(status='CANCELLED'),
                name='unique_active_appointment_slot'
            )
        ]

    def __str__(self):
        return f"{self.date} {self.start_time.strftime('%H:%M')} - {self.client_name} ({self.status})"

    def clean(self):
        super().clean()
        
        # 1. Validate date & past times (only enforced on newly created or non-cancelled bookings)
        if self.status != AppointmentStatus.CANCELLED:
            today = timezone.localdate()
            if self.date < today:
                raise ValidationError({'date': 'Appointments cannot be booked for past dates.'})
            
            if self.date == today:
                now_time = timezone.localtime().time()
                if self.start_time <= now_time:
                    raise ValidationError({'start_time': 'Appointments cannot be booked for past time slots today.'})

        # 2. Validate start_time and end_time order
        if self.start_time >= self.end_time:
            raise ValidationError({'end_time': 'End time must be after start time.'})

        # 3. Check for double booking conflicts in active appointments
        existing_conflict = Appointment.objects.filter(
            date=self.date,
            start_time=self.start_time
        ).exclude(status=AppointmentStatus.CANCELLED)

        if self.pk:
            existing_conflict = existing_conflict.exclude(pk=self.pk)

        if existing_conflict.exists():
            raise ValidationError(
                {'non_field_errors': f'The slot on {self.date} at {self.start_time.strftime("%H:%M")} is already booked.'}
            )
