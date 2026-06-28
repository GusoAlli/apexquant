# ApexQuant Backend (Auth scaffold)

Quick scaffold for authentication and session handling using Prisma, JWT, and Argon2.

Setup

1. Copy `.env.example` to `.env` and set `DATABASE_URL` and JWT secrets.
2. Install dependencies:

```bash
cd backend
npm install
```

3. Generate Prisma client and run initial migration (configure `DATABASE_URL` first):

```bash
npm run prisma:generate
npm run prisma:migrate
```

4. Start dev server:

```bash
npm run dev
```

Notes

- Registration assumes a `Role` exists (roleId = 1). Seed roles before registering users.
- This is a minimal scaffold; add rate limiting, input validation, and admin protections before production.
 - Run the seeder to create default roles before registering users:

```bash
node -r ts-node/register src/scripts/seedRoles.ts
```

Security hardening included:
- Rate limiting on auth endpoints (`express-rate-limit`).
- Input validation using `zod` for register/login payloads.

Stripe billing scaffold:
- Add `STRIPE_SECRET` and `STRIPE_WEBHOOK_SECRET` to `.env`.
- Use `/api/billing/checkout` (authenticated) to create Checkout sessions.
- Webhook endpoint: `/api/webhooks/stripe` — mount this publicly and configure in Stripe dashboard.

Before enabling webhooks in production, verify signatures and implement event handling to create/ update `subscriptions` and `payments` records.

