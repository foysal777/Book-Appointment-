from django.urls import path
from .views import (
    AvailableSlotsView,
    AppointmentListCreateView,
    AppointmentDetailView,
    CancelAppointmentView,
    UpdateAppointmentStatusView,
    AppointmentStatsView,
    SeedDemoDataView
)

urlpatterns = [
    path('available-slots/', AvailableSlotsView.as_view(), name='available-slots'),
    path('appointments/', AppointmentListCreateView.as_view(), name='appointment-list-create'),
    path('appointments/<int:pk>/', AppointmentDetailView.as_view(), name='appointment-detail'),
    path('appointments/<int:pk>/cancel/', CancelAppointmentView.as_view(), name='appointment-cancel'),
    path('appointments/<int:pk>/status/', UpdateAppointmentStatusView.as_view(), name='appointment-status-update'),
    path('stats/', AppointmentStatsView.as_view(), name='appointment-stats'),
    path('seed-demo/', SeedDemoDataView.as_view(), name='seed-demo'),
]
