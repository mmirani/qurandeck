import { cookies } from "next/headers";
import { BETA_COOKIE } from "@/auth";

export async function emailSignInAllowed(email: string) {
  if (process.env.AUTH_PUBLIC_SIGNUP === "true") return true;
  const allowlist =
    process.env.BETA_ALLOWED_EMAILS?.split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean) ?? [];
  if (allowlist.includes(email.trim().toLowerCase())) return true;
  const store = await cookies();
  return store.get(BETA_COOKIE)?.value === "1";
}
