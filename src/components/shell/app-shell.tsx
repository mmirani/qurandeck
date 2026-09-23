"use client";

import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
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
import { ReaderChromeProvider } from "@/components/shell/reader-chrome";
import { useMobileReader } from "@/lib/use-media-query";

const CALM = { type: "tween" as const, duration: 0.8, ease: [0.33, 0.05, 0.2, 1] as const };

export function AppShell() {
  const [navOpen, setNavOpen] = useState(false);
  const [studyOpen, setStudyOpen] = useState(false);
  const { preferences, isPlaying, togglePlay } = useMushaf();
  const focus = preferences.focusMode;
  const { md: isMd, xl: isXl, xxl: is2xl } = useBreakpoints();
  const mobile = useMobileReader();
  const reduce = useReducedMotion();
  const transition = reduce ? { duration: 0 } : CALM;

  const navWidth = is2xl ? 300 : 280;
  const studyWidth = is2xl ? 380 : 340;
  const strip = 40;
  const showNav = Boolean(isMd && !focus);
  const showStudy = Boolean(isXl && !focus);
  const arabicOnly = preferences.showArabic && !preferences.showTranslation && !preferences.showTransliteration;
  const book = Boolean(focus && arabicOnly);
  const navOpenRail = Boolean(showNav && preferences.showNavRail);
  const studyOpenRail = Boolean(showStudy && preferences.showStudyRail);
  const boost = navOpenRail && studyOpenRail ? 1 : navOpenRail || studyOpenRail ? 1.22 : 1.45;

  useEffect(() => {
    if (book && isPlaying) togglePlay();
  }, [book, isPlaying, togglePlay]);

  return (
    <GuideProvider>
      <ReaderChromeProvider
        openNav={() => setNavOpen(true)}
        closeNav={() => setNavOpen(false)}
        openStudy={() => setStudyOpen(true)}
        closeStudy={() => setStudyOpen(false)}
      >
        <div
          id="main-content"
          className={`relative z-[1] flex h-dvh flex-col overflow-hidden bg-canvas text-ink ${
            book ? "p-1.5 md:p-3" : "p-0 md:p-4"
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
              className={`min-h-0 min-w-0 flex-1 overflow-hidden ${
                book ? "rounded-md border-0 bg-transparent" : "rounded-none border-0 bg-surface md:rounded-3xl md:border md:border-line"
              }`}
              style={{ ["--measure-boost" as string]: String(boost) }}
            >
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

          {book ? null : (
            <div
              className={`fixed z-30 ${
                mobile
                  ? isPlaying
                    ? "bottom-0 left-0 right-0"
                    : "bottom-3 left-3 right-3"
                  : focus
                    ? "bottom-5 left-1/2 w-[min(calc(100%-1.5rem),42rem)] -translate-x-1/2"
                    : "bottom-20 left-3 right-3 xl:hidden"
              }`}
            >
              <AudioPlayer variant="dock" mobileSticky={mobile && isPlaying} />
            </div>
          )}

          {book ? null : <SanaCompanion mobileDock={mobile && !focus} audioPlaying={mobile && isPlaying} />}

          <BottomSheet open={navOpen && !focus} onClose={() => setNavOpen(false)} title="Surahs & Juz">
            <SurahSidebar />
          </BottomSheet>
          <BottomSheet open={studyOpen && !focus} onClose={() => setStudyOpen(false)} title="Study">
            <StudySidebar />
          </BottomSheet>

          <TourOverlay />
          <AppModals />
        </div>
      </ReaderChromeProvider>
    </GuideProvider>
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
      className="min-h-0 shrink-0 overflow-hidden rounded-3xl shadow-[0_8px_28px_rgba(15,23,42,0.08)] will-change-[width] max-md:hidden"
      aria-hidden={!visible}
    >
      <div className="h-full" style={{ width: open ? width : strip }}>
        {open ? children : fallback}
      </div>
    </motion.div>
  );
}

function useBreakpoints() {
  const [bp, setBp] = useState({ md: false, xl: false, xxl: false });
  useEffect(() => {
    const md = window.matchMedia("(min-width: 768px)");
    const xl = window.matchMedia("(min-width: 1280px)");
    const xxl = window.matchMedia("(min-width: 1536px)");
    const sync = () => setBp({ md: md.matches, xl: xl.matches, xxl: xxl.matches });
    sync();
    md.addEventListener("change", sync);
    xl.addEventListener("change", sync);
    xxl.addEventListener("change", sync);
    return () => {
      md.removeEventListener("change", sync);
      xl.removeEventListener("change", sync);
      xxl.removeEventListener("change", sync);
    };
  }, []);
  return bp;
}
