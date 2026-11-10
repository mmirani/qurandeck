import assert from "node:assert/strict";
import { generateKeyPairSync, verify } from "node:crypto";
import { describe, it } from "node:test";
import { appleClientSecret } from "../src/lib/apple-client-secret";

describe("Apple client secret", () => {
  it("signs an ES256 JWT for the Services ID", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const token = appleClientSecret({
      teamId: "TEAMID1234",
      keyId: "KEYID12345",
      clientId: "com.example.qurandeck",
      privateKey: pem.replaceAll("\n", "\\n"),
      now: 1_700_000_000_000,
    });
    const [header, payload, signature] = token.split(".");
    assert.equal(token.split(".").length, 3);
    const decodedHeader = JSON.parse(Buffer.from(header ?? "", "base64url").toString("utf8")) as { kid?: string };
    const decoded = JSON.parse(Buffer.from(payload ?? "", "base64url").toString("utf8")) as {
      iss?: string;
      sub?: string;
      aud?: string;
    };
    assert.equal(decodedHeader.kid, "KEYID12345");
    assert.equal(decoded.iss, "TEAMID1234");
    assert.equal(decoded.sub, "com.example.qurandeck");
    assert.equal(decoded.aud, "https://appleid.apple.com");
    const ok = verify(
      "sha256",
      Buffer.from(`${header}.${payload}`),
      { key: publicKey, dsaEncoding: "ieee-p1363" },
      Buffer.from(signature ?? "", "base64url"),
    );
    assert.equal(ok, true);
  });
});
