import { LogEntry } from '../types/telegram';
/**
 * Parse and extract relevant data from Telegram webhook update
 * Returns structured log entry
 */
export declare function parseUpdate(body: any): LogEntry;
export declare function telegramMethod(method: string, payload: Record<string, unknown>): Record<string, unknown>;
export declare function sendMessage(chatId: number, text: string, replyMarkup?: unknown): Promise<void>;
export declare function downloadTelegramFile(fileId: string): Promise<{
    data: string;
    mimeType: string;
}>;
/**
 * Validate that the update looks like a valid Telegram update
 */
export declare function isValidUpdate(body: any): boolean;
//# sourceMappingURL=telegram.d.ts.map