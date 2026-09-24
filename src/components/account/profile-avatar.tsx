"use client";

import { useRef, useState } from "react";
import { BookOpen, Flower2, Lamp, Leaf, Moon, Sparkles, Star, Sun } from "lucide-react";
import { useMushaf } from "@/components/providers/mushaf-provider";
import {
  AVATAR_PRESETS,
  avatarPresetId,
  isPhotoAvatar,
  presetAvatar,
  type AvatarPresetId,
  validateAvatar,
} from "@/lib/avatar";

const ICONS: Record<AvatarPresetId, typeof Moon> = {
  moon: Moon,
  star: Star,
  sun: Sun,
  book: BookOpen,
  lamp: Lamp,
  leaf: Leaf,
  spark: Sparkles,
  flower: Flower2,
};

const TINT: Record<AvatarPresetId, string> = {
  moon: "bg-[#1e3a5f] text-[#f3e7c4]",
  star: "bg-gold text-on-gold",
  sun: "bg-[#c9842a] text-[#fff8ea]",
  book: "bg-[#1f6b4a] text-[#f3fff6]",
  lamp: "bg-[#8a5a12] text-[#fff6df]",
  leaf: "bg-[#3d6b32] text-[#f3fff0]",
  spark: "bg-[#5b4b8a] text-[#f7f3ff]",
  flower: "bg-[#8d4d68] text-[#fff5f8]",
};

export function ProfileAvatar({
  name,
  avatar,
  className,
}: {
  name?: string | null;
  avatar?: string | null;
  className: string;
}) {
  const preset = avatarPresetId(avatar);
  if (isPhotoAvatar(avatar)) {
    return <img src={avatar!} alt="" className={`shrink-0 rounded-full object-cover ${className}`} />;
  }
  if (preset) {
    const Icon = ICONS[preset];
    return (
      <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-full ${TINT[preset]} ${className}`}>
        <Icon className="h-[55%] w-[55%]" />
      </span>
    );
  }
  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-full bg-gold font-semibold text-on-gold ${className}`}>
      {initials(name)}
    </span>
  );
}

export function AvatarPicker() {
  const { user, updateAvatar } = useMushaf();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  if (!user) return null;

  const choose = (avatar: string | null) => {
    const result = updateAvatar(avatar);
    setError(result);
    setMessage(result ? null : avatar ? "Saved." : "Using your initials.");
  };

  return (
    <section className="max-w-md">
      <h3 className="text-sm font-semibold text-ink">Profile photo</h3>
      <p className="mt-1 text-sm text-ink-soft">Add a photo, pick an icon, or stay with your initials.</p>
      <div className="mt-4 flex items-center gap-4">
        <ProfileAvatar name={user.displayName} avatar={user.avatar} className="h-20 w-20 text-xl" />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="h-10 cursor-pointer rounded-full bg-gold px-4 text-sm font-semibold text-on-gold"
          >
            {isPhotoAvatar(user.avatar) ? "Change photo" : "Add photo"}
          </button>
          {user.avatar ? (
            <button
              type="button"
              onClick={() => choose(null)}
              className="h-10 cursor-pointer rounded-full border border-line px-4 text-sm text-ink-soft"
            >
              Use initials
            </button>
          ) : null}
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          if (!file.type.startsWith("image/")) {
            setError("Choose a JPEG, PNG, or WebP photo.");
            return;
          }
          if (file.size > 8_000_000) {
            setError("Choose a photo under 8 MB.");
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            setError(null);
            setMessage(null);
            setCropSrc(typeof reader.result === "string" ? reader.result : null);
          };
          reader.readAsDataURL(file);
        }}
      />
      {cropSrc ? (
        <PhotoCropper
          src={cropSrc}
          onCancel={() => setCropSrc(null)}
          onSave={(photo) => {
            const problem = validateAvatar(photo);
            if (problem) {
              setError(problem);
              return;
            }
            choose(photo);
            setCropSrc(null);
          }}
        />
      ) : (
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-gold-deep">Or choose an icon</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {AVATAR_PRESETS.map((item) => {
              const selected = user.avatar === presetAvatar(item.id);
              const Icon = ICONS[item.id];
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-label={item.label}
                  aria-pressed={selected}
                  onClick={() => choose(presetAvatar(item.id))}
                  className={`flex h-12 w-12 cursor-pointer items-center justify-center rounded-full ${TINT[item.id]} ${
                    selected ? "ring-2 ring-gold ring-offset-2 ring-offset-canvas" : ""
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </button>
              );
            })}
          </div>
        </div>
      )}
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      {message ? <p className="mt-3 text-sm text-ink-soft">{message}</p> : null}
    </section>
  );
}

function PhotoCropper({
  src,
  onSave,
  onCancel,
}: {
  src: string;
  onSave: (photo: string) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const paint = (nextZoom = zoom, nextOffset = offset) => {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!image || !canvas) return;
    const size = canvas.width;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cover = Math.max(size / image.width, size / image.height) * nextZoom;
    const width = image.width * cover;
    const height = image.height * cover;
    const maxX = Math.max(0, (width - size) / 2);
    const maxY = Math.max(0, (height - size) / 2);
    const x = clamp(nextOffset.x, -maxX, maxX);
    const y = clamp(nextOffset.y, -maxY, maxY);
    ctx.fillStyle = "#f4efe4";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(image, (size - width) / 2 + x, (size - height) / 2 + y, width, height);
  };

  return (
    <div className="mt-4 rounded-3xl border border-line bg-surface p-4">
      <p className="text-sm text-ink">Drag the photo, then use the slider until it feels right.</p>
      <div className="mx-auto mt-3 h-56 w-56 overflow-hidden rounded-full border border-gold/50">
        <canvas
          ref={(node) => {
            canvasRef.current = node;
            if (node && imageRef.current) paint();
          }}
          width={256}
          height={256}
          className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
          }}
          onPointerMove={(event) => {
            if (!drag.current || !imageRef.current) return;
            const scale = 256 / event.currentTarget.getBoundingClientRect().width;
            const next = clampedOffset(imageRef.current, zoom, {
              x: drag.current.ox + (event.clientX - drag.current.x) * scale,
              y: drag.current.oy + (event.clientY - drag.current.y) * scale,
            });
            setOffset(next);
            paint(zoom, next);
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
        />
      </div>
      <img
        src={src}
        alt=""
        className="hidden"
        onLoad={(event) => {
          imageRef.current = event.currentTarget;
          setReady(true);
          setFailed(false);
          paint(1, { x: 0, y: 0 });
        }}
        onError={() => setFailed(true)}
      />
      <label className="mt-4 block text-sm text-ink-soft">
        Zoom
        <input
          type="range"
          min={1}
          max={2.6}
          step={0.01}
          value={zoom}
          className="mt-2 w-full accent-[var(--gold)]"
          onChange={(event) => {
            const nextZoom = Number(event.target.value);
            setZoom(nextZoom);
            paint(nextZoom, offset);
          }}
        />
      </label>
      {failed ? <p className="mt-2 text-sm text-danger">This photo could not be opened. Try a JPEG or PNG.</p> : null}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={!ready || failed}
          onClick={() => {
            paint(zoom, offset);
            const photo = canvasRef.current?.toDataURL("image/jpeg", 0.82);
            if (photo) onSave(photo);
          }}
          className="h-11 cursor-pointer rounded-full bg-gold px-5 text-sm font-semibold text-on-gold disabled:cursor-not-allowed disabled:opacity-50"
        >
          Use this photo
        </button>
        <button type="button" onClick={onCancel} className="h-11 cursor-pointer rounded-full border border-line px-5 text-sm text-ink-soft">
          Cancel
        </button>
      </div>
    </div>
  );
}

function initials(name?: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clampedOffset(image: HTMLImageElement, zoom: number, next: { x: number; y: number }) {
  const size = 256;
  const cover = Math.max(size / image.width, size / image.height) * zoom;
  const maxX = Math.max(0, (image.width * cover - size) / 2);
  const maxY = Math.max(0, (image.height * cover - size) / 2);
  return { x: clamp(next.x, -maxX, maxX), y: clamp(next.y, -maxY, maxY) };
}
