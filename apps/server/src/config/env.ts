import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(3001),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().min(1),
  FIREBASE_PRIVATE_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional()
})

export const env = envSchema.parse(process.env)
