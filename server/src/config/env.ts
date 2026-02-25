import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(10),
  JWT_EXPIRES_IN: z.string().default('7d'),
  GOOGLE_AI_API_KEY: z.string().optional(),
  ENCRYPTION_KEY: z.string().min(32).optional(),
  DEFAULT_AI_API_KEY: z.string().optional(),
  DEFAULT_AI_MODEL: z.string().optional(),
  ALPHA_VANTAGE_API_KEY: z.string().optional(),
  PLUGGY_CLIENT_ID: z.string().optional(),
  PLUGGY_CLIENT_SECRET: z.string().optional(),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

export const env = envSchema.parse(process.env);
