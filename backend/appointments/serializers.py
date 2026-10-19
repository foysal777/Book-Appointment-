import datetime
from rest_framework import serializers
from django.utils import timezone
from .models import Appointment, AppointmentStatus, ServiceType

class AppointmentSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    service_type_display = serializers.CharField(source='get_service_type_display', read_only=True)
    formatted_time = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = [
            'id',
            'client_name',
            'client_email',
            'client_phone',
            'service_type',
            'service_type_display',
            'instructor_name',
            'date',
            'start_time',
            'end_time',
            'formatted_time',
            'status',
            'status_display',
            'cancellation_reason',
            'notes',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_formatted_time(self, obj):
        st = obj.start_time.strftime("%I:%M %p")
        et = obj.end_time.strftime("%I:%M %p")
        return f"{st} - {et}"


class AppointmentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = [
            'id',
            'client_name',
            'client_email',
            'client_phone',
            'service_type',
            'instructor_name',
            'date',
            'start_time',
            'end_time',
            'notes',
            'status'
        ]
        read_only_fields = ['id', 'status']

    def validate_client_name(self, value):
        cleaned = value.strip()
        if len(cleaned) < 2:
            raise serializers.ValidationError("Client name must be at least 2 characters long.")
        return cleaned

    def validate_client_phone(self, value):
        cleaned = value.strip()
        if len(cleaned) < 7:
            raise serializers.ValidationError("Please provide a valid phone number with at least 7 digits.")
        return cleaned

    def validate(self, attrs):
        target_date = attrs.get('date')
        start_time = attrs.get('start_time')
        end_time = attrs.get('end_time')

        # If end_time is not provided, default to 1 hour after start_time
        if not end_time and start_time:
            # calculate 1 hour later
            dt_start = datetime.datetime.combine(datetime.date.today(), start_time)
            dt_end = dt_start + datetime.timedelta(hours=1)
            end_time = dt_end.time()
            attrs['end_time'] = end_time

        today = timezone.localdate()
        now_time = timezone.localtime().time()

        # 1. Past date check
        if target_date < today:
            raise serializers.ValidationError({
                "date": f"Cannot book appointments in the past. Today is {today.isoformat()}."
            })

        # 2. Past time check for current date
        if target_date == today and start_time <= now_time:
            raise serializers.ValidationError({
                "start_time": f"Cannot book a past time slot for today ({start_time.strftime('%H:%M')} has already passed)."
            })

        # 3. Start time before end time check
        if start_time and end_time and start_time >= end_time:
            raise serializers.ValidationError({
                "end_time": "Appointment end time must be after start time."
            })

        # 4. Double booking conflict check (Active appointments only)
        conflict_exists = Appointment.objects.filter(
            date=target_date,
            start_time=start_time
        ).exclude(status=AppointmentStatus.CANCELLED).exists()

        if conflict_exists:
            raise serializers.ValidationError({
                "conflict": f"The slot on {target_date.isoformat()} at {start_time.strftime('%H:%M')} is already booked. Please choose another time slot."
            })

        return attrs


class CancelAppointmentSerializer(serializers.Serializer):
    cancellation_reason = serializers.CharField(
        required=False,
        allow_blank=True,
        default="Cancelled by client/admin"
    )

    def validate(self, attrs):
        appointment = self.context.get('appointment')
        if not appointment:
            raise serializers.ValidationError("Appointment not found.")
        if appointment.status == AppointmentStatus.CANCELLED:
            raise serializers.ValidationError("This appointment is already cancelled.")
        return attrs


class UpdateStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=AppointmentStatus.choices)
    cancellation_reason = serializers.CharField(required=False, allow_blank=True)
