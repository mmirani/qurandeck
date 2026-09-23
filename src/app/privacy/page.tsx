import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy policy — QuranDeck",
  description: "How QuranDeck handles reading on this device, sign-in, and a sealed library.",
};

const UPDATED = "September 23, 2026";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated={UPDATED}>
      <LegalSection title="Who this covers">
        <p>
          QuranDeck is a personal mushaf for The Noble Quran. This policy describes what the beta at
          qurandeck.vercel.app does with information when you read as a guest or sign in.
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
          An account uses your email. A one-time sign-in link is valid for about 15 minutes. When email delivery is
          turned on, that link is sent through an email provider. Otherwise QuranDeck shows the link in the sign-in
          window so you can open it yourself.
        </p>
        <p>
          If Google or GitHub sign-in is offered and you choose it, that service handles the login under its own
          policy and shares your name and verified email with QuranDeck. The email remains the account key. Your
          display name is separate: it is the name shown in the app, it does not have to be unique, and names with
          offensive language are refused.
        </p>
        <p>QuranDeck does not use your email for a newsletter or for advertising.</p>
      </LegalSection>

      <LegalSection title="The library we sync">
        <p>
          After you sign in, QuranDeck can save a library for that email: reading preferences, favorites, notes,
          highlights, color swatches, progress, and display name. The same library is merged back onto a device when
          you sign in there.
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

      <LegalSection title="Cookies">
        <p>
          A sign-in cookie keeps the session on that browser. Signing out clears it. If an invite-only beta is turned
          on, a separate cookie can remember that this browser was invited, for about 90 days.
        </p>
        <p>QuranDeck does not set advertising cookies and does not run an ads or analytics tracker.</p>
      </LegalSection>

      <LegalSection title="Quran text, tafsir, and audio">
        <p>
          Arabic text, translations, tafsir, search, and recitation are fetched for you from public Quran sources,
          including the Quran Foundation content API, AlQuran Cloud, and their audio hosts. Those requests ask for the
          surah, ayah, translation, or reciter you opened. They do not include your notes, favorites, or email.
        </p>
        <p>Those providers handle the request under their own policies.</p>
      </LegalSection>

      <LegalSection title="Hosting">
        <p>
          The site runs on Vercel. The sealed library is stored in Neon Postgres. Those hosts keep ordinary connection
          logs, such as IP address and time, to operate and protect the service. QuranDeck does not use those logs to
          build an advertising profile.
        </p>
      </LegalSection>

      <LegalSection title="How long it stays">
        <p>
          Guest data stays in the browser until you clear it. A signed-in library stays until you ask for it to be
          deleted or the account is removed. Sign-in links expire after about 15 minutes. There is not yet a delete
          button in the account panel. Ask through the repository and the sealed library for that email will be
          deleted.
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
