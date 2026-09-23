import type { Session } from "next-auth";
import type { SessionUser } from "@/lib/quran/types";

function displayNameFromEmail(email: string) {
  const local = email.split("@")[0] ?? email;
  return local.replace(/[._-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function mapProvider(id?: string): SessionUser["provider"] {
  if (id === "google") return "google";
  if (id === "github") return "github";
  if (id === "resend") return "email";
  return "oauth";
}

export function sessionUserFromAuth(session: Session): SessionUser {
  const email = session.user.email ?? undefined;
  const name = session.user.name?.trim();
  const username = email ?? session.user.id;
  return {
    id: session.user.id,
    username,
    displayName: name || (email ? displayNameFromEmail(email) : "Reader"),
    email,
    provider: mapProvider(session.authProvider),
  };
}
