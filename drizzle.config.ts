import { defineConfig } from 'drizzle-kit'
import * as dotenv from 'dotenv'

// Load .env.local for drizzle-kit commands (Next.js doesn't load this for CLI tools)
dotenv.config({ path: '.env.local' })

export default defineConfig({
  out: './drizzle',
  schema: './db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
})
