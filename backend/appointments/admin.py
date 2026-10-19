from django.contrib import admin
from .models import Appointment

@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'client_name',
        'client_phone',
        'service_type',
        'date',
        'start_time',
        'end_time',
        'status',
        'instructor_name',
        'created_at'
    )
    list_filter = ('status', 'service_type', 'date', 'instructor_name')
    search_fields = ('client_name', 'client_email', 'client_phone', 'notes', 'cancellation_reason')
    date_hierarchy = 'date'
    ordering = ('-date', 'start_time')
    readonly_fields = ('created_at', 'updated_at')
