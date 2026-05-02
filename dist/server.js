"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const config_1 = require("./config");
const logger_1 = require("./middleware/logger");
const webhook_1 = require("./routes/webhook");
const app = (0, express_1.default)();
// Middleware
app.use(express_1.default.json());
app.use((0, logger_1.requestLogger)());
// Health check endpoint
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Telegram webhook endpoint with secret in path
const webhookPath = (0, config_1.getWebhookPath)();
app.post(webhookPath, webhook_1.handleWebhook);
// 404 handler
app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
});
// Global error handler
app.use((error, _req, res, _next) => {
    (0, logger_1.logError)(error, 'global error handler');
    res.status(500).json({ error: 'Internal server error' });
});
// Start server
const PORT = config_1.config.port;
const server = app.listen(PORT, () => {
    console.log(`\n🚀 Telegram Bot Webhook Server started`);
    console.log(`📍 Port: ${PORT}`);
    console.log(`🔐 Webhook: POST ${webhookPath}`);
    console.log(`🏥 Health: GET /health`);
    console.log(`🌍 Environment: ${config_1.config.nodeEnv}\n`);
});
// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n⛔ SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});
process.on('SIGINT', () => {
    console.log('\n⛔ SIGINT received, shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});
exports.default = app;
//# sourceMappingURL=server.js.map