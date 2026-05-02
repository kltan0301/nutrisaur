# Nutrisaur Telegram Bot

Node.js + TypeScript Express webhook server for a Gemini-powered Telegram nutrition tracker.

## Quick Start

### Installation
All dependencies are already installed. If not, run:
```bash
npm install
```

### Development
```bash
npm run dev
```
Runs with auto-reload on file changes using `ts-node --watch`.

### Production
```bash
npm run build
npm run build:run
```
Or directly:
```bash
npm start
```

## Configuration

Update `.env` file:
```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
GEMINI_API_KEY=your_gemini_key_here
GEMINI_MODEL=gemini-2.5-flash
GEMINI_FALLBACK_MODELS=gemini-2.5-flash-lite,gemini-2.0-flash-lite
APP_TIMEZONE=Asia/Singapore
WEBHOOK_SECRET=your_secret_key_here
DATA_FILE=data/nutrisaur.json
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_server_side_service_role_key
PORT=3000
NODE_ENV=production
```

## Project Structure

```
src/
├── server.ts                # Main Express app
├── config.ts                # Environment config loader
├── types/
│   └── telegram.ts          # TypeScript interfaces
├── middleware/
│   └── logger.ts            # Request & message logging
├── services/
│   └── telegram.ts          # Telegram parsing, replies, photo download
├── agent/
│   ├── db.ts                # Per-user JSON storage
│   ├── handlers.ts          # Goal/log/analyse/summary/recommend
│   └── index.ts             # Agent coordinator
└── routes/
    └── webhook.ts           # Webhook handler
```

## Endpoints

### Health Check
```bash
GET /health
```
Returns: `{ "status": "ok", "timestamp": "..." }`

### Telegram Webhook
```bash
POST /webhook_<WEBHOOK_SECRET>
```
- Accepts Telegram update JSON payloads, including text, captions, and photos
- Always returns `{ "ok": true }` (even on errors)
- Runs Nutrisaur and sends the response back to the Telegram chat
- Errors are logged internally, not returned to Telegram

## Features

✅ **Webhook Path Security** - Secret key in URL path  
✅ **Structured Logging** - Minimal data: timestamp, IDs, text, intent  
✅ **Error Resilience** - Always returns 200 to prevent Telegram retries  
✅ **Nutrisaur Commands** - `/goal`, `/log`, `/analyse`, `/summary`, `/recommend`  
✅ **Gemini Text + Vision** - text meal analysis and Telegram photo analysis  
✅ **Per-user Storage** - goal profile and meal inputs saved by Telegram user  
✅ **Nutrition Cache** - repeated meal text/photos reuse saved estimates instead of calling Gemini again  
✅ **Environment Support** - Full .env configuration  
✅ **Production Ready** - Graceful shutdown, error handling, type-safe  
✅ **Type Safety** - Full TypeScript support with minimal types  
✅ **No Bloat** - Just Express + TypeScript, no frameworks  

## Commands

- `/goal` - guided goal setup and editing
- `/goal_remind` - view the current saved goal
- `/calories_remaining` - show calories left today based on goal and logs
- `/start` - welcome message
- `/help` - commands, examples, and limitations
- `/log <meal>` - analyse and save a meal
- `/logs <duration>` - show logged meals for `today`, `yesterday`, `last monday`, a date, or a range like `this week`
- `/edit_log <duration>` - show logged meals with inline delete buttons
- `/analyse <meal>` - analyse without saving
- `/summary by day|week|month` - totals and averages
- `/recommend <place>` - goal-aware food recommendations
- Natural text like `I have eaten chicken rice` logs a meal.

## Logging Example

```
[2026-05-01T10:30:45.123Z] 📨 Chat:123456789 User:987654321 Intent:nutrition
   Message: What are the nutritional values of an apple?

[2026-05-01T10:30:45.234Z] POST /webhook_your_secret_key_here 200 111ms
```

## Graceful Shutdown

The server responds to SIGTERM and SIGINT signals:
```bash
kill -TERM <PID>  # Graceful shutdown
```

## Local Testing

### Test the health endpoint
```bash
curl http://localhost:3000/health
```

### Test webhook with sample payload
```bash
curl -X POST http://localhost:3000/webhook_your_secret_key_here \
  -H "Content-Type: application/json" \
  -d '{
    "update_id": 123456,
    "message": {
      "message_id": 1,
      "date": 1234567890,
      "chat": { "id": 123, "type": "private" },
      "from": { "id": 456, "is_bot": false, "first_name": "John" },
      "text": "Hello nutrition bot"
    }
  }'
```

Expected response: `{ "ok": true }`

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3000 | Server port |
| WEBHOOK_SECRET | dev_secret_key | Secret in webhook path |
| TELEGRAM_BOT_TOKEN | (required) | Your bot token from BotFather |
| GEMINI_API_KEY | (required for analysis) | Gemini API key |
| GEMINI_MODEL | gemini-2.5-flash | Gemini model for text and image analysis |
| GEMINI_FALLBACK_MODELS | gemini-2.5-flash-lite,gemini-2.0-flash-lite | Comma-separated models to try after Gemini 429 rate-limit errors |
| APP_TIMEZONE | Asia/Singapore | Timezone used for displayed meal times and day/week ranges |
| DATA_FILE | data/nutrisaur.json | JSON persistence path when Supabase is not configured |
| SUPABASE_URL | (optional) | Supabase project URL for hosted Postgres storage |
| SUPABASE_SERVICE_ROLE_KEY | (optional) | Server-only Supabase key for DB REST access |
| NODE_ENV | development | Environment mode |

## Next Steps for Production

1. **Set secure WEBHOOK_SECRET** in environment
2. **Enable HTTPS** - Use nginx/caddy reverse proxy
3. **Register webhook with Telegram**:
   ```bash
   curl "https://api.telegram.org/bot{TOKEN}/setWebhook?url=https://your-domain.com/webhook_{SECRET}"
   ```
4. **Use persistent storage** - Run `supabase_schema.sql` in Supabase SQL Editor, then set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
5. **Monitor logs** - Set up log aggregation
6. **Add rate limiting** - Implement if needed

## Development Notes

- TypeScript strict mode is enabled
- All files compile without warnings
- The server implements graceful error handling
- No external databases or services required for basic webhook
- Easy to extend with additional message handlers

---

Built for learning agent workflows. Keep it simple. 🚀
