"use client";

import { APPEARANCE_THEMES } from "@/lib/appearance";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { Modal } from "@/components/ui/modal";

export function ThemePicker() {
  const { modal, closeModal, preferences, updatePreferences } = useMushaf();
  if (modal !== "themes") return null;

  const groups = ["day", "paper", "night"] as const;

  return (
    <Modal eyebrow="Personalize" title="Colour themes" onClose={closeModal} wide>
      <p className="mb-5 text-sm text-ink-soft">
        Bright day palettes stay light all the way through — including the reciter. Paper is warmer, with tighter corners. Night puts dark colour on the rails, player, and page together. High Contrast is nearly square.
      </p>
      {groups.map((group) => (
        <section key={group} className="mb-6">
          <h3 className="kufic-label text-gold-deep">{group}</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {APPEARANCE_THEMES.filter((theme) => theme.group === group).map((theme) => {
              const active = preferences.theme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => updatePreferences({ theme: theme.id })}
                  className={`cursor-pointer rounded-3xl border p-4 text-left ${
                    active ? "border-gold bg-highlight" : "border-line hover:border-gold"
                  }`}
                >
                  <div className="mb-3 flex gap-2">
                    {theme.swatches.map((color) => (
                      <span
                        key={color}
                        className="h-8 w-8 rounded-full border border-white/40"
                        style={{ background: color }}
                      />
                    ))}
                  </div>
                  <p className="font-display text-2xl text-ink">{theme.name}</p>
                  <p className="text-sm text-muted">{theme.description}</p>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </Modal>
  );
}
