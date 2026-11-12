/**
 * Sana's microphone session for WebKit (iOS Safari, Chrome on iOS, and the
 * Home Screen app).
 *
 * webkitSpeechRecognition exists from iOS 14.5, but continuous recognition is
 * unreliable there: interim events often never fire, and the transcript is
 * delivered only after stop(), sometimes after a no-speech error and only
 * then in onend. Keep continuous false and interimResults true, call stop()
 * (never abort(), which throws the audio away), and run the command from
 * whatever onresult captured.
 *
 * start() must run in the same turn as the tap. Do not await getUserMedia
 * first — a separate capture holds the mic and recognition hears silence.
 */

export const VOICE_LISTENING = "Listening…";
export const VOICE_STOPPED = "Stopped. Type it in yourself.";
export const VOICE_UNAVAILABLE = "Voice input isn't available right now. You can type instead.";
export const VOICE_NO_SPEECH = "I didn't hear anything. You can type instead.";
export const VOICE_NOT_ALLOWED =
  "Microphone access is blocked. Allow the microphone for this site, or type instead.";
export const VOICE_AUDIO_CAPTURE = "I couldn't open the microphone. You can type instead.";
export const VOICE_NETWORK = "Voice input needs a connection. You can type instead.";
export const VOICE_SERVICE_BLOCKED = "Voice input isn't available in this browser. You can type instead.";
export const VOICE_SERVICE_STANDALONE =
  "Voice input isn't available in the Home Screen app. Open QuranDeck in Safari to speak, or type your request here.";
export const VOICE_GENERIC = "Voice input stopped. You can type instead.";

export const VOICE_SILENCE_MS = 1400;
export const VOICE_MAX_LISTEN_MS = 20000;

export type VoicePhase = "idle" | "starting" | "listening" | "stopping";

export type VoiceSnapshot = {
  phase: VoicePhase;
  /** True from the tap until the engine ends, so a second tap can stop. */
  active: boolean;
  /** True only after onstart, onaudiostart, or onspeechstart. */
  listening: boolean;
  transcript: string;
  message: string | null;
};

export function idleVoiceSnapshot(): VoiceSnapshot {
  return { phase: "idle", active: false, listening: false, transcript: "", message: null };
}

export type SpeechAlternative = { transcript?: string };
export type SpeechResultLike = ArrayLike<SpeechAlternative> & { isFinal?: boolean };
export type SpeechResultListLike = ArrayLike<SpeechResultLike> & { length: number };
export type SpeechResultEventLike = { resultIndex?: number; results: SpeechResultListLike };

export type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onaudiostart: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onresult: ((event: SpeechResultEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export type VoiceClock = {
  set: (fn: () => void, ms: number) => number;
  clear: (id: number) => void;
};

export type VoiceSession = {
  start: () => void;
  stop: () => void;
  toggle: () => void;
  /** End recognition without running the command (the typed text is being sent). */
  cancel: () => void;
  dispose: () => void;
  snapshot: () => VoiceSnapshot;
};

export type VoiceSessionOptions = {
  createRecognition: () => SpeechRecognitionLike;
  onCommand: (transcript: string) => void;
  onChange?: (snapshot: VoiceSnapshot) => void;
  language?: string | null;
  /** Home Screen / standalone PWA, where WebKit often refuses recognition. */
  standalone?: boolean;
  silenceMs?: number;
  maxListenMs?: number;
  clock?: VoiceClock;
};

const defaultClock: VoiceClock = {
  set: (fn, ms) => globalThis.setTimeout(fn, ms) as unknown as number,
  clear: (id) => globalThis.clearTimeout(id),
};

export function voiceLanguage(language: string | null | undefined): string {
  const value = language?.trim();
  return value ? value : "en-US";
}

export function voiceErrorMessage(code: string, standalone: boolean): string | null {
  switch (code) {
    case "not-allowed":
      return VOICE_NOT_ALLOWED;
    case "service-not-allowed":
      return standalone ? VOICE_SERVICE_STANDALONE : VOICE_SERVICE_BLOCKED;
    case "no-speech":
      return VOICE_NO_SPEECH;
    case "audio-capture":
      return VOICE_AUDIO_CAPTURE;
    case "network":
      return VOICE_NETWORK;
    case "aborted":
      return null;
    default:
      return VOICE_GENERIC;
  }
}

export function readSpeechTranscript(results: SpeechResultListLike | null | undefined): {
  live: string;
  finals: string;
} {
  if (!results || results.length === 0) return { live: "", finals: "" };
  const finalParts: string[] = [];
  const interimParts: string[] = [];
  for (let i = 0; i < results.length; i += 1) {
    const result = results[i];
    const text = result?.[0]?.transcript?.replace(/\s+/g, " ").trim() ?? "";
    if (!text) continue;
    if (result.isFinal) finalParts.push(text);
    else interimParts.push(text);
  }
  const finals = finalParts.join(" ");
  const interim = interimParts.join(" ");
  const live = [finals, interim].filter(Boolean).join(" ");
  return { finals, live };
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const nav = navigator as Navigator & { standalone?: boolean };
    return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
  } catch {
    return false;
  }
}

export function createVoiceSession(options: VoiceSessionOptions): VoiceSession {
  const silenceMs = options.silenceMs ?? VOICE_SILENCE_MS;
  const maxListenMs = options.maxListenMs ?? VOICE_MAX_LISTEN_MS;
  const clock = options.clock ?? defaultClock;
  const standalone = options.standalone ?? false;
  const language = voiceLanguage(options.language);

  let snapshot = idleVoiceSnapshot();
  let recognition: SpeechRecognitionLike | null = null;
  let live = "";
  let finals = "";
  let errorMessage: string | null = null;
  let userStop = false;
  let submitted = false;
  let quiet = false;
  let disposed = false;
  let closed = false;
  let heardEngine = false;
  let silenceTimer: number | null = null;
  let maxTimer: number | null = null;
  let generation = 0;

  const textNow = () => (live || finals).trim();

  const emit = (next: VoiceSnapshot) => {
    snapshot = next;
    if (!disposed) options.onChange?.(snapshot);
  };

  const publish = (phase: VoicePhase, message: string | null, transcript: string) => {
    emit({
      phase,
      active: phase !== "idle",
      listening: heardEngine && (phase === "listening" || phase === "stopping"),
      transcript,
      message,
    });
  };

  const clearSilence = () => {
    if (silenceTimer != null) clock.clear(silenceTimer);
    silenceTimer = null;
  };

  const clearMax = () => {
    if (maxTimer != null) clock.clear(maxTimer);
    maxTimer = null;
  };

  const clearTimers = () => {
    clearSilence();
    clearMax();
  };

  const finish = () => {
    if (closed) return;
    closed = true;
    clearTimers();
    const transcript = textNow();
    const stoppedByUser = userStop;
    const run = !disposed && !submitted && transcript.length > 0;
    let message: string | null = null;
    if (!run && !quiet && !disposed) {
      message = errorMessage ?? (stoppedByUser && !transcript ? VOICE_STOPPED : null);
    }
    recognition = null;
    heardEngine = false;
    userStop = false;
    if (run) submitted = true;
    publish("idle", message, run ? transcript : "");
    if (run) options.onCommand(transcript);
  };

  const armSilence = () => {
    if (closed || snapshot.phase === "idle" || snapshot.phase === "stopping") return;
    clearSilence();
    silenceTimer = clock.set(() => {
      silenceTimer = null;
      requestStop();
    }, silenceMs);
  };

  const armMax = () => {
    if (maxTimer != null || closed) return;
    maxTimer = clock.set(() => {
      maxTimer = null;
      requestStop();
    }, maxListenMs);
  };

  const markLive = () => {
    if (closed || disposed || snapshot.phase === "idle") return;
    const first = !heardEngine;
    heardEngine = true;
    if (first || snapshot.phase === "starting") {
      const phase = snapshot.phase === "stopping" ? "stopping" : "listening";
      publish(phase, VOICE_LISTENING, textNow());
    }
    armMax();
  };

  const deliverLate = (transcript: string) => {
    if (disposed || submitted || !transcript) return;
    submitted = true;
    errorMessage = null;
    publish("idle", null, transcript);
    options.onCommand(transcript);
  };

  const handleResult = (event: SpeechResultEventLike) => {
    const read = readSpeechTranscript(event.results);
    if (read.live) {
      live = read.live;
      finals = read.finals;
    }
    const transcript = textNow();
    if (!heardEngine && transcript) heardEngine = true;
    if (closed) {
      deliverLate(transcript);
      return;
    }
    const phase = snapshot.phase === "starting" ? "listening" : snapshot.phase;
    publish(phase, heardEngine ? VOICE_LISTENING : null, transcript);
    if (transcript) armSilence();
  };

  const handleError = (event: { error?: string }) => {
    const code = (event.error ?? "").toLowerCase();
    if (code === "aborted") {
      if (!userStop && !errorMessage) errorMessage = VOICE_GENERIC;
      return;
    }
    const friendly = voiceErrorMessage(code, standalone);
    if (friendly && !errorMessage) errorMessage = friendly;
    const fatal =
      code === "not-allowed" ||
      code === "service-not-allowed" ||
      code === "audio-capture" ||
      code === "network" ||
      code === "no-speech";
    if (fatal) finish();
  };

  function requestStop() {
    if (disposed || closed || snapshot.phase === "idle" || snapshot.phase === "stopping") return;
    userStop = true;
    publish("stopping", heardEngine ? VOICE_LISTENING : null, textNow());
    const rec = recognition;
    if (!rec) {
      finish();
      return;
    }
    try {
      rec.stop();
    } catch {
      finish();
    }
  }

  function cancel() {
    if (disposed || closed || snapshot.phase === "idle") return;
    submitted = true;
    quiet = true;
    errorMessage = null;
    requestStop();
  }

  function start() {
    if (disposed || snapshot.phase !== "idle") return;
    closed = false;
    submitted = false;
    quiet = false;
    userStop = false;
    errorMessage = null;
    live = "";
    finals = "";
    heardEngine = false;
    clearTimers();

    let rec: SpeechRecognitionLike;
    try {
      rec = options.createRecognition();
    } catch {
      publish("idle", VOICE_UNAVAILABLE, "");
      return;
    }

    const gen = ++generation;
    const current = () => gen === generation && !disposed;
    rec.lang = language;
    rec.continuous = false;
    rec.interimResults = true;
    rec.onstart = () => {
      if (current()) markLive();
    };
    rec.onaudiostart = () => {
      if (current()) markLive();
    };
    rec.onspeechstart = () => {
      if (!current()) return;
      markLive();
      clearSilence();
    };
    rec.onspeechend = () => {
      if (current()) armSilence();
    };
    rec.onresult = (event) => {
      if (current()) handleResult(event);
    };
    rec.onerror = (event) => {
      if (current()) handleError(event);
    };
    rec.onend = () => {
      if (current()) finish();
    };

    recognition = rec;
    publish("starting", null, "");
    try {
      // Synchronous on purpose: iOS drops the user-gesture if this is deferred.
      rec.start();
    } catch {
      recognition = null;
      clearTimers();
      heardEngine = false;
      closed = true;
      publish("idle", VOICE_UNAVAILABLE, "");
    }
  }

  function dispose() {
    disposed = true;
    submitted = true;
    quiet = true;
    if (!closed && recognition && snapshot.phase !== "idle") {
      try {
        recognition.stop();
      } catch {
        /* The engine had already ended. */
      }
    }
    clearTimers();
    closed = true;
    recognition = null;
    heardEngine = false;
    snapshot = idleVoiceSnapshot();
  }

  return {
    start,
    stop: requestStop,
    toggle() {
      if (snapshot.phase === "idle") start();
      else requestStop();
    },
    cancel,
    dispose,
    snapshot: () => snapshot,
  };
}
