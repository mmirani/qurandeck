"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { redactAnalyticsUrl, redactSpeedInsight } from "@/lib/analytics-privacy";

function beforeAnalyticsSend(event: BeforeSendEvent) {
  return redactAnalyticsUrl(event);
}

function beforeSpeedSend(event: { type: "vital"; url: string; route?: string }) {
  return redactSpeedInsight(event);
}

export function PrivacyAnalytics() {
  return (
    <>
      <Analytics beforeSend={beforeAnalyticsSend} />
      <SpeedInsights beforeSend={beforeSpeedSend} />
    </>
  );
}
