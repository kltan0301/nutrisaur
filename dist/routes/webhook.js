"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleWebhook = handleWebhook;
const telegram_1 = require("../services/telegram");
const logger_1 = require("../middleware/logger");
const agent_1 = require("../agent");
function telegramMethodResponse(chatId, agentResponse) {
    return {
        method: 'sendMessage',
        chat_id: chatId,
        text: agentResponse.message,
        reply_markup: agentResponse.replyMarkup,
    };
}
async function processAndSendLater(body) {
    const logEntry = (0, telegram_1.parseUpdate)(body);
    const messageText = logEntry.text || '';
    if (!messageText && !logEntry.photoFileId)
        return;
    const agentResponse = await (0, agent_1.runAgent)({
        userInput: messageText,
        userId: logEntry.userId,
        chatId: logEntry.chatId,
        photo: logEntry.photoFileId ? { fileId: logEntry.photoFileId } : undefined,
    });
    await (0, telegram_1.sendMessage)(logEntry.chatId, agentResponse.message, agentResponse.replyMarkup);
}
/**
 * Telegram webhook endpoint handler
 * 1. Validates and parses Telegram update
 * 2. Runs agent when it can answer quickly and replies through the webhook response
 * 3. Falls back to a quick "working" response for slower jobs
 * 4. Always returns 200 OK to prevent Telegram retries
 */
async function handleWebhook(req, res) {
    try {
        if (!(0, telegram_1.isValidUpdate)(req.body)) {
            (0, logger_1.logError)(new Error('Invalid update format'), 'webhook validation');
            res.json({ ok: true });
            return;
        }
        const logEntry = (0, telegram_1.parseUpdate)(req.body);
        (0, logger_1.logMessage)(logEntry);
        if (logEntry.callbackData?.startsWith('delete_log:')) {
            const mealId = logEntry.callbackData.slice('delete_log:'.length);
            const deleteResponse = await (0, agent_1.handleDeleteLog)(String(logEntry.userId || logEntry.chatId), mealId);
            const text = deleteResponse.success
                ? `${deleteResponse.message}\n\nRun /edit_log again to delete another meal.`
                : deleteResponse.message;
            if (logEntry.callbackMessageId) {
                res.json({
                    method: 'editMessageText',
                    chat_id: logEntry.chatId,
                    message_id: logEntry.callbackMessageId,
                    text,
                });
            }
            else {
                res.json({
                    method: 'answerCallbackQuery',
                    callback_query_id: logEntry.callbackQueryId,
                    text,
                });
            }
            return;
        }
        const messageText = logEntry.text || '';
        if (!messageText && !logEntry.photoFileId) {
            res.json({ ok: true });
            return;
        }
        const agentPromise = (0, agent_1.runAgent)({
            userInput: messageText,
            userId: logEntry.userId,
            chatId: logEntry.chatId,
            photo: logEntry.photoFileId ? { fileId: logEntry.photoFileId } : undefined,
        });
        const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 8000));
        const agentResponse = await Promise.race([agentPromise, timeout]);
        if (agentResponse) {
            console.log(`[${new Date().toISOString()}] 📤 Agent Response: intent=${agentResponse.intent}, success=${agentResponse.success}`);
            if (!agentResponse.success && agentResponse.error) {
                (0, logger_1.logError)(new Error(`Agent handler failed: ${agentResponse.error}`), `webhook:${agentResponse.intent}`);
            }
            res.json(telegramMethodResponse(logEntry.chatId, agentResponse));
            return;
        }
        res.json({
            method: 'sendMessage',
            chat_id: logEntry.chatId,
            text: 'Still working on that. I will send the result when it is ready.',
        });
        void agentPromise
            .then((lateResponse) => (0, telegram_1.sendMessage)(logEntry.chatId, lateResponse.message, lateResponse.replyMarkup))
            .catch((error) => {
            const errorMessage = error instanceof Error ? error.message : String(error);
            (0, logger_1.logError)(new Error(errorMessage), 'webhook async processor');
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        (0, logger_1.logError)(new Error(errorMessage), 'webhook handler');
        res.json({ ok: true });
    }
}
//# sourceMappingURL=webhook.js.map