# ☕ Coffee Shop Management System

A full-stack coffee shop web application with a customer storefront and a staff dashboard for managing orders, menu items, and daily summaries.

| Layer | Technology | Hosting |
|---|---|---|
| Frontend | React 18 + Vite | Vercel / Netlify / static host |
| Backend | Node.js + Express.js | Render |
| Database | Redis (key-value store) | Upstash / Redis Cloud / Render |
| Workflow | Git + GitHub | GitHub |

```
React frontend  --Fetch API-->  Express backend  --Redis-->  Redis database
```

**Local development URLs:**
- Frontend: `http://localhost:5173`
- Staff page: `http://localhost:5173/#/staff`
- Backend health: `http://localhost:4000/api/health`

---

## Features

**Customer website**
- Browse the coffee shop menu with item details, price, and availability
- Add drinks to a cart and adjust quantities
- Place orders with customer information and notes
- View order confirmation and tracking status
- Live menu refreshes from the backend

**Staff dashboard** (`/#/staff`)
- View all incoming orders with customer details and status
- Update order states: Pending → Preparing → Ready → Collected
- Add walk-in or phone orders manually
- Create, edit, and remove menu items
- Update prices, stock availability, and categories
- Review daily sales summary and popular items

**Backend**
- REST API for menu and order management
- Staff authentication with tokens
- Input validation and consistent JSON errors
- Redis-persisted data for menu and orders
- Server-side price and total calculation

---

## Project structure

```
coffee-shop/
├── package.json          root scripts for install and running the app
├── backend/              Express API
│   ├── src/              app.js, server.js, routes/, store.js, validators.js, auth.js, seed.js
│   └── test/             API tests
├── frontend/             React app (Vite)
│   ├── src/              App.jsx, api.js, utils.js, components/, css/
│   ├── public/
│   └── package.json
├── docs/                 deployment and project notes
├── docker-compose.yml    local Redis setup
├── render.yaml           Render deployment config
├── README.md             original project README
├── README-2.md           current project README
├── CONTRIBUTING.md       contribution workflow
└── .gitignore
```

---

## Installation (local development)

**Requirements:** Node.js 20+, Git, and Redis (Docker or a cloud Redis instance).

```bash
git clone <repo-url>
cd coffee-shop

# 1. Start Redis locally
docker compose up -d

# 2. Install dependencies
npm run install:all

# 3. Run the app
npm run dev
```

After startup:
- Website: `http://localhost:5173`
- Staff dashboard: `http://localhost:5173/#/staff`
- API: `http://localhost:4000/api/health`

---

## Environment variables

Create environment files as needed for local or deployed setup.

### Backend

| Variable | Purpose |
|---|---|
| `PORT` | Express server port |
| `REDIS_URL` | Redis connection string |
| `STAFF_USERNAME` | Staff login username |
| `STAFF_PASSWORD` | Staff login password |
| `TOKEN_SECRET` | JWT or token signing secret |
| `CORS_ORIGINS` | Allowed frontend origins |
| `USE_MEMORY_STORE` | Optional local-only fallback without Redis |

### Frontend

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend base URL |
| `VITE_CURRENCY` | Currency label shown in the UI |

---

## Running the project

### Run both frontend and backend together

```bash
npm run dev
```

### Run backend only

```bash
cd backend
npm run dev
```

### Run frontend only

```bash
cd frontend
npm run dev
```

### Run tests

```bash
npm test
```

---

## Deployment

For deployment, the usual setup is:

1. Host the backend on Render
2. Use Redis via Upstash or another managed service
3. Host the frontend on Vercel or Netlify
4. Set the frontend API URL and allowed CORS origins
5. Test the health endpoint before launching the site

The project is ready for static hosting on the frontend and a Node/Express backend service on the server side.

---

## Notes

This project was rebuilt as a modern coffee shop management app with a customer-facing storefront and a hidden staff route accessible only through the hash URL (`/#/staff`). The design keeps the store experience simple and direct while giving the staff tools to manage menu and orders behind the scenes.
