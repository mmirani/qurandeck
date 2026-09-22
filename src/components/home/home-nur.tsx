import Link from "next/link";
import { NurVisual } from "@/components/companion/nur-visual";
import { COMPANION_NAME, COMPANION_NAME_AR } from "@/lib/brand";

export function HomeNur() {
  return (
    <section className="border-t border-line/70 bg-highlight/60">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:py-16">
        <div className="flex justify-center lg:justify-start">
          <div className="relative flex h-64 w-64 items-center justify-center rounded-[2rem] bg-canvas shadow-[inset_0_0_0_1px_var(--line)] sm:h-72 sm:w-72">
            <NurVisual />
          </div>
        </div>
        <div>
          <p className="kufic-label text-gold-deep">A companion, not a widget</p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Meet {COMPANION_NAME}{" "}
            <span lang="ar" className="font-arabic text-gold">
              {COMPANION_NAME_AR}
            </span>
          </h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-ink-soft sm:text-lg">
            {COMPANION_NAME} is a little light that sits with you in the mushaf. It breathes — a slow bob and a soft
            floor glow — and it takes the colour of your theme, so it belongs on Noor, Pastels, Lumen, or night alike.
          </p>
          <p className="mt-3 max-w-xl text-base leading-7 text-ink-soft">
            Drag it anywhere on the page. Click it to take a walkthrough, ask how something works, or have it do a
            thing for you — play this surah, bigger text, highlight this ayah. Send it to the corner, or let it rest
            when you want the reading quiet.
          </p>
          <Link
            href="/read"
            className="mt-7 inline-flex h-12 cursor-pointer items-center rounded-full bg-gold px-6 text-base font-semibold text-on-gold"
          >
            See {COMPANION_NAME} in the mushaf
          </Link>
        </div>
      </div>
    </section>
  );
}
