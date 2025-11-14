# Docker deployment for brick-counter-web (Next.js Frontend)

This document explains how to run the Next.js frontend using Docker.

## What was added
- `Dockerfile` — Multi-stage build for Next.js production
- `.dockerignore` — Excludes node_modules, .next, etc.
- `docker-compose.yml` — Runs frontend on port 3001

## Build & Run

### Option 1: Standalone (Frontend only)

```powershell
docker-compose up --build
```

Frontend will be available at http://localhost:3001

### Option 2: With Backend (Recommended)

Run together with Brick-Counter-Backend using shared network:

1. First, create shared network (one time):
```powershell
docker network create brick-counter-network
```

2. Update Brick-Counter-Backend docker-compose.yml to use this network:
```yaml
services:
  backend:
    # ... existing config
    networks:
      - brick-counter-network

networks:
  brick-counter-network:
    external: true
```

3. Start backend:
```powershell
cd ..\Brick-Counter-Backend
docker-compose up -d
```

4. Start frontend:
```powershell
cd ..\brick-counter-web
docker-compose up -d
```

## Environment Variables

Edit `docker-compose.yml` to configure:
- `NEXT_PUBLIC_BACKEND_URL` — Backend API URL (default: http://localhost:5555)
- `NEXT_PUBLIC_WS_URL` — WebSocket URL (default: http://localhost:5555)

## Notes
- Frontend runs on port **3001** (backend on 5555)
- Uses Node 22 Alpine image
- Production build with optimizations
- If backend is in Docker, use service name instead of localhost in network

## Troubleshooting

**Frontend can't connect to backend:**
- Make sure both containers are on same network
- Use `http://tile-production-backend:5555` if backend is in same Docker network
- Or use `http://host.docker.internal:5555` to connect to host machine
