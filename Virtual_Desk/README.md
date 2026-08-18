# FrontDesk

FrontDesk is a MERN application for appointment-based businesses. It provides public booking, a business dashboard, Stripe payment collection, automated reminders, and AI-assisted customer conversations.

## Requirements

- Node.js 20 or newer
- MongoDB for any persistent environment
- Stripe keys for payment flows

## Local development

1. Copy `server/.env.example` to `server/.env` and replace every placeholder value.
2. Run `npm install` in both `server` and `client`.
3. Start the API with `npm run dev` from `server`.
4. Start the web application with `npm run dev` from `client`.

The client runs on `http://localhost:3000` and proxies API requests to `http://localhost:5000`.

## Production checklist

- Set `NODE_ENV=production`, `MONGODB_URI`, a long random `JWT_SECRET`, `CLIENT_URL`, Stripe keys, and SMTP credentials.
- Configure Stripe to send signed webhooks to `/api/payments/webhook` and set `STRIPE_WEBHOOK_SECRET`.
- Run `npm run check` in `server` and `npm run build` in `client` before deployment.
- Use a persistent MongoDB deployment and provide a process manager/restart policy.
- Configure HTTPS at the hosting layer and restrict `CLIENT_URL` to trusted origins.

The API deliberately refuses to boot in production without MongoDB or a JWT secret. Stripe webhooks also require a valid signature.
