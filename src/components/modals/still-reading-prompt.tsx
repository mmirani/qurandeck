"use client";

import { useMushaf } from "@/components/providers/mushaf-provider";
import { Modal } from "@/components/ui/modal";
import { versePlaceLabel } from "@/lib/reading";

export function StillReadingPrompt() {
  const {
    stillReadingAsk,
    confirmStillReading,
    declineStillReading,
    elsewherePlace,
    goToElsewherePlace,
    dismissElsewherePlace,
    chapters,
  } = useMushaf();
  const elsewhere = elsewherePlace ? versePlaceLabel(chapters, elsewherePlace) : null;
  if (!stillReadingAsk && !elsewhere) return null;
  // Without the idle check, this is only the "you read further elsewhere" offer.
  const stay = elsewhere ? dismissElsewherePlace : confirmStillReading;

  return (
    <Modal title={elsewhere ? "Pick up where you left off?" : "Are you still reading?"} onClose={stillReadingAsk ? declineStillReading : dismissElsewherePlace}>
      {elsewhere ? (
        <p className="text-sm leading-6 text-ink-soft">
          You read up to {elsewhere.title} {elsewhere.ayah} on another device. Continue there, or stay on this page.
        </p>
      ) : (
        <p className="text-sm leading-6 text-ink-soft">
          You have been on the same place for about 15 minutes. If you are no longer reading, we stop counting
          minutes and remove that idle time from your total.
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        {elsewhere ? (
          <button
            type="button"
            onClick={goToElsewherePlace}
            className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-gold px-5 text-sm font-semibold text-on-gold"
          >
            Continue at {elsewhere.ayah}
          </button>
        ) : null}
        <button
          type="button"
          onClick={stay}
          className={
            elsewhere
              ? "inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-line px-5 text-sm font-medium text-ink-soft"
              : "inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-gold px-5 text-sm font-semibold text-on-gold"
          }
        >
          {elsewhere ? "Stay here" : "Still reading"}
        </button>
        {stillReadingAsk ? (
          <button
            type="button"
            onClick={declineStillReading}
            className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-line px-5 text-sm font-medium text-ink-soft"
          >
            Stop for now
          </button>
        ) : null}
      </div>
    </Modal>
  );
}
