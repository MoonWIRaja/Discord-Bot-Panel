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
  basePath: "/api/auth",
  baseURL: process.env.PUBLIC_API_URL || "http://localhost:4000",
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
        user,
        session,
        account,
        verification
    }
  }),
  emailAndPassword: {
    enabled: false 
  },
  socialProviders: {
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID || "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
      redirectURI: `${process.env.PUBLIC_API_URL || "http://localhost:4000"}/api/auth/callback/discord`,
    },
  },
  trustedOrigins: [
      process.env.PUBLIC_WEB_URL || "http://localhost:5173",
      process.env.PUBLIC_API_URL || "http://localhost:4000"
  ],
  session: {
    cookieCrossSite: true,
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24 // 1 day
  },
  advanced: {
    useSecureCookies: false, // Disable secure cookies requirement for testing
    crossSubDomainCookies: {
      enabled: false // Disable cross-subdomain for now
    },
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: false, // Allow non-HTTPS for state cookie
      httpOnly: true,
      path: "/"
    }
  }
});
