import { Window } from "happy-dom";

const dom = new Window({
  url: "http://localhost:3310/",
  innerWidth: 390,
  innerHeight: 800,
});

const keys = [
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "Element",
  "Node",
  "DocumentFragment",
  "SVGElement",
  "Event",
  "MouseEvent",
  "KeyboardEvent",
  "FocusEvent",
  "PointerEvent",
  "MutationObserver",
  "NodeFilter",
  "Document",
  "DOMParser",
  "HTMLButtonElement",
  "HTMLInputElement",
  "HTMLDivElement",
  "getSelection",
  "customElements",
] as const;

const view = dom as unknown as Record<string, unknown>;
for (const key of keys) {
  if (view[key] === undefined) continue;
  Object.defineProperty(globalThis, key, {
    configurable: true,
    writable: true,
    value: key === "window" ? dom : view[key],
  });
}

const globals = globalThis as unknown as Record<string, unknown>;
globals.getComputedStyle = dom.getComputedStyle.bind(dom);
globals.requestAnimationFrame = dom.requestAnimationFrame.bind(dom);
globals.cancelAnimationFrame = dom.cancelAnimationFrame.bind(dom);
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
