"use client";

import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/types";
import { signIn } from "next-auth/react";
import { coarseClientAuthFailure } from "@/lib/usage-catalog";
import { rememberAuthMethod, trackUsage } from "@/lib/usage-client";

async function postPasskey(body: unknown) {
  const response = await fetch("/api/auth/passkey", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as { ok?: boolean; error?: string; token?: string; challengeId?: string; options?: unknown };
  if (!response.ok || !data.ok) throw new Error(data.error ?? "Could not use a passkey.");
  return data;
}

export async function signInWithPasskey() {
  rememberAuthMethod("passkey");
  trackUsage({ name: "auth_requested", method: "passkey" });
  try {
    const started = await postPasskey({ action: "authenticate-options" });
    const assertion = await startAuthentication(started.options as Parameters<typeof startAuthentication>[0]);
    const verified = await postPasskey({
      action: "authenticate-verify",
      challengeId: started.challengeId,
      response: assertion satisfies AuthenticationResponseJSON,
    });
    if (!verified.token) throw new Error("Could not start the session.");
    const result = await signIn("passkey", { token: verified.token, callbackUrl: "/read", redirect: false });
    if (result?.ok && !result.error) {
      window.location.assign(`${window.location.origin}/read`);
      return;
    }
    throw new Error("Could not start the session.");
  } catch (error) {
    trackUsage({ name: "auth_failed", method: "passkey", reason: coarseClientAuthFailure(error) });
    throw error;
  }
}

export async function addPasskey() {
  const started = await postPasskey({ action: "register-options" });
  const credential = await startRegistration(started.options as Parameters<typeof startRegistration>[0]);
  await postPasskey({
    action: "register-verify",
    challengeId: started.challengeId,
    response: credential satisfies RegistrationResponseJSON,
  });
}
