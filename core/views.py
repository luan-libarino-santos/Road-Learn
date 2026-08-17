import shutil
from datetime import date
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, HttpResponse
from django.views import View


def spa(request):
    index = settings.BASE_DIR / "static" / "app" / "index.html"
    if not index.exists():
        index = settings.STATIC_ROOT / "app" / "index.html"
    if not index.exists():
        return HttpResponse(
            "Frontend não compilado. Em desenvolvimento rode o Vite "
            "(cd frontend && npm run dev). Em produção: npm run build.",
            status=503,
            content_type="text/plain; charset=utf-8",
        )
    return FileResponse(index.open("rb"), content_type="text/html")


class BackupDownloadView(View):
    def get(self, request, *args, **kwargs):
        db_path = Path(settings.DATABASES["default"]["NAME"])
        if not db_path.is_absolute():
            db_path = settings.BASE_DIR / db_path
        backup_dir = settings.BASE_DIR / "backups"
        backup_dir.mkdir(exist_ok=True)
        stamp = date.today().isoformat()
        dest = backup_dir / f"roadlearn_backup_{stamp}.sqlite3"
        shutil.copy2(db_path, dest)
        return FileResponse(
            dest.open("rb"),
            as_attachment=True,
            filename=dest.name,
        )
