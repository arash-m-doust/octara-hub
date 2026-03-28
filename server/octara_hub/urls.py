from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    # Django admin for operational/debug management.
    path('admin/', admin.site.urls),

    # API surface grouped by domain app.
    path('api/auth/', include('apps.authentication.urls')),
    path('api/workspaces/', include('apps.workspaces.urls')),
    path('api/channels/', include('apps.messaging.urls')),
    path('api/dm/', include('apps.dm.urls')),
    path('api/files/', include('apps.files.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/search/', include('apps.search.urls')),
    path('api/calls/', include('apps.calls.urls')),
    path('api/realtime/', include('realtime.urls')),
]
