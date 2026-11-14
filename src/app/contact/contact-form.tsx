"use client";

import { useState } from "react";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setStatus("sending");
        setError("");
        void fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, message }),
        })
          .then(async (response) => {
            if (!response.ok) {
              const body = (await response.json().catch(() => null)) as { error?: string } | null;
              throw new Error(body?.error || "Could not send that.");
            }
            setStatus("sent");
            setMessage("");
          })
          .catch((err: unknown) => {
            setStatus("error");
            setError(err instanceof Error ? err.message : "Could not send that.");
          });
      }}
    >
      <label className="block text-sm font-medium text-ink">
        Name <span className="font-normal text-ink-soft">(optional)</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="name"
          className="mt-2 h-12 w-full rounded-2xl border border-line bg-surface px-4 text-base text-ink outline-none"
        />
      </label>
      <label className="block text-sm font-medium text-ink">
        Email <span className="font-normal text-ink-soft">(optional, if you want a reply)</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          className="mt-2 h-12 w-full rounded-2xl border border-line bg-surface px-4 text-base text-ink outline-none"
        />
      </label>
      <label className="block text-sm font-medium text-ink">
        Message
        <textarea
          required
          minLength={8}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={6}
          className="mt-2 w-full rounded-2xl border border-line bg-surface px-4 py-4 text-base leading-7 text-ink outline-none"
        />
      </label>
      <button
        type="submit"
        disabled={status === "sending"}
        className="inline-flex h-12 items-center justify-center rounded-full bg-gold px-6 text-sm font-semibold text-on-gold disabled:opacity-60"
      >
        {status === "sending" ? "Sending…" : "Send feedback"}
      </button>
      {status === "sent" ? (
        <p className="text-sm text-ink" role="status">
          Thank you. Your message was sent.
        </p>
      ) : null}
      {status === "error" ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
