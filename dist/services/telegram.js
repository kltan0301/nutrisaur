"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseUpdate = parseUpdate;
exports.telegramMethod = telegramMethod;
exports.sendMessage = sendMessage;
exports.downloadTelegramFile = downloadTelegramFile;
exports.isValidUpdate = isValidUpdate;
const axios_1 = __importDefault(require("axios"));
const promises_1 = __importDefault(require("fs/promises"));
const config_1 = require("../config");
async function logTelegramSend(message) {
    try {
        await promises_1.default.mkdir('data', { recursive: true });
        await promises_1.default.appendFile('data/telegram-send.log', `[${new Date().toISOString()}] ${message}\n`);
    }
    catch {
        // Logging must not block bot replies.
    }
}
/**
 * Detect intent from message text using keyword matching
 * Returns a simple intent string for logging
 */
function detectIntent(text) {
    if (!text)
        return 'unknown';
    const lowerText = text.toLowerCase();
    // Nutrition-related keywords
    if (lowerText.includes('nutrition') || lowerText.includes('calorie') || lowerText.includes('macro')) {
        return 'nutrition';
    }
    // Help request
    if (lowerText.includes('help') || lowerText.includes('assist') || text.startsWith('/')) {
        return 'help';
    }
    // Greeting
    if (lowerText.includes('hello') || lowerText.includes('hi') || lowerText.includes('hey')) {
        return 'greeting';
    }
    return 'message';
}
/**
 * Parse and extract relevant data from Telegram webhook update
 * Returns structured log entry
 */
function parseUpdate(body) {
    try {
        const update = body;
        if (update.callback_query) {
            const callback = update.callback_query;
            return {
                timestamp: new Date().toISOString(),
                chatId: callback.message?.chat.id || callback.from.id,
                userId: callback.from.id,
                text: callback.message?.text,
                callbackQueryId: callback.id,
                callbackData: callback.data,
                callbackMessageId: callback.message?.message_id,
                intent: 'callback',
            };
        }
        // Get the message from various possible fields
        const message = update.message || update.edited_message || update.channel_post || update.edited_channel_post;
        if (!message) {
            return {
                timestamp: new Date().toISOString(),
                chatId: 0,
                intent: 'no_message',
            };
        }
        const chatId = message.chat.id;
        const userId = message.from?.id;
        const text = message.text || message.caption;
        const largestPhoto = message.photo?.slice().sort((a, b) => (b.file_size || 0) - (a.file_size || 0))[0];
        const intent = detectIntent(text);
        return {
            timestamp: new Date().toISOString(),
            chatId,
            userId,
            text,
            photoFileId: largestPhoto?.file_id,
            intent,
        };
    }
    catch (error) {
        return {
            timestamp: new Date().toISOString(),
            chatId: 0,
            intent: 'parse_error',
        };
    }
}
function telegramMethod(method, payload) {
    return { method, ...payload };
}
async function sendMessage(chatId, text, replyMarkup) {
    if (!config_1.config.telegramBotToken) {
        await logTelegramSend(`skip chat=${chatId} reason=missing_token text=${text.slice(0, 80)}`);
        console.log(`[${new Date().toISOString()}] Telegram send skipped: TELEGRAM_BOT_TOKEN missing`);
        console.log(text);
        return;
    }
    try {
        await logTelegramSend(`start chat=${chatId} text=${text.slice(0, 80)}`);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(`https://api.telegram.org/bot${config_1.config.telegramBotToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                reply_markup: replyMarkup,
            }),
            signal: controller.signal,
        });
        clearTimeout(timeout);
        const body = await response.json();
        if (!response.ok || !body.ok) {
            throw new Error(JSON.stringify(body));
        }
        await logTelegramSend(`ok chat=${chatId} message_id=${body.result?.message_id ?? 'unknown'} text=${text.slice(0, 80)}`);
    }
    catch (error) {
        const axiosError = error;
        await logTelegramSend(`error chat=${chatId} error=${JSON.stringify(axiosError.response?.data || axiosError.message)} text=${text.slice(0, 80)}`);
        throw error;
    }
}
async function downloadTelegramFile(fileId) {
    if (!config_1.config.telegramBotToken) {
        throw new Error('TELEGRAM_BOT_TOKEN is required to download Telegram photos');
    }
    const fileResponse = await axios_1.default.get(`https://api.telegram.org/bot${config_1.config.telegramBotToken}/getFile`, {
        params: { file_id: fileId },
    });
    const filePath = fileResponse.data?.result?.file_path;
    if (!filePath) {
        throw new Error('Telegram did not return a file_path for this photo');
    }
    const imageResponse = await axios_1.default.get(`https://api.telegram.org/file/bot${config_1.config.telegramBotToken}/${filePath}`, {
        responseType: 'arraybuffer',
    });
    const mimeType = String(imageResponse.headers['content-type'] || 'image/jpeg');
    return {
        data: Buffer.from(imageResponse.data).toString('base64'),
        mimeType,
    };
}
/**
 * Validate that the update looks like a valid Telegram update
 */
function isValidUpdate(body) {
    return (body &&
        typeof body === 'object' &&
        typeof body.update_id === 'number' &&
        (body.message || body.edited_message || body.channel_post || body.edited_channel_post || body.callback_query));
}
//# sourceMappingURL=telegram.js.map