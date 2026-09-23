"use client";

import { Palette } from "lucide-react";
import { APPEARANCE_THEMES, FONT_SIZE_MAX, FONT_SIZE_MIN } from "@/lib/appearance";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { LanguagePicker } from "@/components/reader/language-picker";
import { Modal } from "@/components/ui/modal";
import { StyledSelect } from "@/components/ui/styled-select";

export function ReadingSettings() {
  const { preferences, updatePreferences, recitations, openModal } = useMushaf();

  return (
      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h3 className="kufic-label text-gold-deep">Appearance</h3>
          <p className="mt-2 text-sm text-ink-soft">Background, ink, and accent colours.</p>
          <button
            type="button"
            onClick={() => openModal("themes")}
            className="mt-3 inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-line px-5 text-sm text-ink"
          >
            <Palette className="h-4 w-4" />
            {APPEARANCE_THEMES.find((item) => item.id === preferences.theme)?.name ?? preferences.theme}
          </button>
        </section>
        <section>
          <h3 className="kufic-label text-gold-deep">Text size</h3>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              className="h-11 w-11 cursor-pointer rounded-full border border-line"
              onClick={() =>
                updatePreferences({ fontSize: Math.max(FONT_SIZE_MIN, preferences.fontSize - 2) })
              }
            >
              −
            </button>
            <span className="min-w-16 text-center">{preferences.fontSize}px</span>
            <button
              type="button"
              className="h-11 w-11 cursor-pointer rounded-full border border-line"
              onClick={() =>
                updatePreferences({ fontSize: Math.min(FONT_SIZE_MAX, preferences.fontSize + 2) })
              }
            >
              +
            </button>
          </div>
        </section>
        <section>
          <h3 className="kufic-label text-gold-deep">Visible layers</h3>
          <div className="mt-3 space-y-2 text-sm">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={preferences.showIntroduction}
                onChange={(event) => updatePreferences({ showIntroduction: event.target.checked })}
              />
              Surah introduction
            </label>
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={preferences.showTafsir}
                onChange={(event) => updatePreferences({ showTafsir: event.target.checked })}
              />
              Tafsir under each ayah
            </label>
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={preferences.showWordByWord}
                onChange={(event) => updatePreferences({ showWordByWord: event.target.checked })}
              />
              Word by word
            </label>
            <p className="pl-7 text-xs text-ink-soft">
              Off until you enable it here. Then a word-by-word panel appears in the study rail.
            </p>
          </div>
        </section>
        <section className="lg:col-span-2">
          <h3 className="kufic-label text-gold-deep">Languages</h3>
          <p className="mt-2 text-sm text-ink-soft">
            Add as many as you want side by side. The circular arrow resets to Arabic and English.
          </p>
          <div className="mt-3">
            <LanguagePicker />
          </div>
        </section>
        <section>
          <h3 className="kufic-label text-gold-deep">Tafsir</h3>
          <p className="mt-2 text-sm text-ink-soft">
            Off until you turn on the Tafsir chip. Commentary then sits under each ayah. The chip’s arrow picks the work.
          </p>
        </section>
        <section>
          <h3 className="kufic-label text-gold-deep">Reciter</h3>
          <StyledSelect
            className="mt-3"
            value={String(preferences.recitationId)}
            onChange={(next) => updatePreferences({ recitationId: Number(next) })}
            options={recitations.map((item) => ({
              value: String(item.id),
              label: item.reciterName,
              hint: item.style ?? undefined,
            }))}
          />
          <label className="mt-3 flex cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={preferences.autoFollow}
              onChange={(event) => updatePreferences({ autoFollow: event.target.checked })}
            />
            Auto-follow: the mushaf scrolls to the ayah being recited
          </label>
        </section>
      </div>
  );
}

export function SettingsModal() {
  const { modal, closeModal } = useMushaf();
  if (modal !== "settings") return null;

  return (
    <Modal eyebrow="Reading room" title="Reading settings" onClose={closeModal} wide>
      <ReadingSettings />
    </Modal>
  );
}
