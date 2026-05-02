import { Request, Response } from 'express';
import { parseUpdate, isValidUpdate, sendMessage } from '../services/telegram';
import { logMessage, logError } from '../middleware/logger';
import { runAgent, AgentResponse } from '../agent';

/**
 * Telegram webhook endpoint handler
 * 1. Validates and parses Telegram update
 * 2. Runs agent to classify intent and handle request
 * 3. Always returns 200 OK to prevent Telegram from retrying
 * 4. Errors are logged internally
 */
export async function handleWebhook(req: Request, res: Response): Promise<void> {
  try {
    // Parse and validate the incoming update
    if (!isValidUpdate(req.body)) {
      logError(new Error('Invalid update format'), 'webhook validation');
      res.json({ ok: true });
      return;
    }

    // Parse the update and extract relevant data
    const logEntry = parseUpdate(req.body);

    // Log the incoming message
    logMessage(logEntry);

    // Extract message text for agent
    const messageText = logEntry.text || '';

    if (messageText || logEntry.photoFileId) {
      // Run the agent to process the message
      const agentResponse: AgentResponse = await runAgent({
        userInput: messageText,
        userId: logEntry.userId,
        chatId: logEntry.chatId,
        photo: logEntry.photoFileId ? { fileId: logEntry.photoFileId } : undefined,
      });

      // Log agent response
      console.log(
        `[${new Date().toISOString()}] 📤 Agent Response: intent=${agentResponse.intent}, success=${agentResponse.success}`
      );

      if (!agentResponse.success && agentResponse.error) {
        logError(new Error(`Agent handler failed: ${agentResponse.error}`), `webhook:${agentResponse.intent}`);
      }

      await sendMessage(logEntry.chatId, agentResponse.message, agentResponse.replyMarkup);
    }

    // Always return 200 OK to Telegram
    res.json({ ok: true });
  } catch (error) {
    // Log internal error but still return 200 to Telegram
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError(new Error(errorMessage), 'webhook handler');

    // Always return 200 to prevent retries
    res.json({ ok: true });
  }
}
