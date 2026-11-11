"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Mic, Minus, X } from "lucide-react";
import { useGuide } from "@/components/guide/guide-provider";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { COMPANION_NAME, COMPANION_NAME_AR } from "@/lib/brand";

type SpeechCtor = new () => {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function speechCtor(): SpeechCtor | null {
  if (typeof window === "undefined") return null;
  const host = window as Window & { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null;
}

function subscribeNever() {
  return () => {};
}

export function SanaGuidePanel({ onClose, onRest }: { onClose: () => void; onRest: () => void }) {
  const { ask, reply, suggestions, startWelcome } = useGuide();
  const { selectedVerseKey, isPlaying } = useMushaf();
  const [q, setQ] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const heard = useRef("");
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const speech = useSyncExternalStore(subscribeNever, () => speechCtor() !== null, () => false);

  useEffect(() => {
    const node = rootRef.current;
    const focus = window.setTimeout(() => inputRef.current?.focus(), 40);
    if (!node) return () => window.clearTimeout(focus);
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = [...node.querySelectorAll<HTMLElement>("button, input, textarea, a[href]")].filter(
        (item) => !item.hasAttribute("disabled") && item.tabIndex !== -1,
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    node.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(focus);
      node.removeEventListener("keydown", onKey);
    };
  }, []);

  const submit = (value: string) => {
    const text = value.trim();
    if (!text) return;
    ask(text);
    setQ("");
    setVoiceNote(null);
  };

  const toggleMic = () => {
    const Ctor = speechCtor();
    if (!Ctor) return;
    if (listening) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setListening(false);
      return;
    }
    const recognition = new Ctor();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    heard.current = "";
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      heard.current = transcript;
      setQ(transcript);
    };
    recognition.onerror = (event) => {
      setListening(false);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setVoiceNote("Microphone permission is blocked in this browser.");
        return;
      }
      if (event.error === "no-speech") {
        setVoiceNote("I didn't hear anything. You can type instead.");
        return;
      }
      setVoiceNote("Voice input stopped. You can type instead.");
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
      const transcript = heard.current.trim();
      if (transcript) submit(transcript);
    };
    try {
      recognition.start();
      setListening(true);
      setVoiceNote("Listening…");
    } catch {
      setListening(false);
      setVoiceNote("Voice input isn't available right now. You can type instead.");
    }
  };

  const quick = selectedVerseKey
    ? [
        { label: "Play", command: "Play this ayah" },
        { label: "Add note", command: "Add a note" },
        { label: "Bookmark", command: "Bookmark this ayah" },
        { label: "Tafsir", command: "Open tafsir" },
      ]
    : [
        { label: isPlaying ? "Pause" : "Play surah", command: isPlaying ? "Pause" : "Play this surah" },
        { label: "Search", command: "Where is search" },
        { label: "Bigger", command: "Bigger text" },
        { label: "Themes", command: "Open themes" },
      ];

  return (
    <div className="nur-guide" ref={rootRef}>
      <div className="nur-head">
        <p id="sana-title" className="nur-name">
          {COMPANION_NAME} <span lang="ar">{COMPANION_NAME_AR}</span>
        </p>
        <div className="nur-head-tools">
          <button type="button" className="nur-icon" aria-label={`Rest ${COMPANION_NAME}`} title="Rest" onClick={onRest}>
            <Minus className="h-4 w-4" />
          </button>
          <button type="button" className="nur-icon" aria-label={`Close ${COMPANION_NAME}`} title="Close" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <form
        className="nur-ask"
        onSubmit={(event) => {
          event.preventDefault();
          submit(q);
        }}
      >
        <label className="sr-only" htmlFor="sana-ask">
          Ask {COMPANION_NAME}
        </label>
        <input
          ref={inputRef}
          id="sana-ask"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder={`Ask ${COMPANION_NAME}…`}
          autoComplete="off"
          enterKeyHint="send"
        />
        <button type="submit" className="sr-only">
          Ask
        </button>
        {speech ? (
          <button
            type="button"
            className={`nur-mic ${listening ? "is-on" : ""}`}
            aria-pressed={listening}
            aria-label={listening ? "Stop voice input" : "Speak a command"}
            title={listening ? "Stop" : "Speak a command"}
            onClick={toggleMic}
          >
            <Mic className="h-4 w-4" />
          </button>
        ) : null}
      </form>
      {voiceNote ? <p className="nur-hint">{voiceNote}</p> : null}
      {reply ? (
        <p className="nur-reply" aria-live="polite">
          {reply}
        </p>
      ) : (
        <p className="nur-hint">
          {selectedVerseKey ? `With you at ${selectedVerseKey}. ` : ""}
          I help you use the mushaf. I do not give rulings or meanings.
        </p>
      )}
      <div className="nur-chip-row" role="group" aria-label="Quick actions">
        {quick.map((chip) => (
          <button key={chip.command} type="button" className="nur-chip" onClick={() => submit(chip.command)}>
            {chip.label}
          </button>
        ))}
      </div>
      {suggestions.length > 0 ? (
        <div className="nur-chip-row" role="group" aria-label="Suggestions">
          {suggestions
            .filter((item) => !quick.some((chip) => chip.command.toLowerCase() === item.toLowerCase()))
            .slice(0, 4)
            .map((item) => (
              <button key={item} type="button" className="nur-chip is-quiet" onClick={() => submit(item)}>
                {item}
              </button>
            ))}
        </div>
      ) : null}
      <button type="button" className="nur-tour" onClick={startWelcome}>
        Start tour
      </button>
    </div>
  );
}
