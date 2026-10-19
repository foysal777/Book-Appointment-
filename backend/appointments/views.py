import datetime
from django.db import transaction, IntegrityError
from django.utils import timezone
from django.db.models import Q, Count
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.generics import ListCreateAPIView, RetrieveAPIView

from .models import Appointment, AppointmentStatus, ServiceType
from .serializers import (
    AppointmentSerializer,
    AppointmentCreateSerializer,
    CancelAppointmentSerializer,
    UpdateStatusSerializer
)
from .slots import get_slots_for_date

class AvailableSlotsView(APIView):
    """
    GET /api/available-slots/?date=YYYY-MM-DD
    Returns all defined time slots for the requested date, marking each as available,
    already booked, or past.
    """
    def get(self, request):
        date_str = request.query_params.get('date')
        if not date_str:
            target_date = timezone.localdate()
        else:
            try:
                target_date = datetime.date.fromisoformat(date_str)
            except ValueError:
                return Response(
                    {"error": "Invalid date format. Expected YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        slots = get_slots_for_date(target_date)
        total_slots = len(slots)
        available_count = sum(1 for s in slots if s['is_available'])
        booked_count = sum(1 for s in slots if s['is_booked'])
        past_count = sum(1 for s in slots if s['is_past'])

        return Response({
            "date": target_date.isoformat(),
            "formatted_date": target_date.strftime("%A, %B %d, %Y"),
            "is_past_date": target_date < timezone.localdate(),
            "is_today": target_date == timezone.localdate(),
            "summary": {
                "total_slots": total_slots,
                "available": available_count,
                "booked": booked_count,
                "past": past_count
            },
            "slots": slots
        }, status=status.HTTP_200_OK)


class AppointmentListCreateView(APIView):
    """
    GET /api/appointments/ - List appointments with optional filtering
    POST /api/appointments/ - Create a new appointment with concurrency conflict protection
    """
    def get(self, request):
        queryset = Appointment.objects.all().order_by('-date', 'start_time')

        # Filter by status
        status_param = request.query_params.get('status')
        if status_param and status_param.upper() in AppointmentStatus.values:
            queryset = queryset.filter(status=status_param.upper())

        # Filter by date
        date_param = request.query_params.get('date')
        if date_param:
            try:
                filter_date = datetime.date.fromisoformat(date_param)
                queryset = queryset.filter(date=filter_date)
            except ValueError:
                return Response(
                    {"error": "Invalid date format in query parameter. Expected YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Search by client name, email, or phone
        search_query = request.query_params.get('search')
        if search_query:
            queryset = queryset.filter(
                Q(client_name__icontains=search_query) |
                Q(client_email__icontains=search_query) |
                Q(client_phone__icontains=search_query) |
                Q(notes__icontains=search_query)
            )

        serializer = AppointmentSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = AppointmentCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        validated_data = serializer.validated_data
        target_date = validated_data['date']
        start_time = validated_data['start_time']

        # Enforce atomic transaction and lock checking to prevent race condition double bookings
        try:
            with transaction.atomic():
                # Lock existing active appointments for this slot to avoid concurrency race
                existing_conflict = Appointment.objects.select_for_update().filter(
                    date=target_date,
                    start_time=start_time
                ).exclude(status=AppointmentStatus.CANCELLED).exists()

                if existing_conflict:
                    return Response({
                        "error": "Double booking conflict detected.",
                        "detail": f"The slot on {target_date} at {start_time.strftime('%H:%M')} was just booked by another user."
                    }, status=status.HTTP_409_CONFLICT)

                appointment = serializer.save(status=AppointmentStatus.BOOKED)

            output_serializer = AppointmentSerializer(appointment)
            return Response(output_serializer.data, status=status.HTTP_201_CREATED)

        except IntegrityError:
            return Response({
                "error": "Booking Conflict",
                "detail": "Database constraint prevented duplicate active booking for this time slot."
            }, status=status.HTTP_409_CONFLICT)


class AppointmentDetailView(APIView):
    """
    GET /api/appointments/<int:pk>/
    DELETE /api/appointments/<int:pk>/
    """
    def get_object(self, pk):
        try:
            return Appointment.objects.get(pk=pk)
        except Appointment.DoesNotExist:
            return None

    def get(self, request, pk):
        appointment = self.get_object(pk)
        if not appointment:
            return Response({"error": "Appointment not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = AppointmentSerializer(appointment)
        return Response(serializer.data)

    def delete(self, request, pk):
        appointment = self.get_object(pk)
        if not appointment:
            return Response({"error": "Appointment not found."}, status=status.HTTP_404_NOT_FOUND)
        appointment.delete()
        return Response({"message": "Appointment deleted successfully."}, status=status.HTTP_204_NO_CONTENT)


class CancelAppointmentView(APIView):
    """
    POST /api/appointments/<int:pk>/cancel/
    Cancels an existing appointment and frees up its time slot.
    """
    def post(self, request, pk):
        try:
            appointment = Appointment.objects.get(pk=pk)
        except Appointment.DoesNotExist:
            return Response({"error": "Appointment not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = CancelAppointmentSerializer(data=request.data, context={'appointment': appointment})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        reason = serializer.validated_data.get('cancellation_reason', 'Cancelled by user')
        appointment.status = AppointmentStatus.CANCELLED
        appointment.cancellation_reason = reason
        appointment.save()

        return Response({
            "message": f"Appointment #{appointment.id} has been cancelled successfully. Time slot is now available.",
            "appointment": AppointmentSerializer(appointment).data
        }, status=status.HTTP_200_OK)


class UpdateAppointmentStatusView(APIView):
    """
    PATCH /api/appointments/<int:pk>/status/
    Updates the status of an appointment (e.g. COMPLETED, CANCELLED, BOOKED)
    """
    def patch(self, request, pk):
        try:
            appointment = Appointment.objects.get(pk=pk)
        except Appointment.DoesNotExist:
            return Response({"error": "Appointment not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = UpdateStatusSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        new_status = serializer.validated_data['status']
        cancellation_reason = serializer.validated_data.get('cancellation_reason')

        # If changing from CANCELLED back to BOOKED, verify that slot hasn't been claimed!
        if appointment.status == AppointmentStatus.CANCELLED and new_status == AppointmentStatus.BOOKED:
            conflict = Appointment.objects.filter(
                date=appointment.date,
                start_time=appointment.start_time
            ).exclude(pk=appointment.pk).exclude(status=AppointmentStatus.CANCELLED).exists()
            if conflict:
                return Response({
                    "error": "Slot is no longer available.",
                    "detail": "Another active booking already occupies this time slot."
                }, status=status.HTTP_409_CONFLICT)

        appointment.status = new_status
        if cancellation_reason:
            appointment.cancellation_reason = cancellation_reason
        elif new_status != AppointmentStatus.CANCELLED:
            # clear cancellation reason if status changed back or completed
            appointment.cancellation_reason = None

        appointment.save()

        return Response({
            "message": f"Appointment status updated to {new_status}.",
            "appointment": AppointmentSerializer(appointment).data
        }, status=status.HTTP_200_OK)


class AppointmentStatsView(APIView):
    """
    GET /api/stats/
    Provides high-level dashboard metrics on appointments and statuses.
    """
    def get(self, request):
        today = timezone.localdate()
        
        total = Appointment.objects.count()
        booked = Appointment.objects.filter(status=AppointmentStatus.BOOKED).count()
        completed = Appointment.objects.filter(status=AppointmentStatus.COMPLETED).count()
        cancelled = Appointment.objects.filter(status=AppointmentStatus.CANCELLED).count()

        today_appointments = Appointment.objects.filter(date=today).count()
        upcoming_active = Appointment.objects.filter(
            date__gte=today,
            status=AppointmentStatus.BOOKED
        ).count()

        # Breakdown by service
        services_breakdown = list(
            Appointment.objects.values('service_type').annotate(count=Count('id'))
        )

        return Response({
            "total_appointments": total,
            "booked_appointments": booked,
            "completed_appointments": completed,
            "cancelled_appointments": cancelled,
            "today_appointments": today_appointments,
            "upcoming_active_appointments": upcoming_active,
            "services_breakdown": services_breakdown,
            "current_date": today.isoformat()
        }, status=status.HTTP_200_OK)


class SeedDemoDataView(APIView):
    """
    POST /api/seed-demo/
    Populates sample driving appointments for testing and demonstration.
    """
    def post(self, request):
        today = timezone.localdate()
        tomorrow = today + datetime.timedelta(days=1)
        day_after = today + datetime.timedelta(days=2)

        # Clear demo data if requested
        reset = request.data.get('reset', False)
        if reset:
            Appointment.objects.all().delete()

        created_count = 0
        sample_data = [
            # Tomorrow appointments
            {
                "client_name": "Sophia Bennett",
                "client_email": "sophia.b@example.com",
                "client_phone": "+1 555-0192",
                "service_type": ServiceType.STANDARD_LESSON,
                "instructor_name": "Alex Carter (Senior ADI)",
                "date": tomorrow,
                "start_time": datetime.time(9, 0),
                "end_time": datetime.time(10, 0),
                "status": AppointmentStatus.BOOKED,
                "notes": "Beginner lesson, focus on clutch control and roundabouts."
            },
            {
                "client_name": "Marcus Vance",
                "client_email": "marcus.v@example.com",
                "client_phone": "+1 555-0144",
                "service_type": ServiceType.MOCK_DRIVING_TEST,
                "instructor_name": "Sarah Jenkins (Grade A)",
                "date": tomorrow,
                "start_time": datetime.time(11, 0),
                "end_time": datetime.time(12, 0),
                "status": AppointmentStatus.BOOKED,
                "notes": "Mock test evaluation before DVSA exam next week."
            },
            {
                "client_name": "David Miller",
                "client_email": "david.m@example.com",
                "client_phone": "+1 555-0188",
                "service_type": ServiceType.HIGHWAY_TRAINING,
                "instructor_name": "Alex Carter (Senior ADI)",
                "date": tomorrow,
                "start_time": datetime.time(14, 0),
                "end_time": datetime.time(15, 0),
                "status": AppointmentStatus.CANCELLED,
                "cancellation_reason": "Client caught flu, rescheduled for next weekend.",
                "notes": "Dual carriageway merging and speed management."
            },
            # Day after tomorrow
            {
                "client_name": "Elena Rostova",
                "client_email": "elena.r@example.com",
                "client_phone": "+1 555-0177",
                "service_type": ServiceType.PARKING_REFRESHER,
                "instructor_name": "Sarah Jenkins (Grade A)",
                "date": day_after,
                "start_time": datetime.time(10, 0),
                "end_time": datetime.time(11, 0),
                "status": AppointmentStatus.BOOKED,
                "notes": "Parallel parking and bay parking reverse maneuvers."
            },
            {
                "client_name": "Liam Henderson",
                "client_email": "liam.h@example.com",
                "client_phone": "+1 555-0133",
                "service_type": ServiceType.ROAD_TEST_CAR_HIRE,
                "instructor_name": "Alex Carter (Senior ADI)",
                "date": day_after,
                "start_time": datetime.time(13, 0),
                "end_time": datetime.time(14, 0),
                "status": AppointmentStatus.BOOKED,
                "notes": "Car hire with dual controls for practical test."
            }
        ]

        for item in sample_data:
            exists = Appointment.objects.filter(
                date=item['date'],
                start_time=item['start_time']
            ).exists()
            if not exists:
                Appointment.objects.create(**item)
                created_count += 1

        return Response({
            "message": f"Successfully seeded {created_count} demo appointments.",
            "total_now": Appointment.objects.count()
        }, status=status.HTTP_201_CREATED)
