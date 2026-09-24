import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms of use — QuranDeck",
  description: "The rules for reading The Noble Quran on QuranDeck.",
};

const UPDATED = "September 23, 2026";

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated={UPDATED}>
      <LegalSection title="Using QuranDeck">
        <p>
          QuranDeck is a free reading room for The Noble Quran. You may read, search, listen, take notes, and keep a
          place in the mushaf for your own personal use. These terms cover the beta at qurandeck.vercel.app.
        </p>
        <p>
          By using the site you agree to these terms and to the{" "}
          <Link href="/privacy" className="text-gold-deep underline-offset-4 hover:underline">
            privacy policy
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="The Quran, translations, and audio">
        <p>
          The Arabic text, translations, tafsir, and recitation are presented for reading and listening. They come from
          published sources, including the Quran Foundation, AlQuran Cloud, and reciters such as Mishari Rashid
          al-Afasy. Those works stay with their authors, reciters, and publishers.
        </p>
        <p>
          QuranDeck is a mushaf and a study desk. It is not a fatwa service, and a translation or tafsir on the page is
          not a personal ruling. You may not copy the service, or the Quran texts it displays, and present that copy as
          your own product.
        </p>
      </LegalSection>

      <LegalSection title="Your account">
        <p>
          You may read as a guest. A guest library stays in that browser. If you sign in, your email is the account
          key. The name shown in the app is a display name. It does not have to be unique, and it is not a public
          username.
        </p>
        <p>
          You are responsible for the sign-in link sent to your email, or shown to you, and for opening it only for
          yourself. One email is one library.
        </p>
      </LegalSection>

      <LegalSection title="Notes and the synced library">
        <p>
          Notes, highlights, favorites, and progress that you create are yours. You give QuranDeck permission to store
          and sync that library so the feature works, including in sealed form in the database described in the privacy
          policy. QuranDeck does not claim ownership of your reflections and does not sell them.
        </p>
        <p>
          When a signed-in library syncs, QuranDeck may also add anonymous visit counts to shared platform ranks (ayah
          keys and totals only). Those ranks can power product features such as most-read surahs and ayahs across
          QuranDeck. They are not linked to your email in that table.
        </p>
      </LegalSection>

      <LegalSection title="Conduct">
        <p>Use QuranDeck for reading and personal study. You agree that you will not:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>break into another person’s account or library</li>
          <li>probe, disrupt, or overload the site or its database</li>
          <li>inflate or game reading ranks or other shared counters</li>
          <li>use a display name that includes offensive language</li>
          <li>store unlawful content in notes</li>
          <li>resell access to QuranDeck or wrap it as a paid product</li>
        </ul>
        <p>A display name that fails the language check is rejected. We may refuse a name that gets around that check.</p>
      </LegalSection>

      <LegalSection title="Price">
        <p>
          QuranDeck is offered without a subscription fee and without ads. The beta can change. A future feature, such
          as shared notes, would come with its own explanation before it asks anything new of you. Nothing on the site
          is a promise that every future version will have the same screens.
        </p>
      </LegalSection>

      <LegalSection title="Availability">
        <p>
          The mushaf depends on this site and on outside Quran and audio hosts. Reading, search, or recitation can be
          interrupted. Guest data can be lost if the browser storage is cleared. A sealed library is kept so a signed-in
          reader can return, and it can still be lost if the database or its key is lost. Keep anything you cannot
          replace in your own notes as well.
        </p>
      </LegalSection>

      <LegalSection title="Liability">
        <p>
          QuranDeck is provided as a beta reading tool. To the extent the law allows, the operator is not liable for
          lost notes, a missed place in the mushaf, or an interruption in audio or text. These terms do not remove
          rights that cannot legally be waived where you live.
        </p>
      </LegalSection>

      <LegalSection title="Changes and contact">
        <p>
          These terms can be updated. The date at the top of this page will change when they are. Continued use after
          that date means the updated terms apply.
        </p>
        <p>
          Write to the operator through the{" "}
          <a className="text-gold-deep underline-offset-4 hover:underline" href="https://github.com/mmirani/qurandeck">
            QuranDeck repository
          </a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
