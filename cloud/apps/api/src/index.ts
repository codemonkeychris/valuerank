import { createServer } from './server.js';
import { config } from './config.js';
import { createLogger } from '@valuerank/shared';

const log = createLogger('api');

function main() {
  const app = createServer();

  const server = app.listen(config.PORT, () => {
    log.info({ port: config.PORT }, 'API server started');
  });

  // Graceful shutdown
  const shutdown = (signal: string) => {
    log.info({ signal }, 'Shutdown signal received');
    server.close(() => {
      log.info('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main();
