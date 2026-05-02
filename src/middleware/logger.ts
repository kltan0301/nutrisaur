import { Request, Response, NextFunction } from 'express';
import { LogEntry } from '../types/telegram';

/**
 * Format and output structured log entries
 */
export function formatLog(entry: LogEntry): string {
  return JSON.stringify({
    ...entry,
    timestamp: entry.timestamp,
  });
}

/**
 * Log a message event with minimal structured data
 */
export function logMessage(entry: LogEntry): void {
  console.log(`[${entry.timestamp}] 📨 Chat:${entry.chatId}${entry.userId ? ` User:${entry.userId}` : ''} Intent:${entry.intent}`);
  if (entry.text) {
    console.log(`   Message: ${entry.text.substring(0, 100)}${entry.text.length > 100 ? '...' : ''}`);
  }
}

/**
 * Express middleware for request logging
 */
export function requestLogger() {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const method = req.method;
    const path = req.path;

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const status = res.statusCode;
      console.log(`[${new Date().toISOString()}] ${method} ${path} ${status} ${duration}ms`);
    });

    next();
  };
}

/**
 * Log errors with structured data
 */
export function logError(error: Error, context: string): void {
  console.error(`[${new Date().toISOString()}] ❌ Error in ${context}:`, error.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(error.stack);
  }
}
