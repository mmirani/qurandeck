import { auth } from "@/auth";
import { getSql } from "@/lib/db";
import { validateDisplayName } from "@/lib/display-name";
import { normalizeLibrary, type LibrarySnapshot } from "@/lib/library";

const MAX_BYTES = 500_000;

async function ensureTable() {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS libraries (
      email text PRIMARY KEY,
      data jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
}

async function requireEmail() {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return null;
  return email;
}

export async function GET() {
  const email = await requireEmail();
  if (!email) return Response.json({ error: "Sign in required." }, { status: 401 });

  try {
    await ensureTable();
    const sql = getSql();
    const rows = (await sql`
      SELECT data, updated_at
      FROM libraries
      WHERE email = ${email}
      LIMIT 1
    `) as { data?: unknown; updated_at?: string }[];
    const row = rows[0];
    if (!row) return Response.json({ library: null, updatedAt: null });
    return Response.json({
      library: normalizeLibrary(row.data),
      updatedAt: row.updated_at ?? null,
    });
  } catch {
    return Response.json({ error: "Library is unavailable." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const email = await requireEmail();
  if (!email) return Response.json({ error: "Sign in required." }, { status: 401 });

  const rawText = await request.text();
  if (rawText.length > MAX_BYTES) {
    return Response.json({ error: "Library is too large to sync." }, { status: 413 });
  }

  let body: { library?: unknown };
  try {
    body = JSON.parse(rawText) as { library?: unknown };
  } catch {
    return Response.json({ error: "Invalid library." }, { status: 400 });
  }

  const library = normalizeLibrary(body.library);
  if (!library) return Response.json({ error: "Invalid library." }, { status: 400 });
  if (library.displayName) {
    const nameError = validateDisplayName(library.displayName);
    if (nameError) return Response.json({ error: nameError }, { status: 400 });
  }

  try {
    await ensureTable();
    const sql = getSql();
    const rows = (await sql`
      INSERT INTO libraries (email, data, updated_at)
      VALUES (${email}, ${JSON.stringify(library)}::jsonb, now())
      ON CONFLICT (email) DO UPDATE
      SET data = EXCLUDED.data, updated_at = now()
      RETURNING updated_at
    `) as { updated_at?: string }[];
    const updatedAt = rows[0]?.updated_at ?? null;
    return Response.json({ ok: true, updatedAt });
  } catch {
    return Response.json({ error: "Could not save library." }, { status: 503 });
  }
}

export type { LibrarySnapshot };
