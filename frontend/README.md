# Coffee shop - React frontend

Responsive coffee shop website (original design inspired by the work of
[Mr. Web Designer](https://www.youtube.com/@MrWebDesignerAnas), [video](https://youtu.be/52sKmRsk7xU))
connected to the Express/Redis backend in `../backend`, plus a staff dashboard.

![preview img](/preview.png)

| Page | Address |
|---|---|
| Customer website (menu, cart, order form, order tracker) | `/` |
| Staff dashboard (orders, record order, menu & prices, daily summary) | `/#/staff` |

## Run

```bash
cp .env.example .env     # optional
npm install
npm run dev              # http://localhost:5173  (needs the backend on :4000 - see the root README)
npm run build            # production build into dist/
```

`src/api.js` holds every call to the backend. In development `/api/*` is proxied to
`http://localhost:4000` (override with `VITE_DEV_API`). For Vercel / Netlify set
`VITE_API_URL` to the deployed backend URL and redeploy (Vite bakes it in at build time).
