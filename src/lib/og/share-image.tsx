import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { WORK_TITLE } from "@/lib/brand";
import { parseSurahId } from "@/lib/quran/ids";
import { fetchChapter } from "@/lib/quran/server";

export const ogSize = { width: 1200, height: 630 };

type Font = { name: string; data: Buffer; weight: 400; style: "normal" };

let fontsPromise: Promise<Font[]> | null = null;

function loadFonts() {
  if (!fontsPromise) {
    fontsPromise = Promise.all([
      readFile(join(process.cwd(), "src/assets/fonts/PlusJakartaSans-SemiBold.ttf")),
      readFile(join(process.cwd(), "src/assets/fonts/Cairo-SemiBold.ttf")),
    ]).then(([jakarta, cairo]) => [
      { name: "Jakarta", data: jakarta, weight: 400, style: "normal" },
      { name: "Cairo", data: cairo, weight: 400, style: "normal" },
    ]);
  }
  return fontsPromise;
}

function markSrc(svg: string) {
  const filled = svg.replace(/<style>[\s\S]*?<\/style>/, "").replace('class="mark"', 'fill="#34baab"');
  return `data:image/svg+xml;base64,${Buffer.from(filled).toString("base64")}`;
}

export async function shareImage({
  title,
  subtitle,
  arabic,
  kicker,
}: {
  title: string;
  subtitle: string;
  arabic?: string;
  kicker?: string;
}) {
  const [fonts, svg] = await Promise.all([
    loadFonts(),
    readFile(join(process.cwd(), "src/app/icon.svg"), "utf8"),
  ]);
  const mark = markSrc(svg);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#042f2e",
          color: "#f7fffe",
          fontFamily: "Jakarta",
        }}
      >
        <div style={{ width: 22, height: "100%", background: "#34baab" }} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            padding: "68px 76px",
            background: "#0f766e",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            {/* next/image cannot render inside ImageResponse. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mark} width={88} height={88} alt="" />
            <div style={{ display: "flex", marginLeft: 22, fontSize: 40, color: "#ccfbf1" }}>QuranDeck</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {kicker ? (
              <div style={{ display: "flex", fontSize: 26, letterSpacing: 3, color: "#99f6e4", marginBottom: 18 }}>
                {kicker}
              </div>
            ) : null}
            <div style={{ display: "flex", fontSize: arabic ? 76 : 84, lineHeight: 1.02, letterSpacing: -1.5 }}>
              {title}
            </div>
            {arabic ? (
              <div
                style={{
                  display: "flex",
                  fontFamily: "Cairo",
                  fontSize: 64,
                  color: "#34baab",
                  marginTop: 12,
                }}
              >
                {arabic}
              </div>
            ) : null}
            <div style={{ display: "flex", marginTop: 22, fontSize: 32, color: "#ecfdf5" }}>{subtitle}</div>
          </div>
        </div>
      </div>
    ),
    { ...ogSize, fonts },
  );
}

export function renderHomeShareImage() {
  return shareImage({
    title: "A personal mushaf",
    subtitle: `Free, private reading for ${WORK_TITLE}.`,
  });
}

export async function renderSurahShareImage(rawId: string) {
  const id = parseSurahId(rawId);
  if (!id) {
    return shareImage({ title: "Surah", subtitle: "That chapter is not in the mushaf." });
  }
  try {
    const chapter = await fetchChapter(id);
    return shareImage({
      kicker: `SURAH ${id}`,
      title: chapter.nameSimple,
      arabic: chapter.nameArabic,
      subtitle: `${chapter.translatedName} · ${chapter.versesCount} ayahs`,
    });
  } catch {
    return shareImage({ title: `Surah ${id}`, subtitle: "Read it on QuranDeck." });
  }
}
