# SC-Nexus CI/CD & Deployment

SC-Nexus is a **separate GitHub repo**. It is deployed via `docker-compose.unified.yml` in TOCONTINUE (local folder), which runs Driftline, Chit-Chat, SC-Nexus, and a single Cloudflare Tunnel. This doc covers the CI/CD pipeline and Watchtower auto-updates.

---

## Architecture

```
[GitHub] push to master (SC-Nexus changes)
    → GitHub Actions builds Docker image
    → Pushes to GHCR (ghcr.io/<owner>/sc-nexus)
    → Watchtower (in unified compose) polls every 5 min
    → Pulls new image, restarts sc-nexus container
    → Cloudflare Tunnel keeps proxying scnexus.lothmar.com → sc-nexus:3000
```

---

## Files

| File | Purpose |
|------|---------|
| `SC-Nexus/.github/workflows/deploy.yml` | Build & push SC-Nexus to GHCR on push to master |
| `TOCONTINUE/docker-compose.unified.yml` | All apps + Watchtower + cloudflared (local only) |
| `SC-Nexus/Dockerfile` | Multi-stage build (context: repo root, needs `Database/`) |
| `TOCONTINUE/.env` | `GHCR_IMAGE`, `TUNNEL_TOKEN`, etc. (copy from `.env.example`) |

---

## GitHub Secrets

**None required.** The workflow uses `GITHUB_TOKEN` to push to GHCR.

---

## Local Setup

### 1. Authenticate Docker with GHCR

```bash
echo "YOUR_GITHUB_PAT" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

(PAT needs `read:packages` scope.)

### 2. Configure `.env` (TOCONTINUE root)

Add to your root `.env`:

```env
GHCR_IMAGE=ghcr.io/YOUR_GITHUB_USERNAME/sc-nexus:latest
```

Set this **after** the first successful workflow run. Until then, the compose will build from source.

### 3. Run the stack

```bash
cd TOCONTINUE
docker compose -f docker-compose.unified.yml up -d
```

---

## First-Time Flow

1. Push the workflow + Dockerfile to the **SC-Nexus** repo's `master` branch.
2. Wait for the workflow to finish (GitHub → Actions).
3. Set `GHCR_IMAGE=ghcr.io/<your-username>/sc-nexus:latest` in root `.env`.
4. Run `docker compose -f docker-compose.unified.yml up -d --build` (or `pull` then `up`).

---

## Watchtower

- Polls every **5 minutes**.
- Updates only the `sc-nexus` container.
- Removes old images after updates.
- Requires `GHCR_IMAGE` to be set so the container uses the registry image.

---

## Build Context

The Dockerfile uses repo root as context because `generate-database.mjs` needs `Database/` at `../Database` relative to the app.
