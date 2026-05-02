# Deploy Nutrisaur on Render

Render can host the current Express app with no code changes. Use Supabase for persistence because Render Free has an ephemeral filesystem.

## 1. Prepare Supabase

Run `supabase_schema.sql` in the Supabase SQL Editor.

Copy these values:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Use the service role key only on the server. Do not expose it in frontend code.

## 2. Push This Repo

Render deploys from a GitHub, GitLab, or Bitbucket repo. Push this project to a private GitHub repo.

Make sure `.env` is not committed.

## 3. Create Render Web Service

In Render:

1. New -> Web Service
2. Connect the repo
3. Choose the `main` branch
4. Use these settings:

```text
Runtime: Node
Instance Type: Free
Region: Singapore
Build Command: npm ci --include=dev && npm run build
Start Command: npm start
Health Check Path: /health
```

If Render detects `render.yaml`, it can fill most of this automatically.

## 4. Add Environment Variables

Set these in Render:

```env
NODE_ENV=production
TELEGRAM_BOT_TOKEN=your_botfather_token
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-2.5-flash
WEBHOOK_SECRET=choose_a_long_secret
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

Do not set `PORT`; Render injects it.

## 5. Deploy

Click Deploy Web Service. When it is live, open:

```text
https://your-render-service.onrender.com/health
```

You should see:

```json
{ "status": "ok" }
```

## 6. Point Telegram to Render

Replace values and run locally:

```bash
source .env
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=https://your-render-service.onrender.com/webhook_${WEBHOOK_SECRET}&drop_pending_updates=true"
```

Check it:

```bash
source .env
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
```

## Free Plan Note

Render Free web services spin down when idle, so the first Telegram message after idle may be delayed or retried. Supabase keeps your data safe, but Render Free is not truly always-on.
