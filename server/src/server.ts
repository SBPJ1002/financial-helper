import app from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { startAllJobs } from './jobs/index.js';

async function main() {
  // Verify DB connection
  await prisma.$connect();
  console.log('Connected to database');

  // Start all cron jobs
  startAllJobs();

  app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
