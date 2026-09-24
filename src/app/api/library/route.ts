import { auth } from "@/auth";
import { validateAvatar } from "@/lib/avatar";
import { getSql } from "@/lib/db";
import { validateDisplayName } from "@/lib/display-name";
import { normalizeLibrary, type LibrarySnapshot } from "@/lib/library";
import { accountId, openLibrary, prepareLibraryStore, sealLibrary } from "@/lib/library-seal";

const MAX_BYTES = 500_000;

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
    await prepareLibraryStore();
    const sql = getSql();
    const rows = (await sql`
      SELECT sealed, updated_at
      FROM libraries
      WHERE account_id = ${accountId(email)}
      LIMIT 1
    `) as { sealed?: string; updated_at?: string }[];
    const row = rows[0];
    if (!row?.sealed) return Response.json({ library: null, updatedAt: null });
    return Response.json({
      library: normalizeLibrary(openLibrary(row.sealed)),
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
  const submitted = body.library as { avatar?: unknown };
  if (typeof submitted.avatar === "string" && submitted.avatar) {
    const avatarError = validateAvatar(submitted.avatar);
    if (avatarError) return Response.json({ error: avatarError }, { status: 400 });
  }

  try {
    await prepareLibraryStore();
    const sql = getSql();
    const rows = (await sql`
      INSERT INTO libraries (account_id, sealed, updated_at)
      VALUES (${accountId(email)}, ${sealLibrary(library)}, now())
      ON CONFLICT (account_id) DO UPDATE
      SET sealed = EXCLUDED.sealed, updated_at = now()
      RETURNING updated_at
    `) as { updated_at?: string }[];
    const updatedAt = rows[0]?.updated_at ?? null;
    return Response.json({ ok: true, updatedAt });
  } catch {
    return Response.json({ error: "Could not save library." }, { status: 503 });
  }
}

export type { LibrarySnapshot };
