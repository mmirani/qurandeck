"use client";

import { useEffect, useState } from "react";
import { BookOpen, Menu, X } from "lucide-react";
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

const CALM = { type: "tween" as const, duration: 0.8, ease: [0.33, 0.05, 0.2, 1] as const };

export function AppShell() {
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const { preferences, isPlaying, togglePlay } = useMushaf();
  const focus = preferences.focusMode;
  const { lg: isLg, xl: isXl, xxl: is2xl } = useBreakpoints();
  const reduce = useReducedMotion();
  const transition = reduce ? { duration: 0 } : CALM;

  const navWidth = is2xl ? 300 : 280;
  const studyWidth = is2xl ? 380 : 340;
  const strip = 40;
  const showNav = Boolean(isLg && !focus);
  const showStudy = Boolean(isXl && !focus);
  const arabicOnly = preferences.showArabic && !preferences.showTranslation && !preferences.showTransliteration;
  const book = Boolean(focus && arabicOnly);
  const navOpen = Boolean(showNav && preferences.showNavRail);
  const studyOpen = Boolean(showStudy && preferences.showStudyRail);
  const boost = navOpen && studyOpen ? 1 : navOpen || studyOpen ? 1.22 : 1.45;

  useEffect(() => {
    if (book && isPlaying) togglePlay();
  }, [book, isPlaying, togglePlay]);

  return (
    <GuideProvider>
    <div
      id="main-content"
      className={`relative z-[1] flex h-dvh flex-col gap-2 overflow-hidden bg-canvas text-ink ${
        book ? "p-2 md:p-3" : "p-3 md:p-4"
      }`}
    >
      <div className="flex min-h-0 flex-1 w-full gap-3">
        <RailColumn
          visible={showNav}
          open={navOpen}
          width={navWidth}
          strip={strip}
          transition={transition}
          fallback={<RailStrip side="nav" />}
        >
          <SurahSidebar />
        </RailColumn>
        <div
          className={`min-h-0 min-w-0 flex-1 overflow-hidden ${
            book ? "rounded-md border-0 bg-transparent" : "rounded-3xl border border-line bg-surface"
          }`}
          style={{ ["--measure-boost" as string]: String(boost) }}
        >
          <ReaderPane />
        </div>
        <RailColumn
          visible={showStudy}
          open={studyOpen}
          width={studyWidth}
          strip={strip}
          transition={transition}
          fallback={<RailStrip side="study" />}
        >
          <StudySidebar />
        </RailColumn>
      </div>

      {focus ? null : (
        <div className="fixed bottom-4 left-4 right-4 z-40 flex gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setLeftOpen(true)}
            className="inline-flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-gold text-on-gold"
          >
            <Menu className="h-5 w-5" /> Surahs &amp; Juz
          </button>
          <button
            type="button"
            onClick={() => setRightOpen(true)}
            className="inline-flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-gold text-on-gold"
          >
            <BookOpen className="h-4 w-4" /> Study
          </button>
        </div>
      )}

      {leftOpen && !focus ? (
        <Drawer onClose={() => setLeftOpen(false)}>
          <SurahSidebar />
        </Drawer>
      ) : null}
      {rightOpen && !focus ? (
        <Drawer onClose={() => setRightOpen(false)} side="right">
          <StudySidebar />
        </Drawer>
      ) : null}

      {book ? null : (
      <div
        className={`fixed z-30 ${
          focus
            ? "bottom-5 left-1/2 w-[min(calc(100%-1.5rem),42rem)] -translate-x-1/2"
            : "bottom-20 left-3 right-3 xl:hidden"
        }`}
      >
        <AudioPlayer variant="dock" />
      </div>
      )}

      {book ? null : <SanaCompanion />}
      <TourOverlay />
      <AppModals />
    </div>
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
      className="min-h-0 shrink-0 overflow-hidden rounded-3xl shadow-[0_8px_28px_rgba(15,23,42,0.08)] will-change-[width]"
      aria-hidden={!visible}
    >
      <div className="h-full" style={{ width: open ? width : strip }}>
        {open ? children : fallback}
      </div>
    </motion.div>
  );
}

function useBreakpoints() {
  const [bp, setBp] = useState({ lg: false, xl: false, xxl: false });
  useEffect(() => {
    const lg = window.matchMedia("(min-width: 1024px)");
    const xl = window.matchMedia("(min-width: 1280px)");
    const xxl = window.matchMedia("(min-width: 1536px)");
    const sync = () => setBp({ lg: lg.matches, xl: xl.matches, xxl: xxl.matches });
    sync();
    lg.addEventListener("change", sync);
    xl.addEventListener("change", sync);
    xxl.addEventListener("change", sync);
    return () => {
      lg.removeEventListener("change", sync);
      xl.removeEventListener("change", sync);
      xxl.removeEventListener("change", sync);
    };
  }, []);
  return bp;
}

function Drawer({
  children,
  onClose,
  side = "left",
}: {
  children: React.ReactNode;
  onClose: () => void;
  side?: "left" | "right";
}) {
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button type="button" aria-label="Close panel" className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div className={`absolute top-0 h-full w-[min(100%,340px)] overflow-hidden ${side === "left" ? "left-0" : "right-0"}`}>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-black/20 text-gold"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}
