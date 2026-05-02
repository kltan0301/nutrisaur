"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleWebhook = handleWebhook;
const telegram_1 = require("../services/telegram");
const logger_1 = require("../middleware/logger");
const agent_1 = require("../agent");
/**
 * Telegram webhook endpoint handler
 * 1. Validates and parses Telegram update
 * 2. Runs agent to classify intent and handle request
 * 3. Always returns 200 OK to prevent Telegram from retrying
 * 4. Errors are logged internally
 */
async function handleWebhook(req, res) {
    try {
        // Parse and validate the incoming update
        if (!(0, telegram_1.isValidUpdate)(req.body)) {
            (0, logger_1.logError)(new Error('Invalid update format'), 'webhook validation');
            res.json({ ok: true });
            return;
        }
        // Parse the update and extract relevant data
        const logEntry = (0, telegram_1.parseUpdate)(req.body);
        // Log the incoming message
        (0, logger_1.logMessage)(logEntry);
        // Extract message text for agent
        const messageText = logEntry.text || '';
        if (messageText || logEntry.photoFileId) {
            // Run the agent to process the message
            const agentResponse = await (0, agent_1.runAgent)({
                userInput: messageText,
                userId: logEntry.userId,
                chatId: logEntry.chatId,
                photo: logEntry.photoFileId ? { fileId: logEntry.photoFileId } : undefined,
            });
            // Log agent response
            console.log(`[${new Date().toISOString()}] 📤 Agent Response: intent=${agentResponse.intent}, success=${agentResponse.success}`);
            if (!agentResponse.success && agentResponse.error) {
                (0, logger_1.logError)(new Error(`Agent handler failed: ${agentResponse.error}`), `webhook:${agentResponse.intent}`);
            }
            await (0, telegram_1.sendMessage)(logEntry.chatId, agentResponse.message, agentResponse.replyMarkup);
        }
        // Always return 200 OK to Telegram
        res.json({ ok: true });
    }
    catch (error) {
        // Log internal error but still return 200 to Telegram
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        (0, logger_1.logError)(new Error(errorMessage), 'webhook handler');
        // Always return 200 to prevent retries
        res.json({ ok: true });
    }
}
//# sourceMappingURL=webhook.js.map