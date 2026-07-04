# Hammer App — Web Backend + Admin

Unified **Next.js 15** app replacing the legacy PHP backend. Serves the
Flutter technician app's REST API and (upcoming) the operations Admin Dashboard.

See [`../claude.md`](../claude.md) for full project context.

## Stack

Next.js 15 (App Router, TS) · Prisma 6 · PostgreSQL 17 · Zod · JWT (mobile) ·
NextAuth v5 (admin, planned) · Tailwind v4 · shadcn/ui (planned)

## Getting started

```bash
npm install
cp .env.example .env          # fill in DATABASE_URL etc.
npx prisma migrate dev        # create tables (needs a running Postgres)
npm run db:seed               # master data + default admin
npm run dev                   # http://localhost:3003
```

The dev server runs on **port 3003** (see claude.md port map).

### OTP in development

`OTP_PROVIDER=console` prints OTPs to the server log instead of sending
WhatsApp messages. Switch to `whatsapp` and set `WHATSAPP_API_*` for real
delivery.

## Mobile API (Phase 1 — Technician)

All routes under `/api/technician/*`. Response envelope:

```json
{ "status": true, "message": "...", "data": { } }
```

### Auth (pre-auth static token `Authorization: Bearer 12345678`)

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/technician/create` | Register + send OTP |
| POST | `/api/technician/login` | Send login OTP |
| POST | `/api/technician/verify-otp` | Verify OTP → returns session JWT |
| POST | `/api/technician/resend-otp` | Resend OTP |

### KYC & profile (`Authorization: Bearer <session_jwt>`)

| Method | Endpoint | Step |
|---|---|---|
| GET/POST/PATCH | `/api/technician/personal_kyc` | 1 · Personal |
| GET/POST/PATCH | `/api/technician/edu-qualification` | 2 · Education |
| GET/POST/DELETE | `/api/technician/technician_service_category` | 3 · Services |
| GET/POST/PATCH | `/api/technician/bank-kyc` | Bank |
| GET/POST/PATCH | `/api/technician/company-kyc` | Company/Firm |
| GET/POST | `/api/technician/document-kyc` | Documents |
| POST | `/api/technician/signature` | Signature |
| GET/PATCH | `/api/technician/profile` | Profile |

`GET /api/health` — liveness + DB connectivity probe.

File uploads use `multipart/form-data`; other writes accept JSON. Fields are
accepted in both camelCase and snake_case for Flutter compatibility.

## Project layout

```
prisma/
  schema.prisma        # models: Technician, KYC steps, master data, Admin
  seed.ts              # master data + default admin
src/
  lib/                 # prisma, jwt, otp, upload, id, kyc rollup, validation, api
  app/api/technician/  # mobile API route handlers
```

## Deployment

See claude.md §9. In short: `git pull` → `npm install` →
`prisma migrate deploy` → `npm run build` → `pm2 restart hammerapp-web`.

> ⚠️ **API backward compatibility**: the `{ status, message, data }` envelope
> and field names are consumed by the Flutter app. Verify against the Flutter
> `*_model.dart` classes before changing any response shape.
