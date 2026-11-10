import { auth } from "@/auth";
import { getSql } from "@/lib/db";
import { deleteStoredAccount } from "@/lib/delete-account";
import { getEmailCodeStore } from "@/lib/email-code-store";
import { prepareLibraryStore } from "@/lib/library-seal";
import { getPasskeyStore } from "@/lib/passkey-store";

export const dynamic = "force-dynamic";

type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;

export async function DELETE(request: Request) {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return Response.json({ ok: false, error: "Sign in required." }, { status: 401 });

  let confirm = "";
  try {
    const body = (await request.json()) as { confirm?: unknown };
    confirm = typeof body.confirm === "string" ? body.confirm.trim().toLowerCase() : "";
  } catch {
    return Response.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  if (confirm !== "delete") {
    return Response.json({ ok: false, error: "Type delete to confirm." }, { status: 400 });
  }
  if (!process.env.DATABASE_URL) {
    return Response.json({ ok: false, error: "This server is not storing an account library." }, { status: 503 });
  }

  try {
    await prepareLibraryStore();
    const passkeys = getPasskeyStore();
    const codes = getEmailCodeStore();
    const sql = getSql() as unknown as Sql;
    const removed = await deleteStoredAccount(
      {
        async remove(table, column, value) {
          if (table === "libraries" && column === "account_id") {
            const rows = (await sql`DELETE FROM libraries WHERE account_id = ${value} RETURNING account_id`) as unknown[];
            return Array.isArray(rows) ? rows.length : 0;
          }
          if (table === "passkey_credentials" && column === "account_id") {
            return (await passkeys?.deleteAccount(value)) ?? 0;
          }
          if (table === "passkey_challenges") return 0;
          if (table === "email_signin_codes" && column === "email_hash" && codes && "deleteHash" in codes) {
            return (codes as EmailCodeStoreWithDelete).deleteHash(value);
          }
          return 0;
        },
      },
      email,
    );
    return Response.json({
      ok: true,
      libraries: removed.libraries,
      passkeys: removed.passkeys,
      codes: removed.codes,
    });
  } catch {
    console.error("Account deletion failed");
    return Response.json({ ok: false, error: "Could not delete the account." }, { status: 503 });
  }
}

type EmailCodeStoreWithDelete = {
  deleteHash(emailHash: string): Promise<number>;
};
