import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/index.js";
import { user, session, account, verification } from "../db/schema.js";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "mysql",
    schema: {
        user,
        session,
        account,
        verification
    }
  }),
  emailAndPassword: {
    enabled: true 
  },
  socialProviders: {
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID || "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
    },
  },
  trustedOrigins: [
      process.env.PUBLIC_WEB_URL || "http://localhost:5173",
      process.env.PUBLIC_API_URL || "http://localhost:4000"
  ]
});
