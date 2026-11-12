import { ContactForm } from "@/app/contact/contact-form";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Contact",
  description: "Send QuranDeck a note about a reading issue, a translation, or an idea.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <LegalPage title="Contact" updated="November 10, 2026">
      <LegalSection title="A note is enough">
        <p>
          Tell us what got in the way of reading, which translation or reciter you want, or what should feel quieter.
          A name and email are optional. If you leave an email, it is only so a person can reply.
        </p>
        <ContactForm />
      </LegalSection>
    </LegalPage>
  );
}
