import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { cookies } from "next/headers";

const BETA_COOKIE = "qurandeck-beta";

function buildProviders() {
  const providers: NonNullable<NextAuthConfig["providers"]> = [];

  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
    providers.push(Google);
  }

  if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
    providers.push(GitHub);
  }

  if (process.env.AUTH_RESEND_KEY) {
    providers.push(
      Resend({
        from: process.env.AUTH_EMAIL_FROM ?? "QuranDeck <onboarding@resend.dev>",
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
    async jwt({ token, account, profile }) {
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
