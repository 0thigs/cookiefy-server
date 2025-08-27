import { buildServer } from './interfaces/http/server.js';
import { env } from './config/env.js';

const app = buildServer();

app
  .listen({ port: env.PORT, host: '0.0.0.0' })
  .then((address) => {
    console.log(`HTTP server listening on ${address}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
