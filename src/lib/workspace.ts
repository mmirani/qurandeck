export type WidgetKind =
  | "reader"
  | "surahs"
  | "juz"
  | "audio"
  | "notes"
  | "words"
  | "bookmarks"
  | "account";

export type ColumnRole = "reader" | "rail";

export type LayoutColumn = {
  id: string;
  role: ColumnRole;
  widgets: WidgetKind[];
};

export type LayoutPreset = "default" | "study" | "listen" | "compact" | "custom";

export type ColumnIntent = "auto" | 2 | 3 | 4;

export type WorkspaceLayout = {
  preset: LayoutPreset;
  columnIntent: ColumnIntent;
  columns: LayoutColumn[];
};

export type ResolvedWorkspace = {
  slots: LayoutColumn[];
  overflow: LayoutColumn[];
  maxColumns: 1 | 2 | 3 | 4;
  used: WidgetKind[];
  unused: WidgetKind[];
};

export const WIDGET_CATALOG: Record<
  WidgetKind,
  { label: string; hint: string; required?: boolean }
> = {
  reader: { label: "Mushaf", hint: "The reading column. Always on.", required: true },
  surahs: { label: "Surahs", hint: "Jump through 114 chapters" },
  juz: { label: "Juz", hint: "Thirty parts for paced reading" },
  audio: { label: "Recitation", hint: "Pinned to the foot of its column" },
  notes: { label: "Reflections", hint: "Notes on the ayah you are on" },
  words: { label: "Word by word", hint: "Meanings and single-word audio" },
  bookmarks: { label: "Bookmarks", hint: "Saved verses and words" },
  account: { label: "Account", hint: "Sign in and library shortcuts" },
};

export const RAIL_WIDGETS = (Object.keys(WIDGET_CATALOG) as WidgetKind[]).filter(
  (kind) => kind !== "reader",
);

export const MAX_COLUMNS = 4;
export const MAX_RAIL_WIDGETS = 4;
export const BREAKPOINTS = { two: 900, three: 1280, four: 1680 } as const;

function column(id: string, role: ColumnRole, widgets: WidgetKind[]): LayoutColumn {
  return { id, role, widgets };
}

export const PRESETS: Record<Exclude<LayoutPreset, "custom">, WorkspaceLayout> = {
  default: {
    preset: "default",
    columnIntent: "auto",
    columns: [
      column("nav", "rail", ["surahs"]),
      column("mushaf", "reader", ["reader"]),
      column("study", "rail", ["account", "notes", "words", "audio"]),
    ],
  },
  study: {
    preset: "study",
    columnIntent: "auto",
    columns: [
      column("nav", "rail", ["surahs", "juz"]),
      column("mushaf", "reader", ["reader"]),
      column("study", "rail", ["notes", "words"]),
      column("library", "rail", ["bookmarks", "account", "audio"]),
    ],
  },
  listen: {
    preset: "listen",
    columnIntent: "auto",
    columns: [
      column("nav", "rail", ["surahs"]),
      column("mushaf", "reader", ["reader"]),
      column("listen", "rail", ["audio", "words"]),
    ],
  },
  compact: {
    preset: "compact",
    columnIntent: "auto",
    columns: [
      column("mushaf", "reader", ["reader"]),
      column("dock", "rail", ["surahs", "audio"]),
    ],
  },
};

export const defaultWorkspace: WorkspaceLayout = PRESETS.default;

export function maxColumnsForWidth(width: number): 1 | 2 | 3 | 4 {
  if (width >= BREAKPOINTS.four) return 4;
  if (width >= BREAKPOINTS.three) return 3;
  if (width >= BREAKPOINTS.two) return 2;
  return 1;
}

function pinAudio(widgets: WidgetKind[]) {
  const rest = widgets.filter((item) => item !== "audio");
  return widgets.includes("audio") ? [...rest, "audio"] : rest;
}

function uniqueWidgets(widgets: WidgetKind[]) {
  const seen = new Set<WidgetKind>();
  const next: WidgetKind[] = [];
  for (const widget of widgets) {
    if (!WIDGET_CATALOG[widget] || widget === "reader" || seen.has(widget)) continue;
    seen.add(widget);
    next.push(widget);
  }
  return pinAudio(next);
}

export function widgetsInLayout(layout: WorkspaceLayout): WidgetKind[] {
  return layout.columns.flatMap((item) => item.widgets);
}

export function sanitizeLayout(input: unknown): WorkspaceLayout {
  const fallback = PRESETS.default;
  if (!input || typeof input !== "object") return fallback;
  const raw = input as Partial<WorkspaceLayout>;
  const preset = raw.preset && raw.preset in PRESETS ? raw.preset : raw.preset === "custom" ? "custom" : "default";
  const columnIntent =
    raw.columnIntent === 2 || raw.columnIntent === 3 || raw.columnIntent === 4 || raw.columnIntent === "auto"
      ? raw.columnIntent
      : "auto";
  const seen = new Set<WidgetKind>(["reader"]);
  const columns: LayoutColumn[] = [];
  let reader: LayoutColumn | null = null;

  for (const item of Array.isArray(raw.columns) ? raw.columns : []) {
    if (!item || typeof item !== "object") continue;
    const id = typeof item.id === "string" && item.id ? item.id : crypto.randomUUID();
    if (item.role === "reader") {
      reader = { id, role: "reader", widgets: ["reader"] };
      continue;
    }
    const widgets = uniqueWidgets(Array.isArray(item.widgets) ? item.widgets : []).filter((widget) => {
      if (seen.has(widget)) return false;
      seen.add(widget);
      return true;
    });
    columns.push({ id, role: "rail", widgets: widgets.slice(0, MAX_RAIL_WIDGETS) });
  }

  if (!reader) reader = { id: "mushaf", role: "reader", widgets: ["reader"] };
  const rails = columns.filter((item) => item.role === "rail").slice(0, MAX_COLUMNS - 1);
  const readerIndex = (Array.isArray(raw.columns) ? raw.columns : []).findIndex((item) => item?.role === "reader");
  const ordered =
    readerIndex <= 0 ? [reader, ...rails] : [...rails.slice(0, readerIndex), reader, ...rails.slice(readerIndex)];

  return { preset, columnIntent, columns: ordered.slice(0, MAX_COLUMNS) };
}

export function resolveLayout(
  layout: WorkspaceLayout,
  width: number,
  arranging: boolean,
): ResolvedWorkspace {
  const maxColumns = maxColumnsForWidth(width);
  const desired =
    layout.columnIntent === "auto"
      ? Math.min(
          maxColumns,
          Math.max(
            1,
            layout.columns.filter((item) => item.role === "reader" || item.widgets.length > 0 || arranging).length,
          ),
        )
      : Math.min(maxColumns, layout.columnIntent);
  const slots: LayoutColumn[] = [];
  const overflow: LayoutColumn[] = [];
  const readerPlaced = () => slots.some((item) => item.role === "reader");

  for (const column of layout.columns) {
    const emptyRail = column.role === "rail" && column.widgets.length === 0;
    if (emptyRail && !arranging) continue;
    const remaining = desired - slots.length;
    const mustHoldReader = !readerPlaced() && remaining === 1 && column.role !== "reader";
    if (mustHoldReader || remaining <= 0) {
      if (column.role === "rail") overflow.push(column);
      continue;
    }
    slots.push(column);
  }

  if (!readerPlaced()) {
    const reader = layout.columns.find((item) => item.role === "reader") ?? {
      id: "mushaf",
      role: "reader" as const,
      widgets: ["reader" as const],
    };
    slots.splice(Math.min(1, slots.length), 0, reader);
    if (slots.length > desired) overflow.push(...slots.splice(desired));
  }

  const used = widgetsInLayout(layout);
  const unused = RAIL_WIDGETS.filter((kind) => !used.includes(kind));
  return { slots, overflow, maxColumns, used, unused };
}

export function applyPreset(name: Exclude<LayoutPreset, "custom">): WorkspaceLayout {
  return structuredClone(PRESETS[name]);
}

export function addColumn(layout: WorkspaceLayout): WorkspaceLayout {
  const rails = layout.columns.filter((item) => item.role === "rail");
  if (layout.columns.length >= MAX_COLUMNS || rails.length >= MAX_COLUMNS - 1) return layout;
  const next: LayoutColumn = { id: `rail-${crypto.randomUUID().slice(0, 8)}`, role: "rail", widgets: [] };
  return { ...layout, preset: "custom", columns: [...layout.columns, next] };
}

export function removeColumn(layout: WorkspaceLayout, columnId: string): WorkspaceLayout {
  const target = layout.columns.find((item) => item.id === columnId);
  if (!target || target.role === "reader") return layout;
  const rest = layout.columns.filter((item) => item.id !== columnId);
  const host = rest.find((item) => item.role === "rail") ?? rest.find((item) => item.role === "reader");
  if (!host || host.role === "reader") {
    return { ...layout, preset: "custom", columns: rest };
  }
  const merged = uniqueWidgets([...host.widgets, ...target.widgets]).slice(0, MAX_RAIL_WIDGETS);
  return {
    ...layout,
    preset: "custom",
    columns: rest.map((item) => (item.id === host.id ? { ...item, widgets: merged } : item)),
  };
}

export function addWidget(layout: WorkspaceLayout, kind: WidgetKind, columnId?: string): WorkspaceLayout {
  if (kind === "reader" || widgetsInLayout(layout).includes(kind)) return layout;
  let columns = layout.columns;
  let target = columns.find((item) => item.id === columnId && item.role === "rail");
  if (!target) {
    target = [...columns].reverse().find((item) => item.role === "rail" && item.widgets.length < MAX_RAIL_WIDGETS);
  }
  if (!target && columns.length < MAX_COLUMNS) {
    const created = { id: `rail-${crypto.randomUUID().slice(0, 8)}`, role: "rail" as const, widgets: [] as WidgetKind[] };
    columns = [...columns, created];
    target = created;
  }
  if (!target || target.widgets.length >= MAX_RAIL_WIDGETS) return layout;
  return {
    ...layout,
    preset: "custom",
    columns: columns.map((item) =>
      item.id === target.id ? { ...item, widgets: pinAudio([...item.widgets, kind]) } : item,
    ),
  };
}

export function removeWidget(layout: WorkspaceLayout, kind: WidgetKind): WorkspaceLayout {
  if (kind === "reader") return layout;
  return {
    ...layout,
    preset: "custom",
    columns: layout.columns.map((item) => ({
      ...item,
      widgets: item.role === "reader" ? item.widgets : item.widgets.filter((widget) => widget !== kind),
    })),
  };
}

export function moveWidget(
  layout: WorkspaceLayout,
  kind: WidgetKind,
  toColumnId: string,
  index?: number,
): WorkspaceLayout {
  if (kind === "reader") return layout;
  const stripped = layout.columns.map((item) => ({
    ...item,
    widgets: item.widgets.filter((widget) => widget !== kind),
  }));
  const target = stripped.find((item) => item.id === toColumnId && item.role === "rail");
  if (!target || target.widgets.length >= MAX_RAIL_WIDGETS) return layout;
  const insertAt = Math.max(0, Math.min(index ?? target.widgets.length, target.widgets.length));
  const widgets = [...target.widgets];
  widgets.splice(insertAt, 0, kind);
  return {
    ...layout,
    preset: "custom",
    columns: stripped.map((item) => (item.id === target.id ? { ...item, widgets: pinAudio(widgets) } : item)),
  };
}

export function setColumnIntent(layout: WorkspaceLayout, columnIntent: ColumnIntent): WorkspaceLayout {
  return { ...layout, preset: "custom", columnIntent };
}

export function gridTemplate(slots: LayoutColumn[]) {
  return slots
    .map((slot) => (slot.role === "reader" ? "minmax(0,1fr)" : "minmax(240px, 320px)"))
    .join(" ");
}
