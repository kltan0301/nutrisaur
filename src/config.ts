import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  webhookSecret: process.env.WEBHOOK_SECRET || 'dev_secret_key',
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  geminiFallbackModels: (process.env.GEMINI_FALLBACK_MODELS || 'gemini-2.5-flash-lite,gemini-2.5-pro,gemini-2.0-flash,gemini-2.0-flash-lite')
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean),
  dataFile: process.env.DATA_FILE || 'data/nutrisaur.json',
  appTimezone: process.env.APP_TIMEZONE || 'Asia/Singapore',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
} as const;

// Validate required env vars
if (!config.telegramBotToken) {
  console.warn('⚠️  TELEGRAM_BOT_TOKEN not set in environment variables');
}

export const getWebhookPath = (): string => {
  return `/webhook_${config.webhookSecret}`;
};
