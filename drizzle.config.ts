import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load .env.local for local dev, but only if DATABASE_URL isn't already set.
// When running db:migrate:neon, dotenv-cli injects DATABASE_URL from .env.neon
// before this file loads — skipping this prevents it from being overwritten.
if (!process.env.DATABASE_URL) {
    dotenv.config({ path: ".env.local" });
}

export default defineConfig({
    schema: "./src/db/schema.ts",
    out: "./drizzle",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
});
