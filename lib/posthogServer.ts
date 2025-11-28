import { PostHog } from "posthog-node";

export const phServer = new PostHog(process.env.POSTHOG_KEY!, {
  host: "https://app.posthog.com",
});
