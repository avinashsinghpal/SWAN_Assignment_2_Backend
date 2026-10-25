const path = require('path');
const dotenv = require('dotenv');
const { z } = require('zod');

// Load environment variables from .env if present
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL: z.string().default('7d'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  COOKIE_DOMAIN: z.string().optional(),
  ENABLE_REMINDERS: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('Tasklane Notifications <noreply@tasklane.com>'),
  ALLOW_SEED: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
  SEED_ADMIN_PASSWORD: z.string().default('AdminPass123!'),
  SEED_USER_PASSWORD: z.string().default('UserPass123!'),
  ADMIN_SECRET_KEY: z.string().default('admin_secret_key_123')
});

let parsedEnv;

try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  if (process.env.NODE_ENV !== 'test') {
    console.error('Invalid environment configuration:');
    if (error.errors) {
      error.errors.forEach((err) => {
        console.error(`- ${err.path.join('.')}: ${err.message}`);
      });
    } else {
      console.error(error.message);
    }
    process.exit(1);
  } else {
    // Provide defaults for test environment if not configured
    parsedEnv = envSchema.parse({
      NODE_ENV: 'test',
      PORT: 5001,
      MONGODB_URI: 'mongodb://localhost:27017/tasklane-test',
      JWT_ACCESS_SECRET: 'test_access_secret_with_at_least_32_characters_length',
      JWT_REFRESH_SECRET: 'test_refresh_secret_with_at_least_32_characters_length',
      ADMIN_SECRET_KEY: 'admin_secret_key_123',
      ...process.env
    });
  }
}

module.exports = parsedEnv;
