import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { cookies } from "next/headers";
import { appleClientSecretFromEnv } from "@/lib/apple-client-secret";
import { verifyMagicToken } from "@/lib/magic-link";
import { getMagicLinkStore } from "@/lib/magic-link-store";

const BETA_COOKIE = "qurandeck-beta";

async function userFromToken(token: unknown) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || typeof token !== "string") return null;
  try {
    const email = await verifyMagicToken(token, secret, getMagicLinkStore());
    if (!email) return null;
    const local = email.split("@")[0] ?? email;
    const name = local.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return { id: email, email, name };
  } catch {
    console.error("Sign-in token verification failed");
    return null;
  }
}

function appleProvider() {
  const clientId = process.env.AUTH_APPLE_ID?.trim();
  if (!clientId) return null;
  try {
    const clientSecret = appleClientSecretFromEnv(process.env);
    if (!clientSecret) return null;
    return Apple({ clientId, clientSecret });
  } catch {
    console.error("Apple sign-in is misconfigured");
    return null;
  }
}

function buildProviders() {
  const providers: NonNullable<NextAuthConfig["providers"]> = [];

  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
    providers.push(Google);
  }

  const apple = appleProvider();
  if (apple) providers.push(apple);

  if (process.env.AUTH_SECRET) {
    providers.push(
      Credentials({
        id: "magic-link",
        name: "Email code",
        credentials: { token: { type: "text" } },
        authorize: (credentials) => userFromToken(credentials?.token),
      }),
      Credentials({
        id: "passkey",
        name: "Passkey",
        credentials: { token: { type: "text" } },
        authorize: (credentials) => userFromToken(credentials?.token),
      }),
    );
  }

  return providers;
}

async function canSignUp(email?: string | null) {
  if (process.env.AUTH_PUBLIC_SIGNUP === "true") return true;
  if (!email) return false;

  const allowlist =
    process.env.BETA_ALLOWED_EMAILS?.split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean) ?? [];
  if (allowlist.includes(email.toLowerCase())) return true;

  const store = await cookies();
  return store.get(BETA_COOKIE)?.value === "1";
}

export const authConfig = {
  providers: buildProviders(),
  pages: {
    signIn: "/",
    verifyRequest: "/auth/check-email",
    error: "/auth/error",
  },
  session: { strategy: "jwt" },
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  callbacks: {
    async signIn({ user }) {
      return canSignUp(user.email);
    },
    async jwt({ token, account, profile, user }) {
      if (user) {
        token.sub = user.id ?? token.sub;
        token.email = user.email ?? token.email;
        token.authProvider = account?.provider ?? "magic-link";
      }
      if (account?.provider) token.authProvider = account.provider;
      if (profile?.email && !token.email) token.email = profile.email;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.authProvider =
          typeof token.authProvider === "string" ? token.authProvider : undefined;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

export { BETA_COOKIE };
