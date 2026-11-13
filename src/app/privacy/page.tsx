import { LegalPage, LegalSection } from "@/components/legal/legal-page";
import { COMPANION_NAME } from "@/lib/brand";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Privacy policy",
  description: "How QuranDeck handles reading on this device, sign-in, a sealed library, and cookieless usage counts.",
  path: "/privacy",
});

const UPDATED = "November 13, 2026";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated={UPDATED}>
      <LegalSection title="Who this covers">
        <p>
          QuranDeck is a personal mushaf for The Noble Quran. This policy describes what QuranDeck does with
          information when you read as a guest or sign in.
        </p>
        <p>
          Questions about your library can go to the operator through the{" "}
          <a className="text-gold-deep underline-offset-4 hover:underline" href="https://github.com/mmirani/qurandeck">
            QuranDeck repository
          </a>.
        </p>
      </LegalSection>

      <LegalSection title="Reading without an account">
        <p>
          You can open the mushaf without signing in. Preferences, your place in the Quran, favorites, notes,
          highlights, and reading time then stay in this browser. That guest library is not copied to the QuranDeck
          database.
        </p>
        <p>Clearing this site’s saved data in the browser removes that guest library from the device.</p>
      </LegalSection>

      <LegalSection title="Signing in">
        <p>
          You can read, bookmark, and keep notes without an account. Those stay in this browser until you sign in.
          An account can use Google, Sign in with Apple, a passkey you add after the first sign-in, or your email.
          Email sign-in sends a 6-digit code to that address. The code expires in about 10 minutes, works once, and is
          not shown in the sign-in window. If a message cannot be sent, sign-in stops and does not display the code.
          A passkey stays on your devices. QuranDeck stores the public key and an encrypted copy of the email so the
          passkey can open the same library. GitHub is not offered for sign-in.
        </p>
        <p>
          If Google or Sign in with Apple is offered and you choose it, that service handles the login under its own
          policy and shares your name and verified email with QuranDeck. The email remains the account key. Your
          display name is separate: it is the name shown in the app, it does not have to be unique, and names with
          offensive language are refused.
        </p>
        <p>QuranDeck does not use your email for a newsletter or for advertising.</p>
      </LegalSection>

      <LegalSection title="The library we sync">
        <p>
          After you sign in, QuranDeck can save a library for that email: reading preferences, favorites, notes,
          highlights, color swatches, progress (including how often an ayah was returned to), display name, and profile
          photo or icon. The same library is merged back onto a device when you sign in there.
        </p>
        <p>
          In the database, the row is not labeled with your email address. The account key is a one-way hash of the
          email. The library itself is encrypted before it is stored. Someone looking at the table sees the hash and
          ciphertext, not your email or your progress as readable text.
        </p>
        <p>
          QuranDeck holds the key that unlocks a library so it can sync back to you while you are signed in. This is
          storage for the service, not a claim that the operator is unable to open a library. We do not sell your
          reading, notes, or progress.
        </p>
      </LegalSection>

      <LegalSection title="Platform reading ranks">
        <p>
          When a signed-in library syncs, QuranDeck can add anonymous visit counts for the ayahs that increased since
          the last sync for that account. Those counts go into a separate table of surah and ayah totals for the
          product. That table stores only an ayah key and a number. It does not store your email, account hash, display
          name, notes, or photo.
        </p>
        <p>
          Guest reading does not feed those totals. Any shared list is a count of openings on QuranDeck. It is not a
          spiritual score, a hasanat counter, or a leaderboard, and it is not sold.
        </p>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>
          A sign-in cookie keeps the session on that browser. Signing out clears it. If an invite-only beta is turned
          on, a separate cookie can remember that this browser was invited, for about 90 days.
        </p>
        <p>QuranDeck does not set advertising cookies.</p>
      </LegalSection>

      <LegalSection title="How usage is counted">
        <p>
          QuranDeck keeps two cookieless counts so the reading room can stay reliable. Neither one is used for
          advertising, and neither one is sold.
        </p>
        <p>
          Vercel Web Analytics and Speed Insights measure aggregate page views and how fast pages load. A page address
          is sent without its query string, so a sign-in code, magic-link token, or other parameter is removed first.
          Sign-in API routes are not measured. These tools do not set a cookie.
        </p>
        <p>
          QuranDeck also stores its own product events. The browser keeps a random id in local storage. That id is not
          a cookie. The database stores a one-way hash of that id, or of the account when you are signed in, plus the
          time and an event from a fixed list. It does not store your email, name, IP address, or browser.
        </p>
        <p>
          We record the country your visit comes from (worked out from your connection and then discarded; we don&apos;t store IP addresses). That country is a two-letter code on a daily total, not a city or region. The unique
          count for a day is a hash of the random id mixed with a salt that changes each day, and the raw id is not
          stored with the country. A page view is a count that a page opened. The page address is not stored.
        </p>
        <p>
          The list covers a guest session starting, a sign-up, a sign-in (email code, passkey, Google, or Apple), a
          guest library merging into an account, and an account deletion. It also covers product actions: audio
          started, a note, bookmark, or highlight added, tafsir opened, a search run, a share, a translation toggle,
          word by word, focus mode, an export, and the mobile reading layout. Those rows are counts. They do not
          include which ayah you opened, the words of a note or highlight, or the search text.
        </p>
        <p>
          {COMPANION_NAME} events are just as narrow: the companion was opened, a recognized command name such as
          play_surah or bigger_text, a count when a command was not understood, a guided tour started or finished, and
          a count when a religious question was refused. The words you type or speak to {COMPANION_NAME} are not stored.
        </p>
        <p>
          Display settings are stored as the choice itself: the theme name in use, text size, ink, and similar on or
          off options such as translation, mushaf view, and playback speed. Not your notes, and not your place in the
          Quran.
        </p>
        <p>
          Once a day, the app can record that it was opened, and a coarse device bucket: phone, tablet, or desktop, and
          whether it is installed or running in a browser. It does not store the user agent, operating system version,
          or screen size. Sign-in health counts whether an email code was requested or used, and whether a passkey,
          Google, or Apple sign-in started, finished, or failed. A failure is a short category such as access denied or
          a redirect mismatch, not your email and not the raw error text.
        </p>
        <p>Those event rows, the daily country totals, and the daily visitor hashes are deleted after about 13 months.</p>
      </LegalSection>

      <LegalSection title="Quran text, tafsir, and audio">
        <p>
          Arabic text, translations, tafsir, search, and recitation are fetched for you from Quran Foundation when
          server credentials are configured, and otherwise from the public Quran.com API, with some search lines from
          AlQuran Cloud. Quran data provided by Quran.Foundation. Those requests ask for the surah, ayah, translation,
          or reciter you opened. They do not include your notes, favorites, or email. Responses are cached for at most
          a few days.
        </p>
        <p>Those providers handle the request under their own policies.</p>
      </LegalSection>

      <LegalSection title="Hosting">
        <p>
          The site runs on Vercel. The sealed library, the anonymous reading-rank counters, the anonymous usage
          events, and the daily country totals are stored in Neon Postgres. Those hosts keep ordinary connection logs,
          such as IP address and time, to operate and protect the service. QuranDeck does not copy those addresses
          into its own tables, and it does not use those logs to build an advertising profile.
        </p>
      </LegalSection>

      <LegalSection title="How long it stays">
        <p>
          Guest data stays in the browser until you clear it. A signed-in library stays until you delete the account
          from the account panel or ask for it to be removed. Delete my account removes that email’s sealed library,
          passkeys, and unused sign-in codes. Sign-in codes expire after about 10 minutes and work only once. Anonymous
          usage events, daily country totals, and daily visitor hashes are removed after about 13 months. Anonymous
          platform rank totals are not tied to your row, so deleting an account does not unwind counts already added
          to those totals. Notes that never left this browser stay here until you clear site data.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>
          QuranDeck is a reading app for anyone. It does not ask for a date of birth and it is not built to collect
          accounts from children under 13. A parent or guardian can ask us to delete a library tied to a child’s email.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          If this policy changes, the date at the top of this page will change with it. Continued use of QuranDeck
          after that date means the updated policy applies.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
