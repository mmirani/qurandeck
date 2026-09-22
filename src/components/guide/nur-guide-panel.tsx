"use client";

import { useState } from "react";
import { Mic, Minus, X } from "lucide-react";
import { useGuide } from "@/components/guide/guide-provider";
import { COMPANION_NAME, COMPANION_NAME_AR } from "@/lib/brand";

export function NurGuidePanel({
  onClose,
  onRest,
}: {
  onClose: () => void;
  onRest: () => void;
}) {
  const { startWelcome } = useGuide();
  const [q, setQ] = useState("");
  const [mic, setMic] = useState(false);

  return (
    <div className="nur-guide">
      <div className="nur-head">
        <p id="nur-title" className="nur-name">
          {COMPANION_NAME} <span lang="ar">{COMPANION_NAME_AR}</span>
        </p>
        <div className="nur-head-tools">
          <button type="button" className="nur-icon" aria-label="Rest" title="Rest" onClick={onRest}>
            <Minus className="h-4 w-4" />
          </button>
          <button type="button" className="nur-icon" aria-label="Close" title="Close" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <form
        className="nur-ask"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <label className="sr-only" htmlFor="nur-ask">
          Ask {COMPANION_NAME}
        </label>
        <input
          id="nur-ask"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder={`Ask ${COMPANION_NAME}…`}
          autoComplete="off"
        />
        <button
          type="button"
          className={`nur-mic ${mic ? "is-on" : ""}`}
          aria-pressed={mic}
          aria-label={mic ? "Audio questions on" : "Enable audio questions"}
          title="Audio questions — coming soon"
          onClick={() => setMic((value) => !value)}
        >
          <Mic className="h-4 w-4" />
        </button>
      </form>
      <button type="button" className="nur-tour" onClick={startWelcome}>
        Start tour
      </button>
    </div>
  );
}
