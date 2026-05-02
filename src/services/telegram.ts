import axios from 'axios';
import { config } from '../config';
import { TelegramUpdate, LogEntry } from '../types/telegram';

/**
 * Detect intent from message text using keyword matching
 * Returns a simple intent string for logging
 */
function detectIntent(text: string | undefined): string {
  if (!text) return 'unknown';

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
export function parseUpdate(body: any): LogEntry {
  try {
    const update: TelegramUpdate = body;

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
  } catch (error) {
    return {
      timestamp: new Date().toISOString(),
      chatId: 0,
      intent: 'parse_error',
    };
  }
}

export async function sendMessage(chatId: number, text: string, replyMarkup?: unknown): Promise<void> {
  if (!config.telegramBotToken) {
    console.log(`[${new Date().toISOString()}] Telegram send skipped: TELEGRAM_BOT_TOKEN missing`);
    console.log(text);
    return;
  }

  await axios.post(`https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`, {
    chat_id: chatId,
    text,
    reply_markup: replyMarkup,
  });
}

export async function downloadTelegramFile(fileId: string): Promise<{ data: string; mimeType: string }> {
  if (!config.telegramBotToken) {
    throw new Error('TELEGRAM_BOT_TOKEN is required to download Telegram photos');
  }

  const fileResponse = await axios.get(`https://api.telegram.org/bot${config.telegramBotToken}/getFile`, {
    params: { file_id: fileId },
  });

  const filePath = fileResponse.data?.result?.file_path;
  if (!filePath) {
    throw new Error('Telegram did not return a file_path for this photo');
  }

  const imageResponse = await axios.get(`https://api.telegram.org/file/bot${config.telegramBotToken}/${filePath}`, {
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
export function isValidUpdate(body: any): boolean {
  return (
    body &&
    typeof body === 'object' &&
    typeof body.update_id === 'number' &&
    (body.message || body.edited_message || body.channel_post || body.edited_channel_post)
  );
}
