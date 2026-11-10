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
- Notes, favorites, highlights, a completion map, personal most-read lists, and reading time.
- Themes, text size, translations, tafsir, and reciter live in the account panel.

## Accounts

Email is the account key. Sign-in is a one-time link that expires in about 15 minutes and works once. In production, and on any Vercel deployment, that link is emailed with Resend and is never returned by the API or shown in the sign-in window. If `AUTH_RESEND_KEY` or `AUTH_EMAIL_FROM` is missing there, email sign-in fails instead of displaying a link. Local `next dev` can show the link only when those mail variables are unset.

Google and GitHub appear only when their `AUTH_*` keys are set.

The name in the app is a display name. It is not unique. Offensive language is rejected. There is no public username yet. A profile photo or one of the built-in icons can sit beside that name; the photo is cropped small before it is sealed with the library.

Clicking the name opens one account panel: Progress, Saved, Settings, and Sign out, with the greeting “Assalamu alaykum, {name}.”

## Where data lives

Guest preferences, place, favorites, notes, highlights, and progress stay in this browser (`localStorage` keys prefixed `al-mushaf-`). They are not written to the database.

After sign-in, `LibrarySync` merges that device library with `GET/PUT /api/library`. The Neon table `libraries` stores:

- `account_id`: HMAC-SHA256 of the normalized email, keyed with `AUTH_SECRET`. The email is not a column.
- `sealed`: AES-256-GCM ciphertext of the library JSON (preferences, bookmarks, notes, highlights, swatches, progress including ayah visit counts, display name, profile photo or icon).
- `updated_at`

On each successful library put, QuranDeck compares the previous sealed visit map with the new one and adds positive deltas to `reading_ranks` (`verse_key`, `visits`). That table has no account id. Public read: `GET /api/ranks`.

QuranDeck can decrypt a library while the reader is signed in, so sync works. The libraries table itself is not readable text. Deleting a cloud library is a request for now; there is no delete button yet. Platform rank totals are anonymous and are not unwound when a library is deleted.

Used sign-in tokens are stored in `magic_link_tokens` (`jti`, `expires_at`) so a link works once. Request counters live in `auth_rate_limits`. Neither table stores the email address.

Do not commit `.env*` or print `DATABASE_URL` / `AUTH_SECRET`.

## Environment

Copy `.env.example` to `.env.local`. Required for sign-in and library sync:

- `AUTH_SECRET` — signs the session and encrypts the library. Use a long random string.
- `AUTH_URL` — public origin baked into emailed sign-in links, such as `https://qurandeck.vercel.app`. No trailing slash.
- `DATABASE_URL` — Neon Postgres connection string. Also stores consumed sign-in tokens and rate-limit counters.
- `AUTH_RESEND_KEY` — Resend API key. Required for email sign-in in production.
- `AUTH_EMAIL_FROM` — sender on a domain verified in Resend, such as `QuranDeck <sign-in@example.com>`. Required for email sign-in in production.

`AUTH_PUBLIC_SIGNUP=true` allows any email. Leave it unset for an invite-only beta. Invite-only mode uses `BETA_INVITE_SECRET` (the code is compared in constant time) and an optional `BETA_ALLOWED_EMAILS` comma-separated list.

Optional OAuth: `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`.

Before a public deploy, verify the sending domain in Resend and set `AUTH_RESEND_KEY`, `AUTH_EMAIL_FROM`, and `AUTH_URL` in the Vercel project. `onboarding@resend.dev` only delivers to the Resend account owner, so it is not a production sender. Until the mail variables are set, production email sign-in returns an error and does not reveal a link.

## Legal

- [/privacy](https://qurandeck.vercel.app/privacy)
- [/terms](https://qurandeck.vercel.app/terms)

Footer links on the home page. Both are dated from the beta behavior above: no ads, no sale of reading data, Quran text and audio fetched without sending notes or email.

## Sources

- [Quran.com API v4](https://api.quran.com/api/v4) — chapters, verses, word-by-word, recitations, translations, tafsir, juz
- [AlQuran Cloud](https://alquran.cloud/api) — extra translation editions and text search
- [audio.qurancdn.com](https://audio.qurancdn.com) and the Islamic Network CDN — recitation audio

Those requests ask for the surah, ayah, translation, or reciter. They do not include the reader’s library.

## Stack

Next.js 16 App Router, React 19, Tailwind, Auth.js (next-auth 5 beta), Neon Postgres via `@neondatabase/serverless`, hosted on Vercel. `AGENTS.md` points at this Next.js version’s own docs before changing framework code.
