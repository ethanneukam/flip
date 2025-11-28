import { phServer } from "./posthogServer";
import posthog from "posthog-js";

export function track(event: string, props?: any) {
  if (typeof window !== "undefined") {
    return posthog.capture(event, props);
  } else {
    return phServer.capture({
      distinctId: props?.userId || "server",
      event,
      properties: props || {},
    });
  }
}
