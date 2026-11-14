"use client";

import { useState } from "react";
import { Bookmark, Download, FileJson, FileSpreadsheet } from "lucide-react";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { UserMenu } from "@/components/user/user-menu";
import { RailToggle } from "@/components/shell/rail-toggle";
import { ReadingSettings } from "@/components/modals/settings-modal";
import { Modal } from "@/components/ui/modal";
import { PROMISE_LINE, PROMISE_WHY } from "@/lib/brand";
import { AvatarPicker } from "@/components/account/profile-avatar";
import { CompletionMap } from "@/components/account/completion-map";
import { ReadingSince } from "@/components/account/reading-since";
import { StatsRangeBar, useRangeStats } from "@/components/account/stats-range-bar";
import {
  downloadLibraryJson,
  downloadStatsCsv,
  type LibraryExportInput,
} from "@/lib/export-library";
import { continueBookmark, parseVerseKey, TOTAL_AYAHS, TOTAL_SURAHS } from "@/lib/reading";

type AccountTab = "progress" | "saved" | "settings" | "account";

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
  if (!user && tab === "account") setTab("progress");
  if (modal !== "account") return null;

  const greeting = user?.displayName ? `Assalamu alaykum, ${user.displayName}.` : "Assalamu alaykum.";

  return (
    <Modal title={greeting} onClose={closeModal} wide stable>
      <div>
        <div className={`grid gap-2 ${user ? "grid-cols-4" : "grid-cols-3"}`} role="tablist" aria-label="Account">
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
            <AccountTabButton active={tab === "account"} onClick={() => setTab("account")}>
              Account
            </AccountTabButton>
          ) : null}
        </div>
        <div className="mt-8 border-t border-line/70 pt-8">
        {tab === "progress" ? <AccountDashboard /> : null}
        {tab === "saved" ? <SavedLibrary /> : null}
        {tab === "settings" ? <ReadingSettings /> : null}
        {tab === "account" && user ? (
          <div className="qd-stack max-w-md">
            <AvatarPicker />
            <form
              className="qd-stack"
              onSubmit={(event) => {
                event.preventDefault();
                const message = updateDisplayName(name);
                setNameError(message);
              }}
            >
              <label className="block text-sm">
                Display name
                <input
                  className="mt-2 h-11 w-full rounded-2xl border border-line bg-surface px-4"
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
            <DataExportPanel />
            <div className="space-y-3 border-t border-line/70 pt-8">
              <button
                type="button"
                onClick={signOut}
                className="h-11 cursor-pointer rounded-full border border-line px-5 text-sm font-medium text-ink-soft"
              >
                Sign out
              </button>
              <DeleteAccountPanel />
            </div>
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
    <section className="rail-card qd-card rounded-2xl">
      <div className="flex items-center justify-between gap-2">
        <h2 className="section-heading text-gold">Account</h2>
        <div className="hidden xl:block">
          <RailToggle side="study" compact />
        </div>
      </div>
      <p className="kufic-label text-gold">{PROMISE_LINE}</p>
      <p className="text-sm leading-6 text-ink-soft">{user ? `${user.displayName}. ${PROMISE_WHY}` : PROMISE_WHY}</p>
      <UserMenu fill />
    </section>
  );
}

function AccountDashboard() {
  const { user, progress, openAuth } = useMushaf();
  const stats = useRangeStats();
  const ranged = Boolean(stats.range.start && stats.range.end);
  const count = (value: number | null) => (value == null ? "—" : value.toLocaleString("en-US"));

  return (
    <div className="flex flex-col gap-6">
      <ReadingSince />
      <ContinueCard />
      <StatsRangeBar />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Verses read"
          value={count(stats.ayahs)}
          hint={stats.ayahs == null ? "Not in daily history" : ranged ? "Newly marked in this range" : `of ${TOTAL_AYAHS}`}
        />
        <StatCard
          label="Surahs finished"
          value={`${stats.surahsFinished}`}
          hint={ranged ? "All time" : `of ${TOTAL_SURAHS}`}
        />
        <StatCard
          label="Streak"
          value={`${stats.streak} day${stats.streak === 1 ? "" : "s"}`}
          hint={progress.lastReadDay ? `Last ${progress.lastReadDay}` : "Stay on an ayah to begin"}
        />
        <StatCard
          label="Minutes"
          value={count(stats.minutes)}
          hint={stats.minutes == null ? "Not in daily history" : ranged ? "In this range" : "While reading in the mushaf"}
        />
        <StatCard label="Favorites" value={count(stats.bookmarks)} hint={ranged ? "Saved in this range" : "In Saved"} />
        <StatCard
          label="Notes"
          value={count(stats.notes)}
          hint={`${count(stats.highlights)} highlights${ranged ? " in this range" : ""}`}
        />
      </div>
      <CompletionMap />
      {!user ? <DataExportPanel compact /> : null}
      {user ? null : (
        <button
          type="button"
          onClick={() => openAuth("signup")}
          className="h-12 min-h-11 w-full cursor-pointer rounded-full border border-line bg-surface text-sm font-medium text-ink"
        >
          Sign up free
        </button>
      )}
    </div>
  );
}

function DeleteAccountPanel() {
  const { signOut } = useMushaf();
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ready = confirm.trim().toLowerCase() === "delete";

  return (
    <form
      className="qd-pad-sm qd-stack rounded-2xl border border-danger/30"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!ready) return;
        setBusy(true);
        setError(null);
        try {
          const response = await fetch("/api/account", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ confirm: "delete" }),
          });
          const data = (await response.json()) as { ok?: boolean; error?: string };
          if (!response.ok || !data.ok) {
            setError(data.error ?? "Could not delete the account.");
            return;
          }
          signOut();
        } catch {
          setError("Network error. Try again.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3 className="text-sm font-semibold text-ink">Delete my account</h3>
      <p className="text-sm text-ink-soft">
        This deletes the sealed library, including day-by-day reading totals, passkeys, and unused sign-in codes stored
        for this email. Reading on this device stays until you clear the browser. Anonymous rank totals are not
        removed.
      </p>
      <label className="block text-sm">
        Type delete to confirm
        <input
          className="mt-2 h-11 w-full rounded-2xl border border-line bg-surface px-4"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          autoComplete="off"
        />
      </label>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button
        type="submit"
        disabled={!ready || busy}
        className="h-11 cursor-pointer rounded-full border border-danger/40 px-5 text-sm font-medium text-danger disabled:opacity-50"
      >
        {busy ? "Deleting…" : "Delete my account"}
      </button>
    </form>
  );
}

function DataExportPanel({ compact = false }: { compact?: boolean }) {
  const { progress, bookmarks, notes, highlights, swatches, preferences, user } = useMushaf();
  const [flash, setFlash] = useState<string | null>(null);

  const payload = (): LibraryExportInput => ({
    progress,
    bookmarks,
    notes,
    highlights,
    swatches,
    preferences,
    user,
  });

  const flashMessage = (message: string) => {
    setFlash(message);
    window.setTimeout(() => setFlash(null), 2200);
  };

  return (
    <section
      className={
        compact
          ? "qd-pad-sm rounded-2xl border border-line bg-surface"
          : "border-t border-line/70 pt-8"
      }
    >
      <div className="flex items-start gap-2">
        <Download className="mt-0.5 h-4 w-4 shrink-0 text-gold-deep" aria-hidden="true" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink">Download your data</h3>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            Stats as a spreadsheet, or a full library backup you can keep offline. Profile photos are left out to keep
            the file small.
          </p>
        </div>
      </div>
      <div className={`flex flex-col gap-2 sm:flex-row ${compact ? "mt-3" : "mt-4"}`}>
        <button
          type="button"
          onClick={() => {
            downloadStatsCsv(payload());
            flashMessage("Stats CSV downloaded");
          }}
          className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink hover:bg-highlight"
        >
          <FileSpreadsheet className="h-4 w-4 text-gold-deep" aria-hidden="true" />
          Stats (CSV)
        </button>
        <button
          type="button"
          onClick={() => {
            downloadLibraryJson(payload());
            flashMessage("Library JSON downloaded");
          }}
          className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-gold px-4 text-sm font-semibold text-on-gold"
        >
          <FileJson className="h-4 w-4" aria-hidden="true" />
          Full library (JSON)
        </button>
      </div>
      {flash ? <p className="mt-2 text-xs text-gold-deep">{flash}</p> : null}
    </section>
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
                  className="qd-pad-sm w-full cursor-pointer rounded-2xl border border-line text-left hover:bg-highlight"
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
              <li key={note.id} className="qd-pad-sm qd-cluster rounded-2xl border border-line">
                <button
                  type="button"
                  className="cursor-pointer text-xs text-gold-deep"
                  onClick={() => openVerse(note.verseKey, note.body)}
                >
                  {note.verseKey}
                </button>
                <p className="whitespace-pre-wrap text-sm leading-6 text-ink">{note.body}</p>
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
      className={`h-11 min-h-11 cursor-pointer whitespace-nowrap rounded-full px-2 text-xs font-medium sm:text-sm ${
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
    playingVerseKey,
    isPlaying,
    visibleVerseKeys,
    offerResume,
    clearResume,
  } = useMushaf();
  const savedKey = progress.lastVerseKey;
  const bookmark = continueBookmark({
    savedKey,
    lineKey: visibleVerseKeys[0] ?? null,
    playingVerseKey,
    isPlaying,
    savedOnScreen: Boolean(savedKey && visibleVerseKeys.includes(savedKey)),
    offerResume,
  });
  const place = parseVerseKey(bookmark.ayah);
  const savedChapter = place ? chapters.find((item) => item.id === place.chapterId) : null;
  const title = savedChapter ? savedChapter.nameSimple : "Al-Fatihah";

  const resume = () => {
    const target = parseVerseKey(bookmark.resumeKey);
    if (!target || !bookmark.resumeKey) return;
    clearResume();
    closeModal();
    jumpToHit({
      verseKey: bookmark.resumeKey,
      chapterId: target.chapterId,
      verseNumber: target.verseNumber,
      textArabic: "",
      textTranslation: "Auto Bookmark",
      source: "jump",
    });
  };

  return (
    <div
      className={
        compact
          ? "qd-card-tight rounded-2xl border-2 border-gold bg-highlight"
          : "qd-card mt-4 rounded-2xl border-2 border-gold bg-highlight"
      }
    >
      <p className="kufic-label flex items-center gap-2 text-gold-deep">
        <Bookmark className="h-3.5 w-3.5 shrink-0" aria-hidden="true" strokeWidth={2.25} />
        Auto Bookmark
      </p>
      <p className={`font-display font-semibold leading-tight tracking-tight text-ink ${compact ? "text-xl" : "text-2xl"}`}>
        {title}
      </p>
      <p className="text-sm leading-6 text-ink">Ayah {bookmark.ayah}</p>
      {bookmark.showResume ? (
        <button
          type="button"
          onClick={resume}
          className={`w-full cursor-pointer rounded-full bg-gold text-sm font-semibold text-on-gold ${
            compact ? "h-11" : "h-12"
          }`}
        >
          Resume reading
        </button>
      ) : bookmark.here ? (
        <p className="text-sm leading-6 text-ink-soft">{"You're on this ayah."}</p>
      ) : null}
    </div>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="qd-card rounded-2xl border border-line bg-surface">
      <p className="kufic-label text-gold-deep">{label}</p>
      <p className="font-display text-3xl leading-none text-ink">{value}</p>
      <p className="text-xs leading-5 text-ink-soft">{hint}</p>
    </div>
  );
}
