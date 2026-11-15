import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import "./register-dom.ts";
import { resetOuterReaderScroll, scrollOffsetInPane, scrollVerseIntoPane } from "../src/lib/reader-scroll";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const shell = readFileSync(new URL("../src/components/shell/app-shell.tsx", import.meta.url), "utf8");
const pane = readFileSync(new URL("../src/components/reader/reader-pane.tsx", import.meta.url), "utf8");

function box(top: number, height: number): DOMRect {
  return {
    top,
    bottom: top + height,
    left: 0,
    right: 400,
    width: 400,
    height,
    x: 0,
    y: top,
    toJSON() {
      return {};
    },
  } as DOMRect;
}

describe("reader hash scroll", () => {
  it("keeps the shell from being a scroll container", () => {
    assert.match(css, /#main-content\s*\{[^}]*overflow:\s*hidden;[^}]*overflow:\s*clip;/);
    assert.match(css, /html\[data-scroll="lock"\] body\s*\{[^}]*overscroll-behavior:\s*none;/);
    assert.match(shell, /id="main-content"/);
    assert.match(shell, /h-dvh/);
    assert.match(shell, /resetOuterReaderScroll/);
    assert.equal(pane.includes("scrollIntoView"), false);
  });

  it("scrolls the reading pane and clears an outer shell scroll", () => {
    document.body.innerHTML = `<main id="main-content"></main><div id="main-reader"></div>`;
    const shellNode = document.getElementById("main-content") as HTMLElement;
    const reader = document.getElementById("main-reader") as HTMLElement;
    const verse = document.createElement("article");
    verse.style.scrollMarginTop = "16px";
    reader.appendChild(verse);
    reader.getBoundingClientRect = () => box(120, 500);
    verse.getBoundingClientRect = () => box(420, 200);
    Object.defineProperty(reader, "scrollTop", { configurable: true, writable: true, value: 40 });
    Object.defineProperty(reader, "scrollHeight", { configurable: true, writable: true, value: 2400 });
    Object.defineProperty(reader, "clientHeight", { configurable: true, writable: true, value: 500 });
    Object.defineProperty(shellNode, "scrollTop", { configurable: true, writable: true, value: 380 });
    reader.style.overflowY = "auto";

    assert.equal(scrollOffsetInPane(reader, verse, "start"), 40 + (420 - 120) - 16);

    let scrolled = 0;
    reader.scrollTo = ((options?: ScrollToOptions) => {
      scrolled = options?.top ?? 0;
      reader.scrollTop = scrolled;
    }) as HTMLElement["scrollTo"];

    scrollVerseIntoPane(reader, verse, "auto", "start");
    assert.equal(scrolled, 324);
    assert.equal(shellNode.scrollTop, 0);
    assert.equal(window.scrollY, 0);
  });

  it("does not scroll a pane that only clips", () => {
    document.body.innerHTML = `<main id="main-content"></main><div id="main-reader"></div>`;
    const reader = document.getElementById("main-reader") as HTMLElement;
    const verse = document.createElement("article");
    reader.appendChild(verse);
    reader.style.overflowY = "hidden";
    let called = false;
    reader.scrollTo = (() => {
      called = true;
    }) as HTMLElement["scrollTo"];
    scrollVerseIntoPane(reader, verse, "auto");
    assert.equal(called, false);
    resetOuterReaderScroll();
  });
});
