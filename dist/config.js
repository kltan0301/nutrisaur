"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWebhookPath = exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    webhookSecret: process.env.WEBHOOK_SECRET || 'dev_secret_key',
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    dataFile: process.env.DATA_FILE || 'data/nutrisaur.json',
};
// Validate required env vars
if (!exports.config.telegramBotToken) {
    console.warn('⚠️  TELEGRAM_BOT_TOKEN not set in environment variables');
}
const getWebhookPath = () => {
    return `/webhook_${exports.config.webhookSecret}`;
};
exports.getWebhookPath = getWebhookPath;
//# sourceMappingURL=config.js.map