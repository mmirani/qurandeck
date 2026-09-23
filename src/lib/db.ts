import { neon } from "@neondatabase/serverless";

let client: ReturnType<typeof neon> | null = null;

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  if (!client) client = neon(url);
  return client;
}
