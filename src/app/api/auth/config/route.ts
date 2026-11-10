import { appleClientSecretFromEnv } from "@/lib/apple-client-secret";
import { emailDeliveryMode, isHosted } from "@/lib/email-sign-in";

export const dynamic = "force-dynamic";

function appleEnabled() {
  if (!process.env.AUTH_APPLE_ID?.trim()) return false;
  try {
    return Boolean(appleClientSecretFromEnv(process.env));
  } catch {
    return false;
  }
}

export async function GET() {
  const hasSecret = Boolean(process.env.AUTH_SECRET);
  const passkey = hasSecret && (!isHosted(process.env) || Boolean(process.env.DATABASE_URL));
  return Response.json({
    google: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
    apple: appleEnabled(),
    github: false,
    email: hasSecret,
    emailDelivery: emailDeliveryMode(process.env),
    passkey,
    publicSignup: process.env.AUTH_PUBLIC_SIGNUP === "true",
    hasSecret,
  });
}
