# 🚀 DEPLOYMENT GUIDE — Virtual Front Desk

## ✅ COMPLETED PRE-DEPLOYMENT STEPS

- [x] Production `.env` file created
- [x] Frontend built for production (`dist/` folder)
- [x] No compilation errors
- [x] Security middleware configured
- [x] .gitignore properly configured

---

## 📋 REMAINING DEPLOYMENT STEPS

### Step 1: Set Up MongoDB Atlas (Cloud Database)

**Why:** The app currently uses in-memory database (data lost on restart). You need a real, persistent database.

**Steps:**

1. Go to [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Sign up for free account
3. Create a new cluster (choose "Shared" for free tier)
4. Click "Connect" on your cluster
5. Choose "Drivers" → "Node.js"
6. Copy the connection string: `mongodb+srv://username:password@cluster-name.mongodb.net/database-name?retryWrites=true&w=majority`
7. Replace in `.env` file: `MONGODB_URI=<your-connection-string>`
8. In MongoDB Atlas, create a database user and password
9. Update connection string with your credentials

**Test locally first:**
```bash
cd server
npm start  # Should connect to MongoDB Atlas
```

---

### Step 2: Get Required API Keys

#### 🔑 OpenAI (For AI Chat & Embeddings)

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up / Log in
3. Navigate to API keys
4. Create new secret key
5. Copy to `.env`: `OPENAI_API_KEY=sk_...`

**Cost:** Pay-as-you-go (roughly $0.01-0.10 per chat interaction)

#### 💳 Stripe (For Payments)

1. Go to [stripe.com](https://stripe.com)
2. Sign up for account
3. Go to Dashboard → Developers → API Keys
4. Copy **Live** keys (not test keys):
   - `STRIPE_SECRET_KEY=sk_live_...`
   - `STRIPE_PUBLISHABLE_KEY=pk_live_...`
5. Set up Webhook: Developers → Webhooks → Add endpoint
   - Endpoint URL: `https://yourdomain.com/api/payments/webhook`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Copy Webhook Secret to `.env`: `STRIPE_WEBHOOK_SECRET=whsec_...`

**Cost:** 2.9% + $0.30 per transaction

#### 📧 Email Service (For Notifications)

**Option A: Gmail (Easiest for testing)**
1. Enable 2-factor authentication on Gmail
2. Generate App Password: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Update `.env`:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=<your-app-password>
   SMTP_FROM=noreply@yourdomain.com
   ```

**Option B: SendGrid (Professional)**
1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Create API key
3. Update `.env`:
   ```
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASS=SG.<your-api-key>
   ```

**Option C: AWS SES (Enterprise)**
1. Set up AWS account and SES service
2. Verify sender email
3. Get SMTP credentials from AWS console

#### 🔐 JWT Secret (For Authentication)

Generate a strong random secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy output to `.env`: `JWT_SECRET=<your-random-string>`

---

### Step 3: Choose Hosting Platform

#### Option A: Heroku (Easiest)

1. Sign up at [heroku.com](https://heroku.com)
2. Install Heroku CLI
3. Create app: `heroku create your-app-name`
4. Set environment variables:
   ```bash
   heroku config:set MONGODB_URI="mongodb+srv://..." \
     JWT_SECRET="..." \
     OPENAI_API_KEY="..." \
     STRIPE_SECRET_KEY="..." \
     etc.
   ```
5. Deploy:
   ```bash
   git push heroku main
   ```

**Cost:** Free tier available, $5-50+/month for production

#### Option B: DigitalOcean (Better Value)

1. Sign up at [digitalocean.com](https://digitalocean.com)
2. Create Droplet (Ubuntu 22.04, 2GB RAM minimum)
3. SSH into server
4. Install Node.js, PM2, Nginx
5. Clone repo: `git clone <your-repo>`
6. Set `.env` with production values
7. Start with PM2: `pm2 start server.js --name "virtual-desk"`
8. Configure Nginx as reverse proxy
9. Set up SSL with Let's Encrypt

**Cost:** $4-6/month

#### Option C: AWS (Most Scalable)

1. Sign up at [aws.amazon.com](https://aws.amazon.com)
2. Use Elastic Beanstalk or EC2
3. Configure RDS for database backups
4. Set up CloudFront for CDN
5. Follow AWS deployment docs

**Cost:** Free tier available, varies by usage

#### Option D: Vercel (Frontend Only)

- Deploy frontend to Vercel (free)
- Deploy backend to Heroku/DigitalOcean/AWS
- Update `VITE_API_URL` in frontend env

---

### Step 4: Prepare for Deployment

**Create root-level Procfile** (for Heroku):
```
web: cd server && npm start
```

**Update package.json scripts** (for production):

Server's `package.json` should have:
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

**Build and serve frontend from backend:**

You can serve the React production build from Express:

```javascript
// In server.js, after all API routes:
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Serve React frontend build
app.use(express.static(path.join(__dirname, '../client/dist')));

// Route all non-API requests to React (for SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});
```

---

### Step 5: Set Up Domain & SSL

1. Buy domain: [namecheap.com](https://namecheap.com), [godaddy.com](https://godaddy.com)
2. Update DNS records to point to your hosting
3. Set up SSL/HTTPS:
   - Heroku: Automatic
   - DigitalOcean: Use Let's Encrypt
   - AWS: Use AWS Certificate Manager

---

### Step 6: Test Before Going Live

**Local testing with production .env:**

```bash
# Terminal 1: Start backend
cd server
NODE_ENV=production npm start

# Terminal 2: Start frontend (dev mode)
cd client
npm run dev
```

**Test features:**
- [ ] User registration & login
- [ ] Create booking
- [ ] Payment flow (use Stripe test cards)
- [ ] Email notifications sent
- [ ] Chat with AI
- [ ] Admin dashboard

**Stripe Test Cards:**
- Visa: `4242 4242 4242 4242`
- Mastercard: `5555 5555 5555 4444`
- Declined: `4000 0000 0000 0002`

---

### Step 7: Deploy!

**For Heroku:**
```bash
git push heroku main
```

**For DigitalOcean:**
```bash
git push origin main  # On your server
npm start
```

**Verify deployment:**
- Visit `https://yourdomain.com`
- Check `/api/health` endpoint
- Test all features

---

## 🔍 PRODUCTION CHECKLIST

Before going live, verify:

- [ ] `.env` file has ALL production values (not test/demo keys)
- [ ] `MONGODB_URI` points to live MongoDB Atlas database
- [ ] `JWT_SECRET` is strong and random
- [ ] `OPENAI_API_KEY` is set and has credits
- [ ] `STRIPE_SECRET_KEY` is LIVE key (not test)
- [ ] `STRIPE_WEBHOOK_SECRET` is configured in Stripe dashboard
- [ ] Email service configured and tested
- [ ] Frontend build created (`dist/` folder exists)
- [ ] Domain name purchased and DNS configured
- [ ] SSL/HTTPS enabled
- [ ] `.env` is in `.gitignore` (never committed)
- [ ] All security middleware enabled
- [ ] Database backups configured
- [ ] Error logging configured
- [ ] All features tested with real data

---

## 🚨 SECURITY REMINDER

**NEVER:**
- ❌ Commit `.env` to GitHub
- ❌ Use test API keys in production
- ❌ Share JWT_SECRET or API keys
- ❌ Use weak JWT_SECRET
- ❌ Disable HTTPS

**ALWAYS:**
- ✅ Use environment variables for secrets
- ✅ Enable database backups
- ✅ Monitor error logs
- ✅ Use HTTPS everywhere
- ✅ Keep dependencies updated

---

## 📞 SUPPORT RESOURCES

- MongoDB Atlas: [docs.mongodb.com/atlas](https://docs.mongodb.com/atlas)
- OpenAI API: [platform.openai.com/docs](https://platform.openai.com/docs)
- Stripe: [stripe.com/docs](https://stripe.com/docs)
- Express/Node: [expressjs.com](https://expressjs.com)
- React: [react.dev](https://react.dev)

---

## 📊 ESTIMATED MONTHLY COSTS

| Service | Cost | Notes |
|---------|------|-------|
| **Hosting** | $5-50 | Heroku $5, DigitalOcean $5, AWS varies |
| **MongoDB Atlas** | Free-$50 | Free tier available, $50-200 for production |
| **OpenAI API** | $0-50+ | Pay-as-you-go, depends on usage |
| **Stripe** | 2.9% + $0.30 per transaction | Only pay when customers book |
| **Email** | Free-$10 | Gmail free, SendGrid $10-20 |
| **Domain** | $10-15/year | One-time at registrar |
| **SSL Certificate** | Free | Let's Encrypt or hosting provider |
| **TOTAL (Conservative)** | **$30-100/month** | Can be less with free tiers |

---

Generated: 2026-08-18
Status: ✅ Ready for Production Deployment
