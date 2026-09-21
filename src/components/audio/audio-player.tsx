"use client";

import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { StyledSelect } from "@/components/ui/styled-select";
import { ArabesqueDivider } from "@/components/art/ornaments";

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function AudioPlayer({ variant = "rail" }: { variant?: "rail" | "dock" }) {
  const {
    recitations,
    preferences,
    updatePreferences,
    verses,
    playingVerseKey,
    selectedVerseKey,
    isPlaying,
    currentTime,
    duration,
    playFrom,
    togglePlay,
    seek,
    chapter,
    playMode,
  } = useMushaf();

  const reciter = recitations.find((item) => item.id === preferences.recitationId);
  const currentKey = playingVerseKey ?? selectedVerseKey ?? verses[0]?.verseKey;
  const index = Math.max(0, verses.findIndex((item) => item.verseKey === currentKey));
  const current = verses[index];
  const reciterOptions = recitations.map((item) => ({
    value: String(item.id),
    label: item.reciterName,
    hint: item.style ?? undefined,
  }));
  const speedOptions = [0.75, 1, 1.25, 1.5].map((rate) => ({
    value: String(rate),
    label: `${rate}x`,
  }));

  if (variant === "dock") {
    return (
      <section className="mushaf-player is-dock flex items-center gap-2 rounded-xl px-2 py-1.5 sm:gap-3 sm:px-3">
        <button
          type="button"
          className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-gold/55 text-gold hover:bg-gold/20"
          onClick={() => current && index > 0 && playFrom(verses[index - 1].verseKey)}
          aria-label="Previous verse"
        >
          <SkipBack className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="inline-flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gold text-on-gold"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause recitation" : "Play recitation from current verse"}
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
        <button
          type="button"
          className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-gold/55 text-gold hover:bg-gold/20"
          onClick={() => current && index < verses.length - 1 && playFrom(verses[index + 1].verseKey)}
          aria-label="Next verse"
        >
          <SkipForward className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <label className="block">
            <span className="sr-only">Seek</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={currentTime}
              onChange={(event) => seek(Number(event.target.value))}
              className="h-3 w-full cursor-pointer accent-gold"
            />
          </label>
          <div className="mt-0.5 flex justify-between gap-2 text-[11px] font-medium text-gold">
            <span className="truncate">
              {currentKey ?? "—"} · {formatTime(currentTime)}
            </span>
            <span className="shrink-0">{formatTime(duration)}</span>
          </div>
        </div>
        <StyledSelect
          tone="surface"
          compact
          className="hidden min-w-0 max-w-[11rem] sm:block"
          value={String(preferences.recitationId)}
          onChange={(next) => updatePreferences({ recitationId: Number(next) })}
          options={reciterOptions}
        />
        <StyledSelect
          tone="surface"
          compact
          className="w-[4.75rem] shrink-0"
          value={String(preferences.playbackRate)}
          onChange={(next) => updatePreferences({ playbackRate: Number(next) })}
          options={speedOptions}
        />
      </section>
    );
  }

  return (
    <section className="mushaf-player rounded-xl p-4">
      <p className="kufic-label text-gold">Now reciting</p>
      <p className="mt-1 font-display text-xl font-semibold tracking-tight text-player-ink">{reciter?.reciterName ?? "Mishari Rashid al-Afasy"}</p>
      <p className="text-xs text-player-ink/70">
        {playMode === "verse"
          ? "This ayah only — recitation stops at the end"
          : playMode === "from-here"
            ? "Continuing from here through the surah"
            : preferences.autoPlayOnAyahClick
              ? "Tap an ayah to cue it · Ayah plays one verse · From here keeps going"
              : "Tap an ayah to cue it, then press play"}
      </p>
      <ArabesqueDivider className="my-3 text-gold/80" />
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-gold/45 text-gold hover:bg-gold/15"
          onClick={() => current && index > 0 && playFrom(verses[index - 1].verseKey)}
          aria-label="Previous verse"
        >
          <SkipBack className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="inline-flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-gold text-on-gold shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent)_28%,transparent)]"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause recitation" : "Play recitation from current verse"}
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
        <button
          type="button"
          className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-gold/45 text-gold hover:bg-gold/15"
          onClick={() => current && index < verses.length - 1 && playFrom(verses[index + 1].verseKey)}
          aria-label="Next verse"
        >
          <SkipForward className="h-4 w-4" />
        </button>
      </div>
      <label className="mt-4 block text-xs">
        <span className="sr-only">Seek</span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={currentTime}
          onChange={(event) => seek(Number(event.target.value))}
          className="w-full accent-gold"
        />
      </label>
      <div className="mt-1 flex justify-between text-xs text-gold-deep">
        <span>
          Verse {index + 1}/{verses.length || chapter?.versesCount || 0}
        </span>
        <span>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <StyledSelect
          tone="surface"
          compact
          className="min-w-0 flex-1"
          value={String(preferences.recitationId)}
          onChange={(next) => updatePreferences({ recitationId: Number(next) })}
          options={reciterOptions}
        />
        <StyledSelect
          tone="surface"
          compact
          className="w-[5.5rem] shrink-0"
          value={String(preferences.playbackRate)}
          onChange={(next) => updatePreferences({ playbackRate: Number(next) })}
          options={speedOptions}
        />
      </div>
    </section>
  );
}
