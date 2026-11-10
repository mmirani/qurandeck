import { randomBytes } from "node:crypto";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/types";
import { auth } from "@/auth";
import { EMAIL_CODE_EXCHANGE_TTL_MS } from "@/lib/email-code";
import { accountId } from "@/lib/library-seal";
import { createMagicToken } from "@/lib/magic-link";
import { base64urlToBytes, bytesToBase64url, passkeyRequestContext } from "@/lib/passkey";
import { getPasskeyStore } from "@/lib/passkey-store";
import { openText, sealText } from "@/lib/secret-box";

export const dynamic = "force-dynamic";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function unavailable() {
  return Response.json({ ok: false, error: "Passkeys are unavailable on this server." }, { status: 503 });
}

export async function POST(request: Request) {
  const secret = process.env.AUTH_SECRET;
  const store = getPasskeyStore();
  const context = passkeyRequestContext(request, process.env.AUTH_URL);
  if (!secret || !store || !context) return unavailable();

  let body: {
    action?: string;
    challengeId?: string;
    response?: RegistrationResponseJSON | AuthenticationResponseJSON;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  try {
    if (body.action === "register-options") {
      const session = await auth();
      const email = session?.user?.email?.trim().toLowerCase();
      if (!email) return Response.json({ ok: false, error: "Sign in first, then add a passkey." }, { status: 401 });
      const id = accountId(email);
      const existing = await store.listCredentials(id);
      const options = await generateRegistrationOptions({
        rpName: "QuranDeck",
        rpID: context.rpID,
        userID: id,
        userName: email,
        userDisplayName: session?.user?.name || email,
        attestationType: "none",
        authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
        excludeCredentials: existing.map((item) => ({
          id: base64urlToBytes(item.credentialId),
          type: "public-key" as const,
          transports: item.transports as ("internal" | "hybrid" | "usb")[],
        })),
      });
      const challengeId = randomBytes(16).toString("base64url");
      await store.saveChallenge(challengeId, {
        challenge: options.challenge,
        accountId: id,
        expiresAt: Date.now() + CHALLENGE_TTL_MS,
      });
      return Response.json({ ok: true, challengeId, options });
    }

    if (body.action === "register-verify") {
      const session = await auth();
      const email = session?.user?.email?.trim().toLowerCase();
      if (!email) return Response.json({ ok: false, error: "Sign in first, then add a passkey." }, { status: 401 });
      const challengeId = body.challengeId ?? "";
      const challenge = await store.takeChallenge(challengeId, Date.now());
      if (!challenge || challenge.accountId !== accountId(email) || !body.response) {
        return Response.json({ ok: false, error: "That passkey setup expired. Try again." }, { status: 400 });
      }
      const verification = await verifyRegistrationResponse({
        response: body.response as RegistrationResponseJSON,
        expectedChallenge: challenge.challenge,
        expectedOrigin: context.origin,
        expectedRPID: context.rpID,
      });
      if (!verification.verified || !verification.registrationInfo) {
        return Response.json({ ok: false, error: "Could not save that passkey." }, { status: 400 });
      }
      const transports = ((body.response as RegistrationResponseJSON).response?.transports ?? []).map((item) => String(item));
      await store.saveCredential({
        credentialId: bytesToBase64url(verification.registrationInfo.credentialID),
        accountId: accountId(email),
        emailSealed: sealText(email, secret),
        publicKey: bytesToBase64url(verification.registrationInfo.credentialPublicKey),
        counter: verification.registrationInfo.counter,
        transports,
      });
      return Response.json({ ok: true });
    }

    if (body.action === "authenticate-options") {
      const options = await generateAuthenticationOptions({
        rpID: context.rpID,
        userVerification: "preferred",
      });
      const challengeId = randomBytes(16).toString("base64url");
      await store.saveChallenge(challengeId, {
        challenge: options.challenge,
        accountId: null,
        expiresAt: Date.now() + CHALLENGE_TTL_MS,
      });
      return Response.json({ ok: true, challengeId, options });
    }

    if (body.action === "authenticate-verify") {
      const challenge = await store.takeChallenge(body.challengeId ?? "", Date.now());
      const response = body.response as AuthenticationResponseJSON | undefined;
      if (!challenge || !response?.id) {
        return Response.json({ ok: false, error: "That passkey sign-in expired. Try again." }, { status: 400 });
      }
      const credential = await store.findCredential(response.id);
      if (!credential) {
        return Response.json({ ok: false, error: "No passkey on this account for this device." }, { status: 401 });
      }
      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challenge.challenge,
        expectedOrigin: context.origin,
        expectedRPID: context.rpID,
        authenticator: {
          credentialID: base64urlToBytes(credential.credentialId),
          credentialPublicKey: base64urlToBytes(credential.publicKey),
          counter: credential.counter,
          transports: credential.transports as ("internal" | "hybrid" | "usb")[],
        },
      });
      if (!verification.verified) {
        return Response.json({ ok: false, error: "Could not verify that passkey." }, { status: 401 });
      }
      await store.updateCounter(credential.credentialId, verification.authenticationInfo.newCounter);
      const email = openText(credential.emailSealed, secret);
      if (!email) return Response.json({ ok: false, error: "Could not verify that passkey." }, { status: 401 });
      return Response.json({
        ok: true,
        token: createMagicToken(email, secret, Date.now(), EMAIL_CODE_EXCHANGE_TTL_MS),
      });
    }
  } catch {
    console.error("Passkey request failed");
    return Response.json({ ok: false, error: "Could not use that passkey." }, { status: 400 });
  }

  return Response.json({ ok: false, error: "Invalid request." }, { status: 400 });
}
