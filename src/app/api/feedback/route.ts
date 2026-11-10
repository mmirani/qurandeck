import { saveFeedback } from "@/lib/feedback-store";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: { name?: unknown; email?: unknown; message?: unknown };
  try {
    body = (await request.json()) as { name?: unknown; email?: unknown; message?: unknown };
  } catch {
    return Response.json({ error: "Invalid message." }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  const email = typeof body.email === "string" ? body.email.trim().slice(0, 160) : "";

  if (message.length < 8 || message.length > 4000) {
    return Response.json({ error: "Write a note between a sentence and a page." }, { status: 400 });
  }
  if (email && !EMAIL.test(email)) {
    return Response.json({ error: "That email does not look complete." }, { status: 400 });
  }

  try {
    await saveFeedback({ name: name || null, email: email || null, message });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Feedback could not be saved just now. Please try again." }, { status: 503 });
  }
}
