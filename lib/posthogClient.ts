import posthog from "posthog-js";

export function initPostHog() {
  if (typeof window !== "undefined" && !posthog.__loaded) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: "https://app.posthog.com",
      autocapture: true,
      capture_pageview: true,
    });
  }
  return posthog;
}
