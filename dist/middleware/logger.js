"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatLog = formatLog;
exports.logMessage = logMessage;
exports.requestLogger = requestLogger;
exports.logError = logError;
/**
 * Format and output structured log entries
 */
function formatLog(entry) {
    return JSON.stringify({
        ...entry,
        timestamp: entry.timestamp,
    });
}
/**
 * Log a message event with minimal structured data
 */
function logMessage(entry) {
    console.log(`[${entry.timestamp}] 📨 Chat:${entry.chatId}${entry.userId ? ` User:${entry.userId}` : ''} Intent:${entry.intent}`);
    if (entry.text) {
        console.log(`   Message: ${entry.text.substring(0, 100)}${entry.text.length > 100 ? '...' : ''}`);
    }
}
/**
 * Express middleware for request logging
 */
function requestLogger() {
    return (req, res, next) => {
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
function logError(error, context) {
    console.error(`[${new Date().toISOString()}] ❌ Error in ${context}:`, error.message);
    if (process.env.NODE_ENV === 'development') {
        console.error(error.stack);
    }
}
//# sourceMappingURL=logger.js.map