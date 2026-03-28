# Octara Hub

Octara Hub is a self-hostable collaboration system for teams that need predictable communication and workspace coordination on their own infrastructure.

This project was initially developed under a different internal name and later evolved into an independent open-source system.

While many collaboration tools support self-hosting, Octara Hub focuses on a practical combination of transparent backend behavior, session-isolated multi-user testing on one origin, and a straightforward operational model for local and private deployments.

## What Octara Hub Provides
- Workspace, category, and channel collaboration.
- Direct messages with realtime thread and message updates.
- Role model with SuperUser, Admin (`is_staff`), and Member scopes.
- Invite/kick flows and permission-guarded actions.
- Session namespacing via URL query (`?session=<username>`) for parallel account testing in one browser origin.
- File sharing and message interactions.

## Architecture
- Frontend: React + TypeScript + Vite (`client/`)
- Backend: Django + DRF + JWT + SSE (`server/`)
- Realtime transport: SSE (currently in-memory pub/sub)
- Deploy stack: Docker Compose (`db + backend + frontend`)

## Run Model 1: Native Local Test

### Requirements
- Python 3.11+
- Node.js 20+

### First Setup
```bash
cd server
python -m venv venv
# Windows
.\venv\Scripts\activate
# Linux/macOS
# source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
```

```bash
cd client
npm install
```

### Start
Backend:
```bash
cd server
.\venv\Scripts\python.exe manage.py runserver 127.0.0.1:8010
```

Frontend:
```bash
cd client
npm run dev -- --host 127.0.0.1
```

Endpoints:
- Frontend: `http://localhost:5174`
- Backend API: `http://localhost:8010/api/`
- Django admin: `http://localhost:8010/admin/`

## Run Model 2: Docker Deploy

### Requirements
- Docker Engine 24+
- Docker Compose v2

### Start
```bash
cp .env.example .env
docker compose up -d --build
```

### Validate
```bash
docker compose ps
docker compose logs -f backend
```

Endpoints:
- Frontend: `http://localhost:5174`
- Backend API: `http://localhost:8010/api/`
- Django admin: `http://localhost:8010/admin/`

For deployment operations (backup/restore, network notes), see [docs/DEPLOY.md](docs/DEPLOY.md).

## Operational Notes
- Realtime currently relies on in-memory SSE pub/sub, so deploy backend with one worker unless external pub/sub is introduced.
- If container image pulls are restricted in your network, use Native Local Test mode or configure a reachable registry mirror.

## Security and Publishing
- Do not commit `.env`.
- Keep runtime artifacts (`db.sqlite3`, uploads, caches, build outputs) out of Git.
- Prefer tagged releases for reproducible deployment baselines.

## License
MIT. See [LICENSE](LICENSE).
