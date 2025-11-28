import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  beforeSend(event) {
  try {
    const phEvent = {
      distinctId: "server",
      event: "sentry_error",
      properties: {
        message: event?.exception?.values?.[0]?.value,
        type: event?.exception?.values?.[0]?.type,
      },
    };
    import("posthog-node").then(({ PostHog }) => {
      const ph = new PostHog(process.env.POSTHOG_KEY!, { host: "https://app.posthog.com" });
      ph.capture(phEvent);
      ph.shutdownAsync();
    });
  } catch {}
  return event;
}

});
