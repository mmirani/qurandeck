import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { WORK_TITLE } from "@/lib/brand";
import { parseSurahId } from "@/lib/quran/ids";
import { fetchChapter } from "@/lib/quran/server";
import { arabicSvg } from "@/lib/og/naskh";

export const ogSize = { width: 1200, height: 630 };

/**
 * Iris, the live home theme (`[data-theme="iris"]` in globals.css).
 * Values are copied so a share card does not depend on CSS variables.
 * The corner wash is a light teal (`#7fe3d6`–`#b8f3ec`). It fades in that
 * hue, not toward transparent black, which was turning the aqua grey.
 */
const INK = "#1e1b4b";
const INK_SOFT = "#3d1779";
const PURPLE = "#5729a7";
const CANVAS = "#e4dcff";
const LINE = "#c4b5fd";

const WASH = [
  "radial-gradient(circle at 8% 0%, rgba(6, 182, 212, 0.22), transparent 36%)",
  "radial-gradient(circle at 100% 8%, rgba(87, 41, 167, 0.18), transparent 32%)",
  "radial-gradient(circle at 100% 108%, #8fe9db 0%, #b8f3ec 28%, #e7faf6 52%, rgba(231, 250, 246, 0) 70%)",
  "linear-gradient(122deg, #e4dcff 0%, #f6f3ff 48%, #f4f2ff 100%)",
].join(", ");

export const HOME_ARABIC = "القرآن الكريم";

export const HOME_SHARE = {
  title: "A personal mushaf",
  arabic: HOME_ARABIC,
  subtitle: `Free, private reading for ${WORK_TITLE}.`,
};

type FontFace = { name: string; data: Buffer; weight: 400; style: "normal" };

let fontsPromise: Promise<FontFace[]> | null = null;

function loadFonts() {
  if (!fontsPromise) {
    fontsPromise = readFile(join(process.cwd(), "src/assets/fonts/PlusJakartaSans-SemiBold.ttf")).then((jakarta) => [
      { name: "Jakarta", data: jakarta, weight: 400, style: "normal" },
    ]);
  }
  return fontsPromise;
}

function markSrc(svg: string) {
  const filled = svg.replace(/<style>[\s\S]*?<\/style>/, "").replace('class="mark"', `fill="${PURPLE}"`);
  return `data:image/svg+xml;base64,${Buffer.from(filled).toString("base64")}`;
}

export async function shareImage({
  title,
  subtitle,
  arabic,
  badge,
}: {
  title: string;
  subtitle: string;
  arabic?: string;
  badge?: string;
}) {
  const [fonts, svg, arabicMark] = await Promise.all([
    loadFonts(),
    readFile(join(process.cwd(), "src/app/icon.svg"), "utf8"),
    arabic ? arabicSvg(arabic, PURPLE, badge ? 78 : 84) : Promise.resolve(null),
  ]);
  const mark = markSrc(svg);
  const titleSize = badge ? 72 : 80;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: CANVAS,
          backgroundImage: WASH,
          color: INK,
          fontFamily: "Jakarta",
          padding: "68px 100px",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 156,
                height: 156,
                borderRadius: 36,
                backgroundColor: "rgba(250, 248, 255, 0.78)",
                border: `2px solid ${LINE}`,
              }}
            >
              {/* next/image cannot render inside ImageResponse. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mark} width={112} height={112} alt="" />
            </div>
            <div style={{ display: "flex", marginLeft: 28, fontSize: 58, letterSpacing: -1.5 }}>
              <span style={{ color: INK }}>Quran</span>
              <span style={{ color: PURPLE }}>Deck</span>
            </div>
          </div>
          {badge ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <div style={{ display: "flex", fontSize: 22, letterSpacing: 3, color: PURPLE }}>SURAH</div>
              <div
                style={{
                  display: "flex",
                  marginTop: 2,
                  fontSize: 72,
                  lineHeight: 0.95,
                  letterSpacing: -2,
                  color: PURPLE,
                }}
              >
                {badge}
              </div>
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          {arabicMark && !badge ? (
            <div style={{ display: "flex", marginBottom: 14 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={arabicMark.src} width={arabicMark.width} height={arabicMark.height} alt="" />
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              fontSize: titleSize,
              lineHeight: 1.05,
              letterSpacing: -1.6,
              color: INK,
            }}
          >
            {title}
          </div>
          {arabicMark && badge ? (
            <div style={{ display: "flex", marginTop: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={arabicMark.src} width={arabicMark.width} height={arabicMark.height} alt="" />
            </div>
          ) : null}
          <div style={{ display: "flex", marginTop: 18, fontSize: 32, lineHeight: 1.25, color: INK_SOFT }}>{subtitle}</div>
        </div>
      </div>
    ),
    { ...ogSize, fonts },
  );
}

export function renderHomeShareImage() {
  return shareImage(HOME_SHARE);
}

export async function renderSurahShareImage(rawId: string) {
  const id = parseSurahId(rawId);
  if (!id) {
    return shareImage({ title: "Surah", subtitle: "That chapter is not in the mushaf." });
  }
  try {
    const chapter = await fetchChapter(id);
    return shareImage({
      badge: String(id),
      title: chapter.nameSimple,
      arabic: chapter.nameArabic,
      subtitle: `${chapter.translatedName} · ${chapter.versesCount} ayahs`,
    });
  } catch {
    return shareImage({ title: `Surah ${id}`, subtitle: "Read it on QuranDeck." });
  }
}
