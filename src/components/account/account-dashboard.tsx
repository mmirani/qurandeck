"use client";

import { useState } from "react";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { UserMenu } from "@/components/user/user-menu";
import { RailToggle } from "@/components/shell/rail-toggle";
import { ReadingSettings } from "@/components/modals/settings-modal";
import { Modal } from "@/components/ui/modal";
import { PROMISE_LINE, PROMISE_WHY } from "@/lib/brand";
import { CompletionMap } from "@/components/account/completion-map";
import {
  formatReadingMinutes,
  parseVerseKey,
  TOTAL_AYAHS,
  TOTAL_SURAHS,
} from "@/lib/reading";

type AccountTab = "progress" | "saved" | "settings";

export function AccountModal() {
  const { modal, closeModal, user, signOut, updateDisplayName } = useMushaf();
  const [tab, setTab] = useState<AccountTab>("progress");
  const [name, setName] = useState(user?.displayName ?? "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  if (modal === "account" && !open) {
    setOpen(true);
    setName(user?.displayName ?? "");
    setNameError(null);
  } else if (modal !== "account" && open) {
    setOpen(false);
  }
  if (modal !== "account") return null;

  const greeting = user?.displayName ? `Assalamu alaykum, ${user.displayName}.` : "Assalamu alaykum.";

  return (
    <Modal title={greeting} onClose={closeModal} wide stable>
      <div>
        <div className={`grid gap-1.5 ${user ? "grid-cols-4" : "grid-cols-3"}`} role="tablist" aria-label="Account">
          <AccountTabButton active={tab === "progress"} onClick={() => setTab("progress")}>
            Progress
          </AccountTabButton>
          <AccountTabButton active={tab === "saved"} onClick={() => setTab("saved")}>
            Saved
          </AccountTabButton>
          <AccountTabButton active={tab === "settings"} onClick={() => setTab("settings")}>
            Settings
          </AccountTabButton>
          {user ? (
            <button
              type="button"
              onClick={signOut}
              className="h-10 cursor-pointer whitespace-nowrap rounded-full border border-line bg-surface px-1 text-xs font-medium text-ink-soft sm:text-sm"
            >
              Sign out
            </button>
          ) : null}
        </div>
        <div className="mt-12 border-t border-line/70 pt-10">
        {tab === "progress" ? <AccountDashboard /> : null}
        {tab === "saved" ? <SavedLibrary /> : null}
        {tab === "settings" ? (
          <div className="space-y-6">
            {user ? (
              <form
                className="max-w-md space-y-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const message = updateDisplayName(name);
                  setNameError(message);
                }}
              >
                <label className="block text-sm">
                  Display name
                  <input
                    className="mt-1 h-11 w-full rounded-2xl border border-line bg-surface px-3"
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      setNameError(null);
                    }}
                    maxLength={40}
                  />
                </label>
                {nameError ? <p className="text-sm text-danger">{nameError}</p> : null}
                <button type="submit" className="h-11 cursor-pointer rounded-full bg-gold px-5 text-sm font-semibold text-on-gold">
                  Save name
                </button>
              </form>
            ) : null}
            <ReadingSettings />
          </div>
        ) : null}
        </div>
      </div>
    </Modal>
  );
}

export function AccountRailCard() {
  const { user } = useMushaf();
  return (
    <section className="rail-card rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="section-heading text-gold">Account</h2>
        <div className="hidden xl:block">
          <RailToggle side="study" compact />
        </div>
      </div>
      <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-gold">{PROMISE_LINE}</p>
      <p className="mt-2 text-sm text-ink-soft">{user ? `${user.displayName}. ${PROMISE_WHY}` : PROMISE_WHY}</p>
      <div className="mt-3">
        <UserMenu fill />
      </div>
    </section>
  );
}

function AccountDashboard() {
  const { user, progress, bookmarks, notes, highlights, openModal } = useMushaf();
  const minutes = formatReadingMinutes(progress.totalSeconds);

  return (
    <div className="space-y-6">
      <ContinueCard />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Verses read" value={`${progress.versesRead.length}`} hint={`of ${TOTAL_AYAHS}`} />
        <StatCard label="Surahs finished" value={`${progress.surahsRead.length}`} hint={`of ${TOTAL_SURAHS}`} />
        <StatCard label="Streak" value={`${progress.streak} day${progress.streak === 1 ? "" : "s"}`} hint={progress.lastReadDay ? `Last ${progress.lastReadDay}` : "Stay on an ayah to begin"} />
        <StatCard label="Minutes" value={`${minutes}`} hint="While ayahs are on screen" />
        <StatCard label="Favorites" value={`${bookmarks.length}`} hint="In Saved" />
        <StatCard label="Notes" value={`${notes.length}`} hint={`${highlights.length} highlights`} />
      </div>
      <CompletionMap />
      {user ? null : (
        <button
          type="button"
          onClick={() => openModal("auth")}
          className="h-12 w-full cursor-pointer rounded-full bg-gold text-sm font-semibold text-on-gold"
        >
          Sign in to keep this library
        </button>
      )}
    </div>
  );
}

function SavedLibrary() {
  const { bookmarks, notes, jumpToHit, closeModal } = useMushaf();

  const openVerse = (verseKey: string, label: string) => {
    const [chapterId, verseNumber] = verseKey.split(":").map(Number);
    closeModal();
    jumpToHit({
      verseKey,
      chapterId,
      verseNumber,
      textArabic: "",
      textTranslation: label,
      source: "jump",
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section>
        <h3 className="text-sm font-semibold text-ink">Favorites</h3>
        {bookmarks.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">Star an ayah or word while you read.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {bookmarks.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => openVerse(item.verseKey, item.label)}
                  className="w-full cursor-pointer rounded-2xl border border-line px-4 py-3 text-left hover:bg-highlight"
                >
                  <p className="text-xs capitalize text-gold-deep">{item.type === "verse" ? "Ayah" : item.type}</p>
                  <p className="text-sm text-ink">{item.label}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h3 className="text-sm font-semibold text-ink">Notes</h3>
        {notes.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">Notes you write on an ayah show up here.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {notes.map((note) => (
              <li key={note.id} className="rounded-2xl border border-line p-4">
                <button
                  type="button"
                  className="cursor-pointer text-xs text-gold-deep"
                  onClick={() => openVerse(note.verseKey, note.body)}
                >
                  {note.verseKey}
                </button>
                <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{note.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function AccountTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`h-10 cursor-pointer whitespace-nowrap rounded-full px-1 text-xs font-medium sm:text-sm ${
        active ? "bg-gold text-on-gold" : "border border-line bg-surface text-ink-soft"
      }`}
    >
      {children}
    </button>
  );
}

export function ContinueCard({ compact = false }: { compact?: boolean }) {
  const {
    progress,
    chapters,
    jumpToHit,
    closeModal,
    selectedVerseKey,
    playingVerseKey,
    visibleVerseKeys,
    offerResume,
    clearResume,
  } = useMushaf();
  const liveKey = playingVerseKey ?? visibleVerseKeys[0] ?? progress.lastVerseKey ?? "1:1";
  const savedKey = progress.lastVerseKey ?? liveKey;
  const place = parseVerseKey(liveKey);
  const savedChapter = place ? chapters.find((item) => item.id === place.chapterId) : null;
  const here = liveKey === savedKey;
  const showResume = offerResume && Boolean(parseVerseKey(savedKey)) && liveKey !== savedKey;
  const title = savedChapter ? savedChapter.nameSimple : "Al-Fatihah";
  const ayah = liveKey;

  const resume = () => {
    const target = parseVerseKey(savedKey);
    if (!target) return;
    clearResume();
    closeModal();
    jumpToHit({
      verseKey: savedKey,
      chapterId: target.chapterId,
      verseNumber: target.verseNumber,
      textArabic: "",
      textTranslation: "Current place",
      source: "jump",
    });
  };

  return (
    <div
      className={
        compact
          ? "rounded-2xl border-2 border-gold bg-highlight p-3"
          : "mt-3 rounded-2xl border-2 border-gold bg-highlight p-4"
      }
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-deep">Current place</p>
      <p className={`mt-1 font-display font-semibold tracking-tight text-ink ${compact ? "text-xl" : "text-2xl"}`}>
        {title}
      </p>
      <p className="mt-0.5 text-sm text-ink">Ayah {ayah}</p>
      {showResume ? (
        <button
          type="button"
          onClick={resume}
          className={`mt-3 w-full cursor-pointer rounded-full bg-gold text-sm font-semibold text-on-gold ${
            compact ? "h-11" : "h-12"
          }`}
        >
          Resume reading
        </button>
      ) : (
        <p className="mt-3 flex h-11 items-center justify-center rounded-full bg-gold/20 text-sm font-medium text-gold-deep">
          Saved here
        </p>
      )}
    </div>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-gold-deep">{label}</p>
      <p className="mt-1 font-display text-3xl text-ink">{value}</p>
      <p className="mt-1 text-xs text-ink-soft">{hint}</p>
    </div>
  );
}
