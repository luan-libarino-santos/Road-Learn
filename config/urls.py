from django.contrib import admin
from django.urls import include, path, re_path

from core.views import BackupDownloadView, spa

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include("api.urls")),
    path("backup/", BackupDownloadView.as_view(), name="backup"),
    re_path(r"^(?!api/|admin/|static/|backup/).*$", spa),
]
