import { APPEARANCE_THEMES, appliedTheme, HOME_THEME, layoutSignals, LUMEN_CANVAS, LUMEN_GOLD, themeColorScheme } from "@/lib/appearance";
import { companionFilterFromGold } from "@/lib/companion";
import { loadPreferences } from "@/lib/storage";
import type { AppearanceThemeId, Preferences } from "@/lib/quran/types";

/** Matches the phone reader breakpoint (below Tailwind `md`). */
export const PHONE_MEDIA_QUERY = "(max-width: 767px)";

const THEME_PAINT: Record<AppearanceThemeId, { canvas: string; gold: string }> = {
  iris: { canvas: "#e4dcff", gold: "#5729a7" },
  pastels: { canvas: "#fff9fc", gold: "#734b5a" },
  manuscript: { canvas: "#e7ecf2", gold: "#0b5752" },
  emerald: { canvas: "#d8f3e6", gold: "#035a42" },
  ivory: { canvas: "#dbe7f6", gold: "#183fb0" },
  blush: { canvas: "#f8d7e8", gold: "#8b1141" },
  ottoman: { canvas: "#f6dfd2", gold: "#832c08" },
  sepia: { canvas: "#eadcc4", gold: "#723406" },
  contrast: { canvas: "#ffffff", gold: "#111111" },
  aurora: { canvas: "#07060c", gold: "#e879f9" },
  obsidian: { canvas: "#050505", gold: "#e8c872" },
  midnight: { canvas: "#0b1020", gold: "#e4c37a" },
  slate: { canvas: "#0b0d12", gold: "#7dd3fc" },
  forest: { canvas: "#06110c", gold: "#86efac" },
  amethyst: { canvas: "#120a1c", gold: "#d8b4fe" },
  rose: { canvas: "#140a0f", gold: "#f9a8d4" },
  cyan: { canvas: "#061418", gold: "#67e8f9" },
};

export function companionFilterForTheme(theme: AppearanceThemeId): string {
  if (theme === HOME_THEME) return companionFilterFromGold(LUMEN_GOLD, LUMEN_CANVAS);
  const paint = THEME_PAINT[theme];
  return companionFilterFromGold(paint.gold, paint.canvas);
}

export function focusOnForViewport(savedFocus: boolean, phone: boolean) {
  return savedFocus && !phone;
}

/** Saved Focus stays saved. Below the phone breakpoint the view is Scroll, without writing that back. */
export function viewPreferences(prefs: Preferences): Preferences {
  if (typeof window !== "undefined" && window.matchMedia(PHONE_MEDIA_QUERY).matches && prefs.focusMode) {
    return { ...prefs, focusMode: false };
  }
  return prefs;
}

export function readBootPreferences(): Preferences {
  return viewPreferences(loadPreferences());
}

export function applyBootAppearance(prefs: Preferences) {
  if (typeof document === "undefined") return;
  const view = viewPreferences(prefs);
  const theme = appliedTheme("/", view.theme);
  const root = document.documentElement;
  const focus = view.focusMode ? "on" : "off";
  const layout = layoutSignals(view);
  root.dataset.theme = theme;
  root.dataset.focus = focus;
  root.dataset.layers = String(layout.layers);
  root.dataset.size = layout.size;
  root.dataset.script = layout.script;
  root.style.setProperty("--companion-filter", companionFilterForTheme(theme));
  root.style.setProperty("--reading-size", `${view.fontSize}px`);
  document.querySelectorAll<HTMLElement>("[data-focus]").forEach((node) => node.setAttribute("data-focus", focus));
  const canvas = getComputedStyle(root).getPropertyValue("--canvas").trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", canvas || "#0f766e");
  document.querySelector('meta[name="color-scheme"]')?.setAttribute("content", themeColorScheme(theme));
}

function filterMap() {
  return Object.fromEntries(APPEARANCE_THEMES.map((theme) => [theme.id, companionFilterForTheme(theme.id)])) as Record<
    AppearanceThemeId,
    string
  >;
}

/** Runs in <head> before first paint. Sets theme, Sana's filter, and whether Focus is on. */
export function bootHeadScript() {
  const filters = JSON.stringify(filterMap());
  const themes = JSON.stringify(APPEARANCE_THEMES.map((theme) => theme.id));
  return `try{var p=JSON.parse(localStorage.getItem('al-mushaf-preferences')||'{}');var themes=${themes};var filters=${filters};var t=themes.indexOf(p.theme)>=0?p.theme:'iris';var root=document.documentElement;root.dataset.theme=t;root.style.setProperty('--companion-filter',filters[t]||filters.iris);var size=Number(p.fontSize);if(size>=14&&size<=36)root.style.setProperty('--reading-size',size+'px');var phone=window.matchMedia('(max-width: 767px)').matches;var focus=p.focusMode===true&&!phone?'on':'off';root.dataset.focus=focus;}catch(e){document.documentElement.dataset.theme='iris';document.documentElement.dataset.focus='off'}document.documentElement.dataset.scroll=/^\\/(read$|surah\\/|juz\\/)/.test(location.pathname)?'lock':'page';`;
}

/** Runs after the reader markup exists, still before paint, so Focus padding matches the head flag. */
export function bootBodyScript() {
  return `try{var focus=document.documentElement.dataset.focus==='on'?'on':'off';var nodes=document.querySelectorAll('[data-focus]');for(var i=0;i<nodes.length;i++)nodes[i].setAttribute('data-focus',focus);}catch(e){}`;
}
