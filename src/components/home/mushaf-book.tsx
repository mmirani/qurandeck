"use client";

import { type CSSProperties, type FocusEvent, type MouseEvent, type PointerEvent as ReactPointerEvent, type Ref } from "react";
import type { EdgeChoice, MushafEdge, SurahBand, TooltipCopy } from "@/lib/mushaf-edge";
import { angleOf, tableShadowSpan, type MushafPan, type MushafPose } from "@/lib/mushaf-explore";

export type MarkHandlers = {
  onPointerEnter: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerLeave: () => void;
  onFocus: (event: FocusEvent<HTMLButtonElement>) => void;
  onBlur: () => void;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
};

type MushafBookProps = {
  edge: MushafEdge;
  pagesRef: Ref<HTMLDivElement>;
  variant: "card" | "explore";
  pose?: MushafPose;
  dragging?: boolean;
  pan?: MushafPan;
  spotlight?: number | null;
  tipId: string;
  menuId: string;
  activeTipId: string | null;
  activeMenuId: string | null;
  handlers: (id: string, copy: TooltipCopy, direct: EdgeChoice | null, choices: EdgeChoice[]) => MarkHandlers;
  onExplore?: () => void;
};

export function MushafBook({
  edge,
  pagesRef,
  variant,
  pose,
  dragging = false,
  pan,
  spotlight = null,
  tipId,
  menuId,
  activeTipId,
  activeMenuId,
  handlers,
  onExplore,
}: MushafBookProps) {
  const explore = variant === "explore";
  const zoomStyle: CSSProperties | undefined = pose
    ? ({
        "--mushaf-zoom": pose.zoom,
        "--mushaf-shadow": tableShadowSpan(pose.yaw).toFixed(4),
        "--mushaf-pan-x": explore && pan ? `${pan.x}px` : "0px",
        "--mushaf-pan-y": explore && pan ? `${pan.y}px` : "0px",
      } as CSSProperties)
    : undefined;
  const bookStyle: CSSProperties | undefined = pose
    ? ({
        "--mushaf-yaw": `${pose.yaw}deg`,
        "--mushaf-pitch": `${pose.pitch}deg`,
      } as CSSProperties)
    : undefined;

  return (
    <div
      className={`mushaf-zoom${explore ? " is-explore" : ""}${dragging ? " is-dragging" : ""}`}
      style={zoomStyle}
      data-testid={explore ? "mushaf-explore-zoom" : undefined}
    >
    <div
      data-testid={explore ? "mushaf-explore-book" : "mushaf-edge-book"}
      data-yaw={pose ? String(Math.round(pose.yaw)) : undefined}
      data-pitch={pose ? String(Math.round(pose.pitch)) : undefined}
      data-zoom={pose ? pose.zoom.toFixed(2) : undefined}
      data-pan-x={explore && pan ? String(Math.round(pan.x)) : undefined}
      data-pan-y={explore && pan ? String(Math.round(pan.y)) : undefined}
      data-angle={pose ? angleOf(pose) : undefined}
      className={`mushaf-scene${explore ? " is-explore" : ""}${dragging ? " is-dragging" : ""}`}
      onClick={
        onExplore
          ? (event) => {
              const target = event.target;
              if (!(target instanceof Element)) return;
              if (target.closest("button, a, input, label")) return;
              onExplore();
            }
          : undefined
      }
    >
      <div className="mushaf-float">
        <div className="mushaf-ground" aria-hidden="true" />
        <div className={`mushaf-book${dragging ? " is-dragging" : ""}`} style={bookStyle}>
          <div className="mushaf-spine" aria-hidden="true">
            <span className="mushaf-headband" />
            <span className="mushaf-headband mushaf-headband-2" />
          </div>
          <div className="mushaf-back" aria-hidden="true" />
          <div className="mushaf-front" aria-hidden="true">
            <div className="mushaf-cover-frame">
              <span className="mushaf-corner" data-corner="tl" />
              <span className="mushaf-corner" data-corner="tr" />
              <span className="mushaf-corner" data-corner="bl" />
              <span className="mushaf-corner" data-corner="br" />
              <span className="mushaf-cover-mark" />
              <p className="mushaf-cover-title">Your Mushaf</p>
            </div>
          </div>
          <div className="mushaf-board-top mushaf-board-top-front" aria-hidden="true" />
          <div className="mushaf-board-top mushaf-board-top-back" aria-hidden="true" />
          <div className="mushaf-board-fore mushaf-board-fore-front" aria-hidden="true" />
          <div className="mushaf-board-fore mushaf-board-fore-back" aria-hidden="true" />
          <div className="mushaf-page-top" aria-hidden="true">
            <PageStripes bands={edge.bands} empty={edge.empty} along="top" />
            <div className="mushaf-edge-lines mushaf-edge-lines-top pointer-events-none absolute inset-0" />
          </div>
          <div ref={pagesRef} className="mushaf-fore">
            <PageStripes bands={edge.bands} empty={edge.empty} along="fore" />
            <div className="mushaf-edge-lines pointer-events-none absolute inset-0" aria-hidden="true" />
            <div
              className="absolute inset-0 flex flex-row"
              role="group"
              aria-label="Page edge, Al-Fatihah at the front cover to An-Nas at the back"
            >
              {edge.buckets.map((bucket) => {
                const id = `pages-${bucket.id}`;
                const open = activeMenuId === id;
                return (
                  <button
                    key={bucket.id}
                    type="button"
                    data-testid="mushaf-edge-slice"
                    className="h-full min-w-0 cursor-pointer hover:bg-[color-mix(in_srgb,white_18%,transparent)]"
                    style={{ flex: `${bucket.ayahCount} 1 0%` }}
                    aria-label={`Pages, ${bucket.name}`}
                    aria-describedby={activeTipId === id ? tipId : undefined}
                    aria-expanded={bucket.choices.length > 0 ? open : undefined}
                    aria-haspopup={bucket.choices.length > 0 ? "dialog" : undefined}
                    aria-controls={open ? menuId : undefined}
                    {...handlers(id, bucket.tooltip, bucket.direct, bucket.choices)}
                  />
                );
              })}
            </div>
            {explore && spotlight != null ? (
              <span
                aria-hidden="true"
                data-testid="mushaf-explore-spot"
                className="mushaf-spot"
                style={{ left: `${Math.min(100, Math.max(0, spotlight * 100))}%` }}
              />
            ) : null}
          </div>
          {edge.noteFlags.map((flag, index) => {
            const id = `note-${flag.id}`;
            const open = activeMenuId === id;
            const ink = tabInk(flag.accent);
            return (
              <span
                key={flag.id}
                className="mushaf-tab-anchor absolute z-20"
                style={{
                  left: `${20 + Math.min(1, Math.max(0, flag.position)) * 62}%`,
                  zIndex: 20 + Math.round((1 - Math.min(1, Math.max(0, flag.position))) * 40),
                  transform: depthShift(flag.position, "translate(-50%, -74%)"),
                }}
              >
                <span className="mushaf-flag-rise block" style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}>
                  <button
                    type="button"
                    data-testid="mushaf-edge-flag"
                    className="mushaf-tab relative flex h-9 min-w-9 cursor-pointer items-end justify-center bg-transparent p-0"
                    aria-label={controlName("Note", flag.tooltip.title, flag.tooltip.lines[0] ?? "", flag.label)}
                    aria-describedby={activeTipId === id ? tipId : undefined}
                    aria-expanded={flag.choices.length > 0 ? open : undefined}
                    aria-haspopup={flag.choices.length > 0 ? "dialog" : undefined}
                    aria-controls={open ? menuId : undefined}
                    {...handlers(id, flag.tooltip, flag.direct, flag.choices)}
                  >
                    <span
                      className="mushaf-tab-face relative flex h-9 min-w-9 items-center justify-center whitespace-nowrap rounded-t-md rounded-b-sm px-1.5 text-xs font-semibold shadow-[var(--shadow)]"
                      style={{ background: ink.background, color: ink.color, border: `1px solid ${ink.border}` }}
                    >
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute top-0 right-0 h-2.5 w-2.5"
                        style={{ background: ink.color, opacity: 0.28, clipPath: "polygon(100% 0, 0 0, 100% 100%)" }}
                      />
                      <span aria-hidden="true">{flag.label}</span>
                    </span>
                  </button>
                </span>
              </span>
            );
          })}
          {edge.ribbons.map((ribbon, index) => {
            const id = `mark-${ribbon.id}`;
            const open = activeMenuId === id;
            return (
              <span
                key={ribbon.id}
                className="mushaf-ribbon-anchor absolute z-20"
                style={{
                  left: `${18 + Math.min(1, Math.max(0, ribbon.position)) * 58}%`,
                  zIndex: 20 + Math.round((1 - Math.min(1, Math.max(0, ribbon.position))) * 40),
                  transform: depthShift(ribbon.position, "translateX(-50%)"),
                }}
              >
                <span className="mushaf-ribbon-drop block" style={{ animationDelay: `${160 + Math.min(index, 8) * 40}ms` }}>
                  <button
                    type="button"
                    data-testid="mushaf-edge-ribbon"
                    className="mushaf-ribbon flex h-14 w-6 cursor-pointer items-start justify-center bg-transparent p-0"
                    aria-label={controlName("Bookmark", ribbon.tooltip.title, ribbon.tooltip.lines[0] ?? "", ribbon.label)}
                    aria-describedby={activeTipId === id ? tipId : undefined}
                    aria-expanded={ribbon.choices.length > 0 ? open : undefined}
                    aria-haspopup={ribbon.choices.length > 0 ? "dialog" : undefined}
                    aria-controls={open ? menuId : undefined}
                    {...handlers(id, ribbon.tooltip, ribbon.direct, ribbon.choices)}
                  >
                    <span aria-hidden="true" className="mushaf-satin" />
                    {ribbon.label ? (
                      <span className="absolute top-1 left-1/2 -translate-x-1/2 rounded-full bg-[#fff8e7] px-1 text-[10px] font-semibold leading-4 text-[#1c140c] ring-1 ring-[#c4b48a]">
                        {ribbon.label}
                      </span>
                    ) : null}
                  </button>
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
    </div>
  );
}

/**
 * The fore-edge seen straight on is only as wide as the book is thick. This lays the
 * same edge out at reading size, front cover on the left and back cover on the right.
 */
export function MushafEdgeMagnifier({
  edge,
  spotlight = null,
  tipId,
  menuId,
  activeTipId,
  activeMenuId,
  handlers,
}: Pick<MushafBookProps, "edge" | "spotlight" | "tipId" | "menuId" | "activeTipId" | "activeMenuId" | "handlers">) {
  return (
    <div data-testid="mushaf-edge-magnifier" className="flex shrink-0 flex-col gap-1 px-5 pt-2">
      <div className="flex items-baseline justify-between text-xs text-ink-soft">
        <span>Front cover · Al-Fatihah</span>
        <span className="font-medium text-ink">Page edge, magnified</span>
        <span>An-Nas · Back cover</span>
      </div>
      <div className="mushaf-magnifier relative overflow-hidden rounded-md">
        <PageStripes bands={edge.bands} empty={edge.empty} along="fore" />
        <div className="mushaf-edge-lines pointer-events-none absolute inset-0" aria-hidden="true" />
        <div
          className="absolute inset-0 flex flex-row"
          role="group"
          aria-label="Magnified page edge, Al-Fatihah on the left to An-Nas on the right"
        >
          {edge.buckets.map((bucket) => {
            const id = `zoom-pages-${bucket.id}`;
            const open = activeMenuId === id;
            return (
              <button
                key={bucket.id}
                type="button"
                data-testid="mushaf-magnifier-slice"
                className="h-full min-w-0 cursor-pointer hover:bg-[color-mix(in_srgb,white_22%,transparent)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold"
                style={{ flex: `${bucket.ayahCount} 1 0%` }}
                aria-label={`Pages, ${bucket.name}`}
                aria-describedby={activeTipId === id ? tipId : undefined}
                aria-expanded={bucket.choices.length > 0 ? open : undefined}
                aria-haspopup={bucket.choices.length > 0 ? "dialog" : undefined}
                aria-controls={open ? menuId : undefined}
                {...handlers(id, bucket.tooltip, bucket.direct, bucket.choices)}
              />
            );
          })}
        </div>
        {spotlight != null ? (
          <span
            aria-hidden="true"
            className="mushaf-spot"
            style={{ left: `${Math.min(100, Math.max(0, spotlight * 100))}%` }}
          />
        ) : null}
      </div>
    </div>
  );
}

function controlName(kind: string, title: string, range: string, extra: string) {
  return [kind, title, range, extra].filter(Boolean).join(", ");
}

/** Shift a mark through the page block: 0 is just behind the front cover. */
function depthShift(position: number, place: string) {
  const safe = Math.min(1, Math.max(0, position));
  const towardFront = (0.5 - safe).toFixed(4);
  return `${place} translateZ(calc(var(--page-d) * ${towardFront}))`;
}

function PageStripes({ bands, empty, along }: { bands: SurahBand[]; empty: boolean; along: "fore" | "top" }) {
  const fore = along === "fore";
  return (
    <div className={fore ? "flex h-full w-full flex-row overflow-hidden" : "flex h-full w-full flex-col-reverse overflow-hidden"}>
      {bands.map((band) => (
        <span
          key={band.chapterId}
          aria-hidden="true"
          className={fore ? "relative h-full min-w-0" : "relative min-h-0 w-full"}
          style={{ flex: `${band.ayahCount} 1 0%` }}
        >
          {!empty && band.readRatio > 0 ? (
            <span className="absolute inset-0" style={{ background: "rgba(28, 20, 12, 0.2)", opacity: Math.max(0.35, band.readRatio) }} />
          ) : null}
          {band.colors.length > 0 ? (
            <span className="absolute inset-0 flex flex-col">
              {band.colors.map((color) => (
                <span key={color.id} className="min-h-0 w-full" style={{ flexGrow: color.count, backgroundColor: color.color }} />
              ))}
            </span>
          ) : null}
        </span>
      ))}
    </div>
  );
}

function tabInk(hex: string | null): { background: string; color: string; border: string } {
  if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex)) {
    return { background: "#fff8e7", color: "#1c140c", border: "#c4b48a" };
  }
  const value = Number.parseInt(hex.slice(1), 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  const luma = (red * 299 + green * 587 + blue * 114) / 1000;
  return {
    background: hex,
    color: luma > 160 ? "#1c140c" : "#fff8e7",
    border: luma > 160 ? "#8a7044" : "#f4efe4",
  };
}
