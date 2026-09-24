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

Email is the account key. Sign-in is a one-time link (about 15 minutes). If `AUTH_RESEND_KEY` is set, the link is emailed. Otherwise the sign-in window shows the link. Google and GitHub appear only when their `AUTH_*` keys are set.

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

Do not commit `.env*` or print `DATABASE_URL` / `AUTH_SECRET`.

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
