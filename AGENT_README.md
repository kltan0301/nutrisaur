# Nutrisaur Agent

Nutrisaur is a Telegram nutrition tracker powered by Gemini. It supports text meal logging, photo meal analysis, goal setting, summaries, and recommendations.

## Commands

- `/goal` starts a guided flow for goal, gender, activity level, age, height, and weight. It calculates BMR, maintenance calories, a daily calorie target, and a protein target. Run `/goal` again to edit.
- `/start` returns a short Nutrisaur welcome message.
- `/help` shows commands, natural language examples, and limitations.
- `/log <meal>` analyses and saves a meal. Natural text like `I have eaten chicken rice` is treated as a log too.
- `/logs <duration>` shows the meals logged for a date or range. Examples: `today`, `yesterday`, `last monday`, `2026-05-02`, `02/05/2026`, `this week`, `last week`, `last 7 days`.
- `/edit_log <duration>` shows the meals logged for a date or range with Telegram inline `Delete` buttons for easy removal.
- `/analyse <meal>` or `/analyze <meal>` analyses without saving.
- `/summary by day|week|month` returns totals, averages, and remaining calories for the day when a goal exists.
- `/recommend <place>` gives goal-aware options for places like `hawker`, `home`, `restaurant`, `stuff'd`, or `sushi`. For `home`, prompts constrain ideas to easy NTUC-available ingredients.

Photos can be sent with `/log` or `/analyse` in the caption. A photo without a caption is analysed but not saved by default.

## Storage

The production store is Supabase Postgres when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured. Run `supabase_schema.sql` once in Supabase SQL Editor to create the tables.

The local fallback store is a per-user JSON file at `DATA_FILE` or `data/nutrisaur.json`. This keeps the app dependency-light and free to run locally. It stores user goals, meal logs, and a global nutrition cache.

The nutrition cache avoids repeat Gemini calls for the same normalized text meal, such as `/log chicken rice` and `I have eaten chicken rice`. Photo meals are cached by a SHA-256 hash of the Telegram image bytes plus caption, so resending the same photo can reuse the previous estimate.

For production on hosts with ephemeral disks, use Supabase so meal logs and goals survive restarts.

## Gemini

The bot calls Gemini through the REST `generateContent` endpoint using `GEMINI_API_KEY`. The default model is `gemini-2.5-flash`, configurable with `GEMINI_MODEL`.

## Test

Set `APP_TIMEZONE` to control displayed meal times and the boundaries for `today`, `yesterday`, `this week`, and summaries. It defaults to `Asia/Singapore`.

```bash
npm run build
npx ts-node src/agent/__tests__/agent.test.ts
```
