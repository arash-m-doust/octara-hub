# Octara Hub Deploy (Docker Compose)

## Requirements
- Docker Engine 24+
- Docker Compose v2
- Open ports `5174` (frontend) and `8010` (backend API/admin)

## 1) Configure Environment
1. Copy `.env.example` to `.env` at project root.
2. Set at minimum:
   - `SECRET_KEY`
   - `DEBUG=False`
   - `ALLOWED_HOSTS`
   - `DB_PASSWORD` (and optionally DB user/name)

## 2) Build and Run
```bash
docker compose up -d --build
```

## Production Note (Realtime)
- Current SSE transport uses in-memory pub/sub.
- Keep backend worker count at `1` (already enforced in `server/entrypoint.sh`) unless you introduce external pub/sub.

## 3) Validate
```bash
docker compose ps
docker compose logs -f backend
```
- Frontend: `http://localhost:5174`
- Backend API: `http://localhost:8010/api/`
- Django admin: `http://localhost:8010/admin/`

## 4) Create Superuser (optional)
```bash
docker compose exec backend python manage.py createsuperuser
```

## 5) Stop / Restart
```bash
docker compose down
docker compose up -d
```

## Network-Constrained Environments
- If Docker Hub pulls are blocked in your region/network, either:
  - switch temporarily to Native Local Test mode from `README.md`, or
  - configure an accessible registry mirror.

## Backup / Restore (PostgreSQL)
Backup:
```bash
docker compose exec db pg_dump -U "$DB_USER" "$DB_NAME" > backup.sql
```

Restore:
```bash
docker compose exec -T db psql -U "$DB_USER" "$DB_NAME" < backup.sql
```
