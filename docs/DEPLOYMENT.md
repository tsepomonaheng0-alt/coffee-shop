# Deployment guide

Order matters: **Redis → Backend (Render) → Frontend (Vercel/Netlify) → connect CORS**.

## 0. Push to GitHub
```bash
cd coffee-shop
git init && git add . && git commit -m "feat: initial coffee shop app"
git branch -M main
git remote add origin https://github.com/<org>/<repo>.git
git push -u origin main
```
Then each member works on `feature/*` branches with Pull Requests (see `CONTRIBUTING.md`). Confirm `.env` files are **not** in the repo.

## 1. Persistent Redis
Use a managed Redis that stores data on disk:
- **Upstash** (free tier, persistent): create a Redis database → copy the **`rediss://default:<password>@<host>:6379`** URL.
- or Redis Cloud (free 30 MB), or Render *Key Value* on a paid instance.

> ⚠ Render's **free** Key Value instance is not persistent (data is lost on restart). Use Upstash/Redis Cloud for the assignment's "persistent database" requirement.

## 2. Backend on Render
1. Render dashboard → **New → Web Service** → connect the GitHub repo (or **New → Blueprint** to use `render.yaml`).
2. Settings: Root Directory `backend` · Runtime Node · Build `npm install` · Start `npm start` · Health Check Path `/api/health`.
3. Environment variables:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `REDIS_URL` | the Upstash/Redis Cloud URL (secret) |
| `STAFF_USERNAME` | e.g. `staff` |
| `STAFF_PASSWORD` | a strong password (secret) |
| `TOKEN_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `CORS_ORIGINS` | frontend URL (add after step 3; no trailing slash) |

4. Deploy, then open `https://<service>.onrender.com/api/health` → expect `{"status":"ok","database":"up",...}`.
   Free Render services sleep after inactivity – the first request can take ~30–60 s; open `/api/health` just before your demo.

## 3. Frontend on Vercel (or Netlify)
**Vercel:** Add New → Project → import repo → Root Directory `frontend` → Framework *Vite* → Environment Variable `VITE_API_URL = https://<service>.onrender.com` → Deploy.
**Netlify:** Add new site → import repo → Base directory `frontend`, Build command `npm run build`, Publish directory `frontend/dist` (or `dist`), env var `VITE_API_URL`.

Vite bakes `VITE_*` variables in at build time, so **redeploy after changing them**.

## 4. Connect them
Copy the final frontend URL into Render → `CORS_ORIGINS` (several URLs may be comma-separated, e.g. a preview URL too) → redeploy the backend.

## 5. Verification checklist (do this before submitting)
- [ ] `GET <backend>/api/health` returns `ok` / `database: up`
- [ ] Frontend loads the seeded menu
- [ ] Place an order → confirmation with number `CS-1001`
- [ ] Staff sign-in works; add a menu item; change an order's status
- [ ] Persistence: in Render click **Manual Deploy → Restart** (or *Suspend/Resume*) → menu, new item and orders are still there
- [ ] Take screenshots (app + Upstash *Data Browser* showing `menu:item:*` and `order:*` keys)
- [ ] Record the demo: add menu item → place order → update status
- [ ] No secrets in GitHub

## Local persistence test (already performed during development)
```bash
redis-server --appendonly yes --dir ./data   # or docker compose up -d
# place an order, then:  kill -9 <api pid>; redis-cli shutdown nosave
# restart redis + api, then GET /api/orders/<id>  → the order is still returned
```

## Option B - deploy as ONE service (website + API together)
The Express server also serves the built React site, so a single Render web service is enough:
- Root Directory: *(repo root)* · Build: `npm install --prefix backend && npm run build` · Start: `npm start` · Health Check Path: `/api/health`
- Same environment variables as step 2 (no `CORS_ORIGINS` needed - everything is same-origin); leave `VITE_API_URL` **empty**.
- Customers open `https://<service>.onrender.com/`, staff open `https://<service>.onrender.com/#/staff`.

> Note: `docs/screenshots/` and `docs/demo.mp4` were captured with the earlier interface; retake them from the merged app (shop + `/#/staff`) before submitting.
