import { missedShape } from "@/lib/guide/missed-shape";

const sent = new Set<string>();

/**
 * When Sana does not understand, send only the anonymous shape of the command.
 * The shape is built here in the browser, so the typed words never leave the device.
 * Each shape is sent at most once per page load, without cookies. Never throws.
 */
export function reportMissedCommand(raw: string, post: typeof fetch | null = typeof fetch === "function" ? fetch : null) {
  try {
    const shape = missedShape(raw);
    if (!shape || sent.has(shape) || !post) return null;
    sent.add(shape);
    void post("/api/sana/missed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shape }),
      credentials: "omit",
      keepalive: true,
    }).catch(() => undefined);
    return shape;
  } catch {
    return null;
  }
}
