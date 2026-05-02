import { Request, Response } from 'express';
/**
 * Telegram webhook endpoint handler
 * 1. Validates and parses Telegram update
 * 2. Runs agent when it can answer quickly and replies through the webhook response
 * 3. Falls back to a quick "working" response for slower jobs
 * 4. Always returns 200 OK to prevent Telegram retries
 */
export declare function handleWebhook(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=webhook.d.ts.map