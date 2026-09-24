export const AVATAR_PRESETS = [
  { id: "moon", label: "Crescent" },
  { id: "star", label: "Star" },
  { id: "sun", label: "Sun" },
  { id: "book", label: "Book" },
  { id: "lamp", label: "Lamp" },
  { id: "leaf", label: "Leaf" },
  { id: "spark", label: "Gleam" },
  { id: "flower", label: "Flower" },
] as const;

export type AvatarPresetId = (typeof AVATAR_PRESETS)[number]["id"];

const PRESET_IDS = new Set<string>(AVATAR_PRESETS.map((item) => item.id));
const MAX_AVATAR_CHARS = 120_000;

export function presetAvatar(id: AvatarPresetId) {
  return `preset:${id}`;
}

export function avatarPresetId(value?: string | null): AvatarPresetId | null {
  if (!value?.startsWith("preset:")) return null;
  const id = value.slice("preset:".length);
  return PRESET_IDS.has(id) ? (id as AvatarPresetId) : null;
}

export function validateAvatar(value: string): string | null {
  if (avatarPresetId(value)) return null;
  if (!value.startsWith("data:image/jpeg;base64,")) return "Choose a photo or one of the icons.";
  if (value.length > MAX_AVATAR_CHARS) return "That photo is too large. Frame it a little wider.";
  return null;
}

export function isPhotoAvatar(value?: string | null) {
  return Boolean(value?.startsWith("data:image/"));
}
