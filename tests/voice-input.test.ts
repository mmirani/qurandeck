import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import nextConfig from "../next.config";
import {
  createVoiceSession,
  readSpeechTranscript,
  voiceErrorMessage,
  voiceLanguage,
  VOICE_AUDIO_CAPTURE,
  VOICE_GENERIC,
  VOICE_LISTENING,
  VOICE_NETWORK,
  VOICE_NO_SPEECH,
  VOICE_NOT_ALLOWED,
  VOICE_SERVICE_BLOCKED,
  VOICE_SERVICE_STANDALONE,
  VOICE_STOPPED,
  VOICE_MAX_LISTEN_MS,
  VOICE_ONE_MOMENT,
  VOICE_SILENCE_MS,
  VOICE_UNAVAILABLE,
  releasePlayback,
  voiceHandsOffPlayback,
  type SpeechRecognitionLike,
  type SpeechResultEventLike,
  type SpeechResultListLike,
  type VoiceClock,
} from "../src/lib/guide/voice";

function createClock() {
  let seq = 0;
  const timers = new Map<number, () => void>();
  const delays: number[] = [];
  const clock: VoiceClock = {
    set(fn, ms) {
      const id = ++seq;
      timers.set(id, fn);
      delays.push(ms);
      return id;
    },
    clear(id) {
      timers.delete(id);
    },
  };
  return {
    clock,
    ids() {
      return [...timers.keys()];
    },
    delays() {
      return delays;
    },
    fire(id: number) {
      const fn = timers.get(id);
      if (!fn) throw new Error(`missing timer ${id}`);
      timers.delete(id);
      fn();
    },
    fireLast() {
      const ids = [...timers.keys()];
      const id = ids[ids.length - 1];
      if (id == null) throw new Error("no timer");
      this.fire(id);
    },
  };
}

function resultsOf(parts: { text: string; isFinal: boolean }[]): SpeechResultListLike {
  const list = parts.map((part) => ({
    isFinal: part.isFinal,
    length: 1,
    0: { transcript: part.text },
  }));
  return Object.assign(list, { length: list.length });
}

function eventOf(parts: { text: string; isFinal: boolean }[]): SpeechResultEventLike {
  return { resultIndex: 0, results: resultsOf(parts) };
}

/**
 * Mimics iOS WebKit: start() raises the engine, but the transcript is held
 * until stop(). abort() discards it.
 */
class IosRecognition implements SpeechRecognitionLike {
  lang = "";
  continuous = true;
  interimResults = false;
  onstart: (() => void) | null = null;
  onaudiostart: (() => void) | null = null;
  onspeechstart: (() => void) | null = null;
  onspeechend: (() => void) | null = null;
  onresult: ((event: SpeechResultEventLike) => void) | null = null;
  onerror: ((event: { error?: string }) => void) | null = null;
  onend: (() => void) | null = null;
  started = 0;
  stopCalls = 0;
  abortCalls = 0;
  pending = "play this surah";
  /** When set, stop() fires this error before the transcript (a real WebKit order). */
  errorBeforeResult: string | null = null;
  /** stop() ends without delivering audio. */
  holdResult = false;
  seenAtStart: { lang: string; continuous: boolean; interimResults: boolean } | null = null;

  start() {
    this.started += 1;
    this.seenAtStart = {
      lang: this.lang,
      continuous: this.continuous,
      interimResults: this.interimResults,
    };
    this.onstart?.();
    this.onaudiostart?.();
  }

  stop() {
    this.stopCalls += 1;
    if (this.errorBeforeResult) this.onerror?.({ error: this.errorBeforeResult });
    if (!this.holdResult && this.pending) {
      this.onresult?.(eventOf([{ text: this.pending, isFinal: true }]));
    }
    this.onend?.();
  }

  abort() {
    this.abortCalls += 1;
    this.onerror?.({ error: "aborted" });
    this.onend?.();
  }

  emit(text: string, isFinal: boolean) {
    this.onresult?.(eventOf([{ text, isFinal }]));
  }
}

function sessionAround(rec: IosRecognition, extra?: { standalone?: boolean; language?: string | null }) {
  const commands: string[] = [];
  const clock = createClock();
  const session = createVoiceSession({
    createRecognition: () => rec,
    onCommand: (transcript) => commands.push(transcript),
    language: extra?.language,
    standalone: extra?.standalone,
    clock: clock.clock,
  });
  return { session, commands, clock };
}

describe("voice language and errors", () => {
  it("falls back to en-US and keeps a provided locale", () => {
    assert.equal(voiceLanguage(undefined), "en-US");
    assert.equal(voiceLanguage("  "), "en-US");
    assert.equal(voiceLanguage("en-GB"), "en-GB");
  });

  it("explains each recognition error, including the Home Screen fallback", () => {
    assert.equal(voiceErrorMessage("not-allowed", false), VOICE_NOT_ALLOWED);
    assert.equal(voiceErrorMessage("no-speech", false), VOICE_NO_SPEECH);
    assert.equal(voiceErrorMessage("audio-capture", false), VOICE_AUDIO_CAPTURE);
    assert.equal(voiceErrorMessage("network", false), VOICE_NETWORK);
    assert.equal(voiceErrorMessage("service-not-allowed", false), VOICE_SERVICE_BLOCKED);
    assert.equal(voiceErrorMessage("service-not-allowed", true), VOICE_SERVICE_STANDALONE);
    assert.match(VOICE_SERVICE_STANDALONE, /Safari/);
    assert.match(VOICE_SERVICE_STANDALONE, /type/i);
    assert.equal(voiceErrorMessage("aborted", false), null);
    assert.equal(voiceErrorMessage("something-else", false), VOICE_GENERIC);
  });

  it("joins final and interim phrases from a result list", () => {
    const read = readSpeechTranscript(
      resultsOf([
        { text: "play", isFinal: true },
        { text: "this surah", isFinal: false },
      ]),
    );
    assert.equal(read.finals, "play");
    assert.equal(read.live, "play this surah");
  });
});

describe("iOS speech session", () => {
  it("configures recognition for WebKit and calls start synchronously", () => {
    const rec = new IosRecognition();
    let returned: unknown = "unset";
    const { session } = sessionAround(rec, { language: "en-GB" });
    returned = session.start();
    assert.equal(returned, undefined);
    assert.equal(rec.started, 1);
    assert.deepEqual(rec.seenAtStart, { lang: "en-GB", continuous: false, interimResults: true });
    assert.equal(session.snapshot().listening, true);
    assert.equal(session.snapshot().message, VOICE_LISTENING);
    assert.equal(rec.abortCalls, 0);
  });

  it("does not say Listening until onstart, onaudiostart, or onspeechstart", () => {
    for (const event of ["onstart", "onaudiostart", "onspeechstart"] as const) {
      const rec = new IosRecognition();
      rec.start = () => {
        rec.started += 1;
      };
      const { session } = sessionAround(rec);
      session.start();
      assert.equal(session.snapshot().active, true);
      assert.equal(session.snapshot().listening, false);
      assert.equal(session.snapshot().message, null);
      rec[event]?.();
      assert.equal(session.snapshot().listening, true);
      assert.equal(session.snapshot().message, VOICE_LISTENING);
      session.dispose();
    }
  });

  it("holds the transcript until stop, then runs that command once", () => {
    const rec = new IosRecognition();
    const { session, commands } = sessionAround(rec);
    session.start();
    assert.equal(session.snapshot().transcript, "");
    assert.deepEqual(commands, []);
    session.stop();
    assert.equal(rec.stopCalls, 1);
    assert.equal(rec.abortCalls, 0);
    assert.deepEqual(commands, ["play this surah"]);
    assert.equal(session.snapshot().phase, "idle");
    assert.equal(session.snapshot().listening, false);
    assert.equal(session.snapshot().message, null);
  });

  it("runs the phrase on a second tap, which stops rather than aborts", () => {
    const rec = new IosRecognition();
    const { session, commands } = sessionAround(rec);
    session.toggle();
    assert.deepEqual(commands, []);
    session.toggle();
    assert.equal(rec.stopCalls, 1);
    assert.equal(rec.abortCalls, 0);
    assert.deepEqual(commands, ["play this surah"]);
  });

  it("still runs a transcript that arrives after a no-speech error on stop", () => {
    const rec = new IosRecognition();
    rec.errorBeforeResult = "no-speech";
    const { session, commands } = sessionAround(rec);
    session.start();
    session.stop();
    assert.deepEqual(commands, ["play this surah"]);
    assert.equal(session.snapshot().message, null);
  });

  it("runs an interim phrase on end when WebKit never marks it final", () => {
    const rec = new IosRecognition();
    rec.holdResult = true;
    const { session, commands } = sessionAround(rec);
    session.start();
    rec.emit("next ayah", false);
    assert.equal(session.snapshot().transcript, "next ayah");
    assert.deepEqual(commands, []);
    session.stop();
    assert.deepEqual(commands, ["next ayah"]);
  });

  it("shows the live phrase as interim results arrive and waits to run it", () => {
    const rec = new IosRecognition();
    rec.start = () => {
      rec.started += 1;
      rec.onstart?.();
    };
    rec.holdResult = true;
    const { session, commands } = sessionAround(rec);
    session.start();
    rec.onresult?.(
      eventOf([
        { text: "play", isFinal: true },
        { text: "this surah", isFinal: false },
      ]),
    );
    assert.equal(session.snapshot().transcript, "play this surah");
    assert.deepEqual(commands, []);
    rec.onend?.();
    assert.deepEqual(commands, ["play this surah"]);
  });

  it("runs the transcript when it arrives only after stop returns", () => {
    const rec = new IosRecognition();
    rec.stop = () => {
      rec.stopCalls += 1;
    };
    const { session, commands } = sessionAround(rec);
    session.start();
    session.stop();
    assert.equal(rec.stopCalls, 1);
    assert.equal(rec.abortCalls, 0);
    assert.equal(session.snapshot().phase, "stopping");
    assert.equal(session.snapshot().listening, true);
    assert.equal(session.snapshot().message, VOICE_LISTENING);
    assert.deepEqual(commands, []);
    rec.onresult?.(eventOf([{ text: "bookmark this ayah", isFinal: true }]));
    assert.equal(session.snapshot().transcript, "bookmark this ayah");
    assert.deepEqual(commands, []);
    rec.onend?.();
    assert.deepEqual(commands, ["bookmark this ayah"]);
    assert.equal(session.snapshot().phase, "idle");
  });

  it("auto-stops after silence and after the max listen window", () => {
    const silence = new IosRecognition();
    const silenceRun = sessionAround(silence);
    silenceRun.session.start();
    assert.deepEqual(silenceRun.clock.delays(), [VOICE_MAX_LISTEN_MS]);
    silence.onspeechstart?.();
    silence.onspeechend?.();
    assert.equal(silence.stopCalls, 0);
    assert.equal(silenceRun.clock.delays().at(-1), VOICE_SILENCE_MS);
    silenceRun.clock.fireLast();
    assert.equal(silence.stopCalls, 1);
    assert.deepEqual(silenceRun.commands, ["play this surah"]);

    const capped = new IosRecognition();
    const cappedRun = sessionAround(capped);
    cappedRun.session.start();
    assert.equal(capped.stopCalls, 0);
    cappedRun.clock.fireLast();
    assert.equal(capped.stopCalls, 1);
    assert.deepEqual(cappedRun.commands, ["play this surah"]);
  });

  it("clears the silence timer when speech resumes", () => {
    const rec = new IosRecognition();
    rec.start = () => {
      rec.started += 1;
      rec.onstart?.();
    };
    const { session, clock } = sessionAround(rec);
    session.start();
    const armed = clock.ids().length;
    rec.onspeechend?.();
    assert.equal(clock.ids().length, armed + 1);
    rec.onspeechstart?.();
    assert.equal(clock.ids().length, armed);
    session.dispose();
  });

  it("says it stopped when a second tap heard nothing", () => {
    const rec = new IosRecognition();
    rec.pending = "";
    const { session, commands } = sessionAround(rec);
    session.start();
    session.stop();
    assert.deepEqual(commands, []);
    assert.equal(session.snapshot().message, VOICE_STOPPED);
    assert.equal(session.snapshot().active, false);
  });

  it("reports permission, capture, network, and Home Screen failures", () => {
    const cases = [
      { code: "not-allowed", standalone: false, message: VOICE_NOT_ALLOWED },
      { code: "audio-capture", standalone: false, message: VOICE_AUDIO_CAPTURE },
      { code: "network", standalone: false, message: VOICE_NETWORK },
      { code: "no-speech", standalone: false, message: VOICE_NO_SPEECH },
      { code: "service-not-allowed", standalone: false, message: VOICE_SERVICE_BLOCKED },
      { code: "service-not-allowed", standalone: true, message: VOICE_SERVICE_STANDALONE },
    ];
    for (const item of cases) {
      const rec = new IosRecognition();
      rec.start = () => {
        rec.onerror?.({ error: item.code });
        rec.onend?.();
      };
      const { session, commands } = sessionAround(rec, { standalone: item.standalone });
      session.start();
      assert.equal(session.snapshot().message, item.message);
      assert.equal(session.snapshot().listening, false);
      assert.deepEqual(commands, []);
    }
  });

  it("says voice is unavailable when start throws", () => {
    const rec = new IosRecognition();
    rec.start = () => {
      throw new Error("InvalidStateError");
    };
    const { session } = sessionAround(rec);
    session.start();
    assert.equal(session.snapshot().message, VOICE_UNAVAILABLE);
    assert.equal(session.snapshot().active, false);
  });

  it("does not run the command twice, and cancel lets the typed text win", () => {
    const rec = new IosRecognition();
    const { session, commands } = sessionAround(rec);
    session.start();
    session.stop();
    session.stop();
    assert.deepEqual(commands, ["play this surah"]);

    const typed = new IosRecognition();
    const typedRun = sessionAround(typed);
    typedRun.session.start();
    typed.emit("pause", true);
    typedRun.session.cancel();
    assert.deepEqual(typedRun.commands, []);
    assert.equal(typedRun.session.snapshot().phase, "idle");
  });

  it("ignores a late result from the previous engine after a new tap", () => {
    const first = new IosRecognition();
    const second = new IosRecognition();
    second.pending = "pause";
    const recs = [first, second];
    let created = 0;
    const commands: string[] = [];
    const clock = createClock();
    const session = createVoiceSession({
      createRecognition: () => recs[created++] ?? second,
      onCommand: (transcript) => commands.push(transcript),
      clock: clock.clock,
    });
    session.start();
    session.stop();
    assert.deepEqual(commands, ["play this surah"]);
    session.start();
    first.onresult?.(eventOf([{ text: "ignore me", isFinal: true }]));
    first.onend?.();
    assert.deepEqual(commands, ["play this surah"]);
    session.stop();
    assert.deepEqual(commands, ["play this surah", "pause"]);
  });

  it("releases the mic on dispose without running a command or aborting", () => {
    const rec = new IosRecognition();
    const { session, commands } = sessionAround(rec);
    session.start();
    session.dispose();
    assert.deepEqual(commands, []);
    assert.equal(rec.stopCalls, 1);
    assert.equal(rec.abortCalls, 0);
    assert.equal(session.snapshot().phase, "idle");
  });

  it("listens three times on a new recognizer each tap", () => {
    const phrases = ["play this surah", "pause", "next ayah"];
    const made: IosRecognition[] = [];
    const commands: string[] = [];
    const clock = createClock();
    let prepared = 0;
    const session = createVoiceSession({
      createRecognition: () => {
        const rec = new IosRecognition();
        rec.pending = phrases[made.length] ?? "again";
        made.push(rec);
        return rec;
      },
      onCommand: (transcript) => commands.push(transcript),
      beforeStart: () => {
        prepared += 1;
      },
      clock: clock.clock,
    });
    for (let i = 0; i < 3; i += 1) {
      session.start();
      assert.ok(made[i]?.seenAtStart);
      session.stop();
    }
    assert.equal(made.length, 3);
    assert.equal(prepared, 3);
    assert.deepEqual(commands, phrases);
    for (const rec of made) {
      assert.equal(rec.started, 1);
      assert.equal(rec.abortCalls, 0);
      assert.deepEqual(rec.seenAtStart, { lang: "en-US", continuous: false, interimResults: true });
    }
    assert.equal(made[0].onend, null);
    assert.equal(made[1].onresult, null);
  });

  it("ignores a late onend from the first listen after the second has started, then takes a third", () => {
    const first = new IosRecognition();
    first.stop = () => {
      first.stopCalls += 1;
    };
    const second = new IosRecognition();
    second.pending = "pause";
    const third = new IosRecognition();
    third.pending = "next ayah";
    const recs = [first, second, third];
    let created = 0;
    const commands: string[] = [];
    const clock = createClock();
    const session = createVoiceSession({
      createRecognition: () => recs[created++] ?? third,
      onCommand: (transcript) => commands.push(transcript),
      clock: clock.clock,
    });
    session.start();
    const staleEnd = first.onend;
    const staleResult = first.onresult;
    assert.equal(typeof staleEnd, "function");
    session.stop();
    assert.equal(session.snapshot().phase, "stopping");
    assert.deepEqual(commands, []);
    session.toggle();
    assert.equal(second.started, 1);
    assert.equal(second.abortCalls, 0);
    assert.equal(first.onend, null);
    assert.equal(first.onresult, null);
    assert.equal(session.snapshot().phase, "listening");
    staleResult?.(eventOf([{ text: "play this surah", isFinal: true }]));
    staleEnd?.();
    assert.equal(session.snapshot().phase, "listening");
    assert.equal(session.snapshot().message, VOICE_LISTENING);
    assert.deepEqual(commands, []);
    session.stop();
    assert.deepEqual(commands, ["pause"]);
    session.toggle();
    session.toggle();
    assert.equal(third.started, 1);
    assert.deepEqual(commands, ["pause", "next ayah"]);
    assert.equal(created, 3);
  });

  it("shows one moment when the next start is rejected, then listens on the following tap", () => {
    const first = new IosRecognition();
    const second = new IosRecognition();
    second.start = () => {
      throw new Error("InvalidStateError");
    };
    const third = new IosRecognition();
    third.pending = "bookmark this ayah";
    const recs = [first, second, third];
    let created = 0;
    const commands: string[] = [];
    const clock = createClock();
    const session = createVoiceSession({
      createRecognition: () => recs[created++] ?? third,
      onCommand: (transcript) => commands.push(transcript),
      clock: clock.clock,
    });
    session.start();
    session.stop();
    assert.deepEqual(commands, ["play this surah"]);
    session.start();
    assert.equal(session.snapshot().message, VOICE_ONE_MOMENT);
    assert.equal(session.snapshot().phase, "idle");
    assert.equal(session.snapshot().active, false);
    session.start();
    session.stop();
    assert.deepEqual(commands, ["play this surah", "bookmark this ayah"]);
    assert.equal(created, 3);
  });

  it("does not let the previous listen's timer stop the next one", () => {
    const first = new IosRecognition();
    first.stop = () => {
      first.stopCalls += 1;
    };
    const second = new IosRecognition();
    second.pending = "pause";
    const recs = [first, second];
    let created = 0;
    const commands: string[] = [];
    const clock = createClock();
    const session = createVoiceSession({
      createRecognition: () => recs[created++] ?? second,
      onCommand: (transcript) => commands.push(transcript),
      clock: clock.clock,
    });
    session.start();
    const stale = clock.ids()[0];
    session.stop();
    session.toggle();
    assert.equal(second.started, 1);
    assert.equal(clock.ids().includes(stale), false);
    clock.fireLast();
    assert.equal(second.stopCalls, 1);
    assert.deepEqual(commands, ["pause"]);
  });

  it("pauses playback synchronously before recognition.start", () => {
    const rec = new IosRecognition();
    const order: string[] = [];
    rec.start = () => {
      order.push("start");
      rec.started += 1;
      rec.onstart?.();
    };
    const { session } = sessionAround(rec);
    const prepared = createVoiceSession({
      createRecognition: () => rec,
      onCommand: () => {},
      beforeStart: () => order.push("pause"),
      clock: createClock().clock,
    });
    prepared.start();
    assert.deepEqual(order, ["pause", "start"]);
    session.dispose();
    prepared.dispose();
  });

  it("onCommand can cancel without starting another recognition", () => {
    const rec = new IosRecognition();
    const commands: string[] = [];
    const clock = createClock();
    const session = createVoiceSession({
      createRecognition: () => rec,
      clock: clock.clock,
      onCommand: (transcript) => {
        commands.push(transcript);
        session.cancel();
      },
    });
    session.start();
    session.stop();
    assert.deepEqual(commands, ["play this surah"]);
    assert.equal(rec.started, 1);
    assert.equal(rec.abortCalls, 0);
  });
});

describe("playback release", () => {
  it("pauses media that would hold the iOS audio session", () => {
    let pauses = 0;
    releasePlayback({ pause: () => { pauses += 1; } });
    releasePlayback(null);
    releasePlayback(undefined);
    assert.equal(pauses, 1);
    releasePlayback({
      pause() {
        throw new Error("already stopped");
      },
    });
    assert.equal(pauses, 1);
  });

  it("lets play and pause commands take the audio element", () => {
    assert.equal(voiceHandsOffPlayback("pause"), true);
    assert.equal(voiceHandsOffPlayback("resume"), true);
    assert.equal(voiceHandsOffPlayback("play-surah"), true);
    assert.equal(voiceHandsOffPlayback("play-ayah"), true);
    assert.equal(voiceHandsOffPlayback("bookmark"), false);
    assert.equal(voiceHandsOffPlayback("none"), false);
  });
});

describe("microphone permissions policy", () => {
  it("allows the microphone on this origin and keeps the other locks", async () => {
    const headers = nextConfig.headers;
    assert.ok(headers);
    const rules = await headers();
    const site = rules.find((rule) => rule.source === "/:path*");
    const policy = site?.headers.find((header) => header.key === "Permissions-Policy")?.value ?? "";
    const features = Object.fromEntries(
      policy.split(",").map((part) => {
        const [name, value] = part.trim().split("=");
        return [name, value];
      }),
    );
    assert.equal(features.microphone, "(self)");
    assert.equal(features.camera, "()");
    assert.equal(features.geolocation, "()");
    assert.equal(features.payment, "()");
    assert.equal(features.usb, "()");
    assert.equal(features["interest-cohort"], "()");
  });
});

describe("voice input does not grab the mic itself", () => {
  it("never calls getUserMedia or abort", () => {
    const voice = readFileSync(new URL("../src/lib/guide/voice.ts", import.meta.url), "utf8");
    const panel = readFileSync(new URL("../src/components/guide/sana-guide-panel.tsx", import.meta.url), "utf8");
    assert.doesNotMatch(voice, /getUserMedia\s*\(/);
    assert.doesNotMatch(panel, /getUserMedia\s*\(/);
    assert.doesNotMatch(voice, /\.abort\s*\(/);
    assert.doesNotMatch(panel, /\.abort\s*\(/);
  });
});
