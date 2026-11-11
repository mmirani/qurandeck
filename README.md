# QuranDeck

A personal mushaf for The Noble Quran. Readers can search, listen, keep a place, and save notes. Guests stay on the device. A signed-in library syncs in sealed form.

Production: [qurandeck.vercel.app](https://qurandeck.vercel.app)

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3310](http://localhost:3310). Port 3310 is used locally so it does not collide with other apps on 3000.

## What a reader gets

- Surah and juz reading, with a thin progress bar on phone and along the bottom of the center pane from tablet width up.
- Ayah-by-ayah mode on phones shows Arabic and English together and scales short ayahs to the screen.
- Search by word, theme, surah name, or a verse key such as `2:255`.
- Recitation from the surah, the current ayah, or a word. On phones the player is a small bar only while audio is playing.
- Sana (سَنَا) is the reading companion. On phones it is a small corner control that opens on tap, and it stays hidden in ayah-by-ayah mode.
- Notes, favorites, highlights, a completion map of ayahs you have opened, personal lists of finished surahs and ayahs you return to, and reading time. Those lists are reading notes, not scores.
- Themes, text size, translations, tafsir, and reciter live in the account panel.

## Accounts

Reading, bookmarks, notes, and highlights work without an account. Sign-in is offered when you want the library on another device.

Email is the account key. The sign-in email carries a 6-digit code that expires in about 10 minutes and works once. In production, and on any Vercel deployment, that code is emailed with Resend and is never returned by the API or shown in the sign-in window. If `AUTH_RESEND_KEY` or `AUTH_EMAIL_FROM` is missing there, email sign-in fails instead of displaying a code. Local `next dev` can show the code only when those mail variables are unset.

Google and Sign in with Apple are the primary buttons when their credentials are set. GitHub is not offered. After the first sign-in, the account panel can add a passkey. Later visits can sign in with that passkey. Passkeys use SimpleWebAuthn and finish in an Auth.js credential session. The experimental Auth.js Passkey provider is not used, because it requires database sessions and an Auth.js user table.

The first sign-in merges the guest library already in this browser into the account: notes on the same ayah keep the newer text, bookmarks and highlights are not duplicated, and reading progress is combined. Delete my account, in the account panel, removes that email’s sealed library, passkeys, and unused codes from Neon after you type `delete`.

The name in the app is a display name. It is not unique. Offensive language is rejected. There is no public username yet. A profile photo or one of the built-in icons can sit beside that name; the photo is cropped small before it is sealed with the library.

Clicking the name opens one account panel: Progress, Saved, Settings, and Sign out, with the greeting “Assalamu alaykum, {name}.”

## Where data lives

Guest preferences, place, favorites, notes, highlights, and progress stay in this browser (`localStorage` keys prefixed `al-mushaf-`). They are not written to the database.

After sign-in, `LibrarySync` merges that device library with `GET/PUT /api/library`. The Neon table `libraries` stores:

- `account_id`: HMAC-SHA256 of the normalized email, keyed with `AUTH_SECRET`. The email is not a column.
- `sealed`: AES-256-GCM ciphertext of the library JSON (preferences, bookmarks, notes, highlights, swatches, progress including ayah visit counts, display name, profile photo or icon).
- `updated_at`

On each successful library put, QuranDeck compares the previous sealed visit map with the new one and may add one anonymous opening per ayah per account per day to `reading_ranks` (`verse_key`, `visits`), capped at 40 new ayahs a day. That table has no account id. It is a usage counter, not a spiritual score. Public read: `GET /api/ranks`. Before launch, set `RANK_RESET_TOKEN` and `POST /api/ranks/reset` with `Authorization: Bearer <token>` to clear test totals.

Anonymous product events live in `usage_events` (`event_type`, `method`, `subject_hash`, `created_at`). The subject is an HMAC of a random guest id or the account email, keyed from `AUTH_SECRET` separately from `account_id`. The table does not store emails, names, IP addresses, user agents, or reading content. A guest session starts from a random id in `localStorage` (`al-mushaf-anon`), not a cookie. `POST /api/usage` accepts only `guest_started` and, when signed in, `guest_merge`. Sign-up, sign-in, and account deletion are recorded on the server. Rows older than 13 months are deleted when the table is prepared. `/admin/stats` is visible to emails in `ADMIN_EMAILS` and returns 404 for everyone else.

Vercel Web Analytics and Speed Insights load from the root layout. Enable both in the Vercel project or they have nothing to report. Query strings are stripped before a page view is sent, and `/api/auth` is skipped.

QuranDeck can decrypt a library while the reader is signed in, so sync works. The libraries table itself is not readable text. Deleting a cloud library is a request for now; there is no delete button yet. Platform rank totals are anonymous and are not unwound when a library is deleted.

Used sign-in tokens are stored in `magic_link_tokens` (`jti`, `expires_at`) so a link works once. Request counters live in `auth_rate_limits`. Neither table stores the email address.

Do not commit `.env*` or print `DATABASE_URL` / `AUTH_SECRET`.

## Environment

Copy `.env.example` to `.env.local`. Required for sign-in and library sync:

- `AUTH_SECRET` — signs the session and encrypts the library. Use a long random string.
- `AUTH_URL` — public origin baked into emailed sign-in links, such as `https://qurandeck.vercel.app`. No trailing slash.
- `DATABASE_URL` — Neon Postgres connection string. Also stores consumed sign-in tokens, rate-limit counters, and anonymous usage events.
- `ADMIN_EMAILS` — comma-separated owner emails allowed to open `/admin/stats`. Compared with the signed-in session on the server. Unset or empty means nobody.
- `AUTH_RESEND_KEY` — Resend API key. Required for email sign-in in production.
- `AUTH_EMAIL_FROM` — sender on a domain verified in Resend, such as `QuranDeck <sign-in@example.com>`. Required for email sign-in in production.

`AUTH_PUBLIC_SIGNUP=true` allows any email. Leave it unset for an invite-only beta. Invite-only mode uses `BETA_INVITE_SECRET` (the code is compared in constant time) and an optional `BETA_ALLOWED_EMAILS` comma-separated list.

Google: `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`. Redirect URL `https://qurandeck.vercel.app/api/auth/callback/google` and the same path on `qurandeck.com` and `www.qurandeck.com`.

Apple: `AUTH_APPLE_ID` is the Services ID. Set `AUTH_APPLE_SECRET` to the client-secret JWT, or set `AUTH_APPLE_TEAM_ID`, `AUTH_APPLE_KEY_ID`, and `AUTH_APPLE_PRIVATE_KEY` (the `.p8` contents) and QuranDeck signs the JWT. Return URL `https://qurandeck.vercel.app/api/auth/callback/apple`, plus the same path on `qurandeck.com` and `www.qurandeck.com`.

Passkeys are bound to the site host. A passkey created on `qurandeck.com` does not sign in on `qurandeck.vercel.app`. `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` are ignored.

Before a public deploy, verify the sending domain in Resend and set `AUTH_RESEND_KEY`, `AUTH_EMAIL_FROM`, and `AUTH_URL` in the Vercel project. `onboarding@resend.dev` only delivers to the Resend account owner, so it is not a production sender. Until the mail variables are set, production email sign-in returns an error and does not reveal a link.

## Legal

- [/privacy](https://qurandeck.vercel.app/privacy)
- [/terms](https://qurandeck.vercel.app/terms)

Footer links on the home page. Both are dated from the beta behavior above: no ads, no sale of reading data, cookieless usage counts, Quran text and audio fetched without sending notes or email.

## Sources

Quran data provided by Quran.Foundation. The translation, tafsir, and reciter named in the reader are the credits for that edition.

- [Quran Foundation Content API](https://api-docs.quran.foundation/) — chapters, verses, word-by-word, recitations, translations, tafsir, and juz, once a Backend app is approved
- [Quran.com API v4](https://api.quran.com/api/v4) — the same routes, used until `QF_CLIENT_ID`, `QF_CLIENT_SECRET`, and `QF_ENV` are set
- [AlQuran Cloud](https://alquran.cloud/api) — extra translation editions and text search, with backoff when the shared host is busy
- [audio.qurancdn.com](https://audio.qurancdn.com) and the Islamic Network CDN — recitation audio

Those requests ask for the surah, ayah, translation, or reciter. They do not include the reader’s library. Quran text is marked `translate="no"`. Cached copies stay under a week (one day fresh, two days stale).

### Quran Foundation credentials

Register a Backend/server app in the [Quran Foundation developer console](https://dev-console.quran.foundation/login). New apps start on prelive, which only serves Al-Fatihah and Al-Baqarah. Request production content scopes before pointing the live site at production. Store these on the server only (Vercel Production and Preview). Do not prefix them with `NEXT_PUBLIC_`.

| Name | Value |
| --- | --- |
| `QF_CLIENT_ID` | Backend app client id |
| `QF_CLIENT_SECRET` | Backend app client secret |
| `QF_ENV` | `prelive` or `production` |

Leave all three unset and QuranDeck keeps calling `api.quran.com`. When they are set, the server fetches a client-credentials token from `oauth2.quran.foundation` (or the prelive host), caches it until five minutes before expiry, and sends `x-auth-token`, `x-client-id`, and a QuranDeck user agent to `apis.quran.foundation/content/api/v4`. A 401 refreshes the token once and retries. Prelive 404s fall back to the public API so the rest of the mushaf still opens while production access is pending. Do not set `QF_ENV=prelive` on the public deployment if you need every surah from Quran Foundation itself.

Scopes requested for a new Backend app: `content.quran.read`, `content.translations.read`, `content.tafsirs.read`, `content.audio.read`, `content.metadata.read`. No user scopes.

## Stack

Next.js 16 App Router, React 19, Tailwind, Auth.js (next-auth 5 beta), Neon Postgres via `@neondatabase/serverless`, hosted on Vercel. `AGENTS.md` points at this Next.js version’s own docs before changing framework code.
