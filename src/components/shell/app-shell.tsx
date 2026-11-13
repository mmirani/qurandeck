"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { SurahSidebar } from "@/components/sidebar/surah-sidebar";
import { StudySidebar } from "@/components/sidebar/study-sidebar";
import { ReaderPane } from "@/components/reader/reader-pane";
import { AudioPlayer } from "@/components/audio/audio-player";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { RailStrip } from "@/components/shell/rail-toggle";
import { SanaCompanion } from "@/components/companion/sana-companion";
import { AppModals } from "@/components/shell/app-modals";
import { GuideProvider } from "@/components/guide/guide-provider";
import { TourOverlay } from "@/components/guide/tour-overlay";
import { BottomSheet } from "@/components/shell/bottom-sheet";
import { SyncPrompt } from "@/components/account/sync-prompt";
import { ReaderChromeProvider } from "@/components/shell/reader-chrome";
import { useMediaQuery, useMobileReader } from "@/lib/use-media-query";
import { SurahSeedProvider } from "@/components/reader/reading-seed";
import type { SurahSeed } from "@/lib/quran/surah-seed";

const CALM = { type: "tween" as const, duration: 0.8, ease: [0.33, 0.05, 0.2, 1] as const };

export function AppShell({ initialSurah = null }: { initialSurah?: SurahSeed | null }) {
  return (
    <SurahSeedProvider seed={initialSurah}>
      <AppShellFrame />
    </SurahSeedProvider>
  );
}

function AppShellFrame() {
  const [navOpen, setNavOpen] = useState(false);
  const [studyOpen, setStudyOpen] = useState(false);
  const { preferences, isPlaying, togglePlay } = useMushaf();
  const [audioDismissed, setAudioDismissed] = useState(false);
  const [trackedPlaying, setTrackedPlaying] = useState(isPlaying);
  if (isPlaying !== trackedPlaying) {
    setTrackedPlaying(isPlaying);
    if (isPlaying) setAudioDismissed(false);
  }
  const showNavBp = useMediaQuery("(min-width: 1280px)");
  const showStudyBp = useMediaQuery("(min-width: 1536px)");
  const wide = useMediaQuery("(min-width: 1536px)");
  const mobile = useMobileReader();
  const focus = preferences.focusMode && !mobile;
  const reduce = useReducedMotion();
  const transition = reduce ? { duration: 0 } : CALM;

  const navWidth = wide ? 300 : 268;
  const studyWidth = wide ? 360 : 320;
  const strip = 40;
  const showNav = Boolean(showNavBp && !focus);
  const showStudy = Boolean(showStudyBp && !focus);
  const arabicOnly = preferences.showArabic && !preferences.showTranslation && !preferences.showTransliteration;
  const book = Boolean(focus && arabicOnly);
  const navOpenRail = Boolean(showNav && preferences.showNavRail);
  const studyOpenRail = Boolean(showStudy && preferences.showStudyRail);
  const boost = navOpenRail && studyOpenRail ? 1 : navOpenRail || studyOpenRail ? 1.22 : 1.45;

  useEffect(() => {
    if (book && isPlaying) togglePlay();
  }, [book, isPlaying, togglePlay]);

  const showMobileAudio = !focus && isPlaying && !audioDismissed;
  const mobileAyahMode = mobile && !focus && preferences.mobileReadingMode === "ayah";

  return (
    <ReaderChromeProvider
      openNav={() => setNavOpen(true)}
      closeNav={() => setNavOpen(false)}
      openStudy={() => setStudyOpen(true)}
      closeStudy={() => setStudyOpen(false)}
    >
      <GuideProvider>
        <main
          id="main-content"
          data-audio={showMobileAudio ? "on" : "off"}
          className={`relative z-[1] flex h-dvh flex-col overflow-hidden bg-canvas text-ink ${
            book ? "p-2 md:p-3" : "p-0 md:p-4"
          }`}
        >
          <div className="flex min-h-0 flex-1 w-full gap-0 md:gap-3">
            <RailColumn
              visible={showNav}
              open={navOpenRail}
              width={navWidth}
              strip={strip}
              transition={transition}
              fallback={<RailStrip side="nav" />}
            >
              <SurahSidebar />
            </RailColumn>
            <div
              className={`reader-column flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${
                book ? "rounded-md border-0 bg-transparent" : "rounded-none border-0 bg-surface md:rounded-3xl md:border md:border-line"
              }`}
              style={{ ["--measure-boost" as string]: String(boost) }}
            >
              <SyncPrompt />
              <ReaderPane />
            </div>
            <RailColumn
              visible={showStudy}
              open={studyOpenRail}
              width={studyWidth}
              strip={strip}
              transition={transition}
              fallback={<RailStrip side="study" />}
            >
              <StudySidebar />
            </RailColumn>
          </div>

          {book || focus ? null : (
            <div className="hidden shrink-0 px-1 pt-3 lg:block">
              <AudioPlayer variant="dock" />
            </div>
          )}
          {book ? null : focus ? (
            <div className="fixed bottom-5 left-1/2 z-30 w-[min(calc(100%-1.5rem),42rem)] -translate-x-1/2">
              <AudioPlayer variant="dock" />
            </div>
          ) : showMobileAudio ? (
            <div className="fixed inset-x-0 bottom-0 z-30 lg:hidden">
              <AudioPlayer
                variant="dock"
                mobileSticky
                onDismiss={() => {
                  setAudioDismissed(true);
                  if (isPlaying) togglePlay();
                }}
              />
            </div>
          ) : null}

          {book ? null : (
            <SanaCompanion audioBarVisible={showMobileAudio} ayahMode={mobileAyahMode} focusDock={focus && !book} />
          )}

          <BottomSheet open={navOpen && !focus} onClose={() => setNavOpen(false)} title="Surahs & Juz">
            <SurahSidebar />
          </BottomSheet>
          <BottomSheet open={studyOpen && !focus} onClose={() => setStudyOpen(false)} title="Study">
            <StudySidebar />
          </BottomSheet>

          <TourOverlay />
          <AppModals />
        </main>
      </GuideProvider>
    </ReaderChromeProvider>
  );
}

function RailColumn({
  visible,
  open,
  width,
  strip,
  transition,
  children,
  fallback,
}: {
  visible: boolean;
  open: boolean;
  width: number;
  strip: number;
  transition: { type?: "tween"; duration: number; ease?: readonly [number, number, number, number] };
  children: React.ReactNode;
  fallback: React.ReactNode;
}) {
  const shown = visible ? (open ? width : strip) : 0;
  return (
    <motion.div
      initial={false}
      animate={{ width: shown }}
      transition={transition}
      data-shell-rail=""
      className="min-h-0 shrink-0 overflow-hidden rounded-3xl shadow-[0_8px_28px_rgba(15,23,42,0.08)] will-change-[width] max-md:hidden"
      aria-hidden={!visible}
    >
      <div className="h-full" style={{ width: open ? width : strip }}>
        {open ? children : fallback}
      </div>
    </motion.div>
  );
}

