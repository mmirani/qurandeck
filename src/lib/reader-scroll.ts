/** Scroll a verse inside the reading pane. Never scrolls the document or the shell. */

export function resetOuterReaderScroll(shell: HTMLElement | null = document.getElementById("main-content")) {
  if (typeof window !== "undefined" && window.scrollY !== 0) window.scrollTo(0, 0);
  const root = document.scrollingElement;
  if (root && root.scrollTop !== 0) root.scrollTop = 0;
  if (document.body.scrollTop !== 0) document.body.scrollTop = 0;
  if (shell && shell.scrollTop !== 0) shell.scrollTop = 0;
}

export function scrollOffsetInPane(pane: HTMLElement, node: HTMLElement, block: "start" | "center" = "start") {
  const paneRect = pane.getBoundingClientRect();
  const nodeRect = node.getBoundingClientRect();
  const delta = nodeRect.top - paneRect.top;
  const marginTop = Number.parseFloat(getComputedStyle(node).scrollMarginTop) || 0;
  const next =
    block === "center"
      ? pane.scrollTop + delta - (pane.clientHeight - nodeRect.height) / 2
      : pane.scrollTop + delta - marginTop;
  const max = Math.max(0, pane.scrollHeight - pane.clientHeight);
  return Math.min(max, Math.max(0, next));
}

export function scrollVerseIntoPane(
  pane: HTMLElement,
  node: HTMLElement,
  behavior: ScrollBehavior = "smooth",
  block: "start" | "center" = "start",
) {
  resetOuterReaderScroll();
  const overflow = getComputedStyle(pane).overflowY;
  if (overflow !== "auto" && overflow !== "scroll") return;
  pane.scrollTo({ top: scrollOffsetInPane(pane, node, block), behavior });
  resetOuterReaderScroll();
}
