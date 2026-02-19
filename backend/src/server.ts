import app from './index';
import { env } from './config/env';
import { logger } from './utils/logger';
import { startScheduler, stopScheduler } from './jobs';

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

const PORT = env.PORT;

app.listen(PORT, () => {
  logger.info(`Vision CRM API server running`, {
    port: PORT,
    env: env.NODE_ENV,
    url: `http://localhost:${PORT}`,
  });

  // Start background job scheduler after the server is listening
  startScheduler();
});

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

function handleShutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully`);
  stopScheduler();
  process.exit(0);
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
