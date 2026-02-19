import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  // Server
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),

  // Auth
  JWT_SECRET: z.string().min(32),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  // Stripe
  STRIPE_SECRET_KEY: z.string().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().default(''),

  // Brevo (email)
  BREVO_API_KEY: z.string().default(''),

  // Twilio (SMS / WhatsApp)
  TWILIO_ACCOUNT_SID: z.string().default(''),
  TWILIO_AUTH_TOKEN: z.string().default(''),
  TWILIO_PHONE_NUMBER: z.string().default(''),

  // Bridge (banking)
  BRIDGE_CLIENT_ID: z.string().default(''),
  BRIDGE_CLIENT_SECRET: z.string().default(''),

  // Sentry
  SENTRY_DSN: z.string().default(''),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    console.error(`[env] Missing or invalid environment variables:\n${formatted}`);
    process.exit(1);
  }

  return parsed.data;
}

export const env = loadEnv();

export type Env = z.infer<typeof envSchema>;
