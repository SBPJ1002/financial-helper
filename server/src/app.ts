import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import routes from './routes/index.js';

const app = express();

// Trust first proxy (Render, Railway, etc.)
if (env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security
app.use(
  helmet({
    contentSecurityPolicy: env.NODE_ENV === 'production' ? false : undefined,
  }),
);
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));

// Rate limiting
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// Body parsing
app.use(express.json({ limit: '1mb' }));

// Routes
app.use('/api', routes);

// Serve static files in production (single-service deploy)
if (env.NODE_ENV === 'production') {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const clientDist = path.join(__dirname, '../../client/dist');

  app.use(express.static(clientDist));

  // SPA catch-all: any non-API route returns index.html
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Error handler (must be last)
app.use(errorHandler);

export default app;
