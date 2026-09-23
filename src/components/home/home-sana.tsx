import Link from "next/link";
import { SanaVisual } from "@/components/companion/sana-visual";
import { COMPANION_NAME, COMPANION_NAME_AR } from "@/lib/brand";

export function HomeSana() {
  return (
    <section className="border-t border-line/70 bg-highlight/60">
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 sm:px-6 md:gap-10 md:py-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:py-16">
        <div className="order-1 flex justify-center touch-pan-y lg:order-none lg:justify-start">
          <div
            className="relative flex h-56 w-56 max-w-full items-center justify-center rounded-[2rem] bg-canvas shadow-[inset_0_0_0_1px_var(--line)] sm:h-64 sm:w-64 md:h-72 md:w-72"
            style={{ touchAction: "pan-y" }}
          >
            <SanaVisual demoInteractive />
          </div>
        </div>
        <div className="order-2 text-center md:text-left lg:order-none">
          <p className="kufic-label text-gold-deep">A companion, not a widget</p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl md:text-4xl">
            Meet {COMPANION_NAME}{" "}
            <span lang="ar" className="font-arabic text-gold">
              {COMPANION_NAME_AR}
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-ink-soft sm:text-lg md:mx-0">
            {COMPANION_NAME} is a quiet gleam that sits with you in the mushaf. It breathes — a slow bob and a soft floor
            glow — taking the colour of your theme, whether reading on Noor, Pastels, Lumen, or night.
          </p>
          <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-ink-soft md:mx-0">
            Drag it anywhere on the page. Click it to take a walkthrough, ask how something works, or have it assist you
            — play this surah, enlarge text, or highlight an ayah. Send it to the corner, or let it rest when you want
            quiet contemplation.
          </p>
          <Link
            href="/read"
            className="mt-7 inline-flex h-12 min-h-11 w-full max-w-md cursor-pointer items-center justify-center rounded-full bg-gold px-6 text-base font-semibold text-on-gold sm:w-auto md:inline-flex"
          >
            See {COMPANION_NAME} in the mushaf
          </Link>
        </div>
      </div>
    </section>
  );
}
