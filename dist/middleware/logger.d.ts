import { Request, Response, NextFunction } from 'express';
import { LogEntry } from '../types/telegram';
/**
 * Format and output structured log entries
 */
export declare function formatLog(entry: LogEntry): string;
/**
 * Log a message event with minimal structured data
 */
export declare function logMessage(entry: LogEntry): void;
/**
 * Express middleware for request logging
 */
export declare function requestLogger(): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Log errors with structured data
 */
export declare function logError(error: Error, context: string): void;
//# sourceMappingURL=logger.d.ts.map