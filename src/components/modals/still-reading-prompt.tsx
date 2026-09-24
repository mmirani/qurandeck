"use client";

import { useMushaf } from "@/components/providers/mushaf-provider";
import { Modal } from "@/components/ui/modal";

export function StillReadingPrompt() {
  const { stillReadingAsk, confirmStillReading, declineStillReading } = useMushaf();
  if (!stillReadingAsk) return null;

  return (
    <Modal title="Are you still reading?" onClose={declineStillReading}>
      <p className="text-sm leading-6 text-ink-soft">
        You have been on the same place for about 15 minutes. If you are no longer reading, we stop counting
        minutes and remove that idle time from your total.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={confirmStillReading}
          className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-gold px-5 text-sm font-semibold text-on-gold"
        >
          Still reading
        </button>
        <button
          type="button"
          onClick={declineStillReading}
          className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-line px-5 text-sm font-medium text-ink-soft"
        >
          Stop for now
        </button>
      </div>
    </Modal>
  );
}
