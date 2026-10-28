# SAMAY Deployment Guide

SAMAY can be deployed using any of the three approaches below. The server embeds the production client bundle automatically, so the entire stack runs cleanly on a single port without CORS issues.

---

## Option 1: Instant Live Public URL via ngrok (For Mobile / Judge Demo)

You have `ngrok` installed. To demo SAMAY live on mobile phones or share with judges right now:

```bash
# In terminal 1 (starts the client dev server or embedded server)
# The client is already running on http://localhost:5173

# In terminal 2: Expose port 5173 to the public internet with HTTPS:
ngrok http 5173
```
This gives you a live `https://<id>.ngrok-free.app` URL that works on any smartphone, tablet, or external laptop immediately.

---

## Option 2: Full-Stack Docker Deployment (Zero-Breakage, Single Command)

To run the entire production stack (Postgres + Express API + React PWA):

```bash
# Build and start all services
docker compose -f docker-compose.prod.yml up --build -d

# Initialize schema and seed data in the container database
docker compose -f docker-compose.prod.yml exec app node db/init.js --synthetic
```

The app will be live at `http://localhost:4000`.

To stop:
```bash
docker compose -f docker-compose.prod.yml down
```

---

## Option 3: Free Cloud Deployment (Render / Railway)

### Deploy on Render.com:
1. **Create PostgreSQL Database** on Render (Free tier) -> Copy `Internal Database URL`.
2. **Create Web Service** pointing to your GitHub repo `Doremon-tech-svg/samay`:
   - **Environment**: Docker (select root `Dockerfile`)
   - **Build Command**: (Handled by Dockerfile)
   - **Environment Variables**:
     - `DATABASE_URL`: `postgres://...` (your Render Postgres connection string)
     - `DEMO_MODE`: `1`
     - `GEMINI_API_KEY`: (optional, for LLM compiler)
     - `GROQ_API_KEY`: (optional, for Groq compiler)
3. Deploy! Render will build the client, bundle the server, and serve both on your Render URL (`https://samay.onrender.com`).

---

## Verifying Deployment Health
```bash
curl http://localhost:4000/api/health
# Expected: {"ok":true}

curl -I http://localhost:4000/
# Expected: HTTP/1.1 200 OK (serves index.html)
```
