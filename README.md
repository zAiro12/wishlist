# Wishlist

A full-stack wishlist-sharing app for friend groups.  
OAuth-only auth (Google / GitHub / Microsoft) · Vue 3 frontend (GitHub Pages) · Node/Prisma backend (Vercel)

---

## Repository layout

```text
wishlist/
├── backend/    Vercel serverless functions (Node, Prisma, PostgreSQL)
└── frontend/   Vue 3 + Vite SPA (static, deployable to GitHub Pages)
```

---

## Local development

### Prerequisites
- Node.js ≥ 20
- A PostgreSQL database (local or remote)
- OAuth app credentials for at least one provider (Google, GitHub, or Microsoft)

### 1. Backend

```bash
cd backend
cp .env.example .env        # fill in DATABASE_URL, JWT_SECRET, OAuth credentials
npm install
npx prisma generate
npx prisma migrate deploy   # or: npx prisma db push for dev
npm run dev                 # starts Vercel dev server on http://localhost:3000
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local  # set VITE_API_URL=http://localhost:3000
npm install
npm run dev                 # starts Vite dev server on http://localhost:5173
```

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Random secret ≥ 32 characters |
| `FRONTEND_URL` | Full URL of the deployed frontend (used in OAuth redirects) |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins |
| `GOOGLE_CLIENT_ID` / `_SECRET` / `_REDIRECT_URI` | Google OAuth app |
| `GITHUB_CLIENT_ID` / `_SECRET` / `_REDIRECT_URI` | GitHub OAuth app |
| `MICROSOFT_CLIENT_ID` / `_SECRET` / `_REDIRECT_URI` | Microsoft OAuth app |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the Vercel backend (no trailing slash) |
| `VITE_BASE_URL` | Vite/router base path — set to `/wishlist/` for GitHub Pages, `/` otherwise |

---

## Building for production

```bash
# Backend – typecheck only (Vercel handles the actual build)
cd backend && npm run build

# Frontend – outputs to frontend/dist/
cd frontend && npm run build
```

---

## Deployment

### Backend → Vercel

1. Import the `backend/` directory as a Vercel project.
2. Set all environment variables in the Vercel dashboard.
3. Vercel automatically serves each file under `api/` as a serverless function.

### Frontend → GitHub Pages

Deployment is fully automated via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).  
It triggers on every push to `main`, builds the frontend, and publishes `frontend/dist/` using the official GitHub Pages actions.

#### Required repository settings (one-time)

1. **Pages source** — go to *Settings → Pages* and set **Source** to **GitHub Actions**.
2. **Repository variables** — go to *Settings → Variables → Actions* and add:

   | Variable | Example value |
   |---|---|
   | `VITE_API_URL` | `https://your-backend.vercel.app` |
   | `VITE_BASE_URL` | `/wishlist/` |

   These are not secrets — they are baked into the static bundle at build time.

The `public/404.html` included in the build handles deep-link routing on GitHub Pages.

#### OAuth redirect URIs for GitHub Pages

Configure OAuth apps to point to the backend callback endpoint (the app authenticates
against the provider and the provider must redirect back to the backend). Use these exact
redirect URIs (replace `<YOUR_BACKEND_URL>` with your Vercel or local backend URL):

```text
<YOUR_BACKEND_URL>/api/auth/callback?provider=google
<YOUR_BACKEND_URL>/api/auth/callback?provider=github
<YOUR_BACKEND_URL>/api/auth/callback?provider=microsoft
```

Notes:
- `FRONTEND_URL` (e.g. `https://<username>.github.io/wishlist` or `http://localhost:5173`) must be set in the backend environment — the backend will redirect users to the frontend after sign-in.
- For Google OAuth, add the redirect URI in the Google Cloud Console under OAuth 2.0 Client IDs → Authorized redirect URIs.
- For GitHub, add the redirect URI in the OAuth App settings → Authorization callback URL.
- For Microsoft (Azure AD), add the redirect URI in the app's Authentication settings.

### Getting a Neon `DATABASE_URL`

1. Create a project in Neon and a Postgres branch (or use the default branch).
2. In the Neon dashboard, go to **Connection** and copy the standard `postgres://...` connection string.
3. Paste that value into `backend/.env` as `DATABASE_URL` (or set it in Vercel dashboard for production).

### GitHub Variables (build-time)

Set repository-level Variables (Settings → Variables → Actions) used during the static frontend build:

- `VITE_API_URL` — full backend URL (e.g. `https://my-backend.vercel.app`). This is embedded into the static bundle during build.
- `VITE_BASE_URL` — base path for the site (use `/wishlist/` when publishing to `https://<username>.github.io/wishlist/`).

These are not secrets — they are used at build time so the produced static assets know where to call the API.

### Vercel environment variables

In your Vercel project for the backend, set the same environment variables that you use locally (see `backend/.env.example`): `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, OAuth client IDs/secrets and `ALLOWED_ORIGINS`.


---

## CI / CD

**CI** runs on every push and pull request ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)):

- **Backend**: `npm ci` → `prisma generate` → `tsc --noEmit`
- **Frontend**: `npm ci` → `vue-tsc --noEmit` → `eslint` → `vite build`

**Deploy** runs automatically on every push to `main` ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)):

- Builds `frontend/` with `VITE_API_URL` and `VITE_BASE_URL` from repository variables
- Publishes `frontend/dist/` to GitHub Pages via `actions/deploy-pages`

---

### Production OAuth redirect URI (exact)

For production, register this exact redirect URI in each OAuth provider configuration:

```text
https://wishlist.vercel.app/api/auth/callback
```

### Neon (pooled) connection string

Use the pooled connection string from Neon (host contains `-pooler`) for production, example:

```text
postgresql://user:password@host-pooler.neon.tech/wishlist?sslmode=require
```

### GitHub Actions Variables (set at repository level)

Set these Variables under *Settings → Variables → Actions* so the static build embeds them:

- `VITE_API_URL` — `https://wishlist.vercel.app`
- `VITE_BASE_URL` — `/wishlist/`

### Vercel environment variables

Set the following env vars in your Vercel project for the backend (Production):

- `DATABASE_URL` — Neon pooled connection string
- `JWT_SECRET` — random secret (generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"`)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`
- `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET`
- `ALLOWED_ORIGINS` — e.g. `https://zairo12.github.io/wishlist/,https://zairo12.github.io`
- `FRONTEND_URL` — `https://zairo12.github.io/wishlist/`
- `NODE_ENV` — `production`

### Make a user an admin (SQL)

Run this SQL against your database to promote an existing user to admin:

```sql
UPDATE "User" SET role='ADMIN' WHERE email='your-admin-email@example.com';
```

### Local dev quick commands

Frontend:
```bash
cd frontend
npm install
npm run dev
```

Backend:
```bash
cd backend
npm install
npx prisma generate
npx vercel dev
```

### Deploy

Push to `main` to trigger CI and deploy:

```bash
git push origin main
```



