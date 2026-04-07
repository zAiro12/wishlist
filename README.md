# Wishlist

A full-stack wishlist-sharing app for friend groups.  
OAuth-only auth (Google / GitHub / Microsoft) · Vue 3 frontend (GitHub Pages) · Node/Prisma backend (Vercel)

---

## Repository layout

```
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

1. Set `VITE_API_URL` and `VITE_BASE_URL` (e.g. `/wishlist/`) as **repository variables** (Settings → Variables → Actions) so CI picks them up automatically.
2. Run `npm run build` — output is in `frontend/dist/`.
3. Deploy `frontend/dist/` to the `gh-pages` branch.  
   The included `public/404.html` handles deep-link routing on GitHub Pages.

#### OAuth redirect URIs for GitHub Pages

Configure each OAuth provider to redirect to:

```
https://<username>.github.io/wishlist/auth/callback?provider=<google|github|microsoft>
```

and set `FRONTEND_URL=https://<username>.github.io/wishlist` in the backend env.

---

## CI

GitHub Actions runs on every push and pull request:

- **Backend**: `npm ci` → `prisma generate` → `tsc --noEmit`
- **Frontend**: `npm ci` → `vue-tsc --noEmit` → `eslint` → `vite build`

See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

