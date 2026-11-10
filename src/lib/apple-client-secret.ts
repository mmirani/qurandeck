import { sign } from "node:crypto";

export type AppleSecretInput = {
  teamId: string;
  keyId: string;
  clientId: string;
  privateKey: string;
  now?: number;
};

function b64url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

/** Apple client secrets are ES256 JWTs and expire after at most six months. */
export function appleClientSecret(input: AppleSecretInput) {
  const now = Math.floor((input.now ?? Date.now()) / 1000);
  const header = b64url(JSON.stringify({ alg: "ES256", kid: input.keyId.trim() }));
  const payload = b64url(
    JSON.stringify({
      iss: input.teamId.trim(),
      iat: now,
      exp: now + 60 * 60 * 24 * 150,
      aud: "https://appleid.apple.com",
      sub: input.clientId.trim(),
    }),
  );
  const data = `${header}.${payload}`;
  const privateKey = input.privateKey.includes("\\n") ? input.privateKey.replaceAll("\\n", "\n") : input.privateKey;
  const signature = sign("sha256", Buffer.from(data), { key: privateKey, dsaEncoding: "ieee-p1363" });
  return `${data}.${signature.toString("base64url")}`;
}

export function appleClientSecretFromEnv(env: NodeJS.ProcessEnv, now?: number) {
  const configured = env.AUTH_APPLE_SECRET?.trim();
  if (configured) return configured;
  const clientId = env.AUTH_APPLE_ID?.trim();
  const teamId = env.AUTH_APPLE_TEAM_ID?.trim();
  const keyId = env.AUTH_APPLE_KEY_ID?.trim();
  const privateKey = env.AUTH_APPLE_PRIVATE_KEY?.trim();
  if (!clientId || !teamId || !keyId || !privateKey) return null;
  return appleClientSecret({ teamId, keyId, clientId, privateKey, now });
}
