import express, { Request, Response, NextFunction } from 'express';
import { config, getWebhookPath } from './config';
import { requestLogger, logError } from './middleware/logger';
import { handleWebhook } from './routes/webhook';

const app = express();

// Middleware
app.use(express.json());
app.use(requestLogger());

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Telegram webhook endpoint with secret in path
const webhookPath = getWebhookPath();
app.post(webhookPath, handleWebhook);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  logError(error, 'global error handler');
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = config.port;
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Telegram Bot Webhook Server started`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🔐 Webhook: POST ${webhookPath}`);
  console.log(`🏥 Health: GET /health`);
  console.log(`🌍 Environment: ${config.nodeEnv}\n`);
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

export default app;
