import { Request, Response } from 'express';
/**
 * Telegram webhook endpoint handler
 * 1. Validates and parses Telegram update
 * 2. Runs agent to classify intent and handle request
 * 3. Always returns 200 OK to prevent Telegram from retrying
 * 4. Errors are logged internally
 */
export declare function handleWebhook(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=webhook.d.ts.map