# Loopboard

Personal ATS, interview question bank, company targeting, prep tracker, and analytics for a software job search.

The product loop is: **Company → Job → Application → Interview → Questions → Performance → Weak areas → Prep → Skill scores → Next target**.

## Stack

| Layer | Tech |
| --- | --- |
| Client | React 19, Vite, TypeScript, Tailwind CSS, Zustand, React Router, Recharts |
| API | Express, TypeScript, Zod, JWT (access + httpOnly refresh cookie) |
| Data | MongoDB (Mongoose), Redis (optional in development) |

Node.js **20+** is required.

## Project layout

```
server/     Express API (controllers → services → repositories → models)
client/     Vite React app (proxies /api to the API)
```

## Run locally

### 1. MongoDB

Use [MongoDB Atlas](https://www.mongodb.com/atlas) (or a local MongoDB instance). Copy the **Drivers** connection string into `server/.env`.

### 2. API

```bash
cd server
cp .env.example .env
# Edit .env: MONGODB_URI, JWT secrets, CLIENT_ORIGIN
npm install
npm run dev
```

API listens on [http://localhost:5000](http://localhost:5000).

Redis at `REDIS_URL` is optional in development. If nothing is listening on `127.0.0.1:6379`, the API uses an in-memory cache. Production should run Redis.

### 3. Client

```bash
cd client
npm install
npm run dev
```

App: [http://localhost:5173](http://localhost:5173). Vite proxies `/api` to `http://127.0.0.1:5000`.

Register an account, then start with **Companies** → **Jobs** → **Applications**.

## Environment (`server/.env`)

See `server/.env.example`. Important variables:

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | Atlas or local Mongo connection string (`mongodb+srv://…`) |
| `MONGODB_DB_NAME` | Database name (default `loopboard`) |
| `REDIS_URL` | Redis URL; ignored if Redis is down in development |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Sign tokens; use long random strings |
| `JWT_ACCESS_EXPIRES` | Access token TTL (default `15m`) |
| `JWT_REFRESH_EXPIRES_DAYS` | Refresh cookie lifetime (default `7`) |
| `CLIENT_ORIGIN` | CORS origin for the SPA (`http://localhost:5173`) |
| `UPLOAD_DIR` | Resume upload directory |
| `PORT` | API port (default `5000`) |

Do not commit `.env`. Encode special characters in the Atlas password (`@` → `%40`).

## Scripts

**Server**

- `npm run dev` — watch mode (`tsx`)
- `npm run build` / `npm start` — compile and run `dist/`
- `npm run lint` — ESLint

**Client**

- `npm run dev` — Vite
- `npm run build` — TypeScript + production bundle
- `npm run preview` — serve the build
- `npm run lint` — Oxlint

## Modules

- **Dashboard** — KPIs, intelligence, upcoming interviews, activity
- **Companies / targets** — research, tier, skill match, target score
- **Jobs & applications** — Kanban (Saved → Offer / Rejected) plus table view
- **Interviews** — upcoming, history, round detail
- **Questions** — canonical bank, technology, confidence
- **Prep** — topics, generated study plan, weak areas
- **Skills, notes, recruiters, resumes, calendar, analytics, settings**

Withdrawn and closed applications stay off the Kanban board; use table filters.

## Auth

- Access JWT (~15 minutes)
- Refresh token in an httpOnly cookie (`loopboard_refresh`) on `/api/auth`
- Register seeds a default set of prep topics

## Production notes

- Point `MONGODB_URI` at Atlas and keep Redis running
- Set strong JWT secrets and a real `CLIENT_ORIGIN`
- Typical split: SPA on Vercel, API on Render/Railway, data on Atlas
