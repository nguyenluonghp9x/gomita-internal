# Go-Live Before Namecheap DNS

Run these on your Linux server (Docker installed) to validate website by **server IP** first.

## 1) Prepare env for IP-based preview

```bash
cd /path/to/gomita-internal
SERVER_IP=YOUR_SERVER_IP \
NEXTAUTH_SECRET='YOUR_STRONG_SECRET' \
POSTGRES_PASSWORD='YOUR_DB_PASSWORD' \
npm run deploy:pre-domain
```

## 2) Start stack with Nginx edge

```bash
APP_DOMAIN=YOUR_SERVER_IP npm run nginx:render
npm run docker:edge:up
```

## 3) Validate website before domain

```bash
APP_BASE_URL=http://YOUR_SERVER_IP npm run go-live:check
APP_BASE_URL=http://YOUR_SERVER_IP npm run smoke:api
```

Then open `http://YOUR_SERVER_IP/login` in browser and test business flows.

---

## 4) After you buy domain on Namecheap

1. In Namecheap DNS, create:
   - `A` record: host `@` or `portal` -> `YOUR_SERVER_IP`
2. Update `.env.production`:
   - `NEXTAUTH_URL=https://portal.your-domain.com` (or `http://...` if TLS terminated elsewhere temporarily)
3. Render Nginx config again:

```bash
APP_DOMAIN=portal.your-domain.com npm run nginx:render
npm run docker:edge:up
```

4. Re-check:

```bash
APP_BASE_URL=https://portal.your-domain.com npm run go-live:check
APP_BASE_URL=https://portal.your-domain.com npm run smoke:api
```

## 5) Optional TLS notes

- If using Cloudflare proxy/LB TLS termination, keep origin HTTP internally.
- If terminating TLS on server directly, add certs to Nginx and listen on `443`.
