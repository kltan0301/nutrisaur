"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseUpdate = parseUpdate;
exports.sendMessage = sendMessage;
exports.downloadTelegramFile = downloadTelegramFile;
exports.isValidUpdate = isValidUpdate;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
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
async function sendMessage(chatId, text, replyMarkup) {
    if (!config_1.config.telegramBotToken) {
        console.log(`[${new Date().toISOString()}] Telegram send skipped: TELEGRAM_BOT_TOKEN missing`);
        console.log(text);
        return;
    }
    await axios_1.default.post(`https://api.telegram.org/bot${config_1.config.telegramBotToken}/sendMessage`, {
        chat_id: chatId,
        text,
        reply_markup: replyMarkup,
    });
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
        (body.message || body.edited_message || body.channel_post || body.edited_channel_post));
}
//# sourceMappingURL=telegram.js.map