// /lib/analytics.ts
import posthog from "posthog-js";

export const EVENTS = {
  // FEED
  FEED_VIEWED: "feed_viewed",
  FEED_SCROLLED: "feed_scrolled",
  LISTING_CLICKED: "listing_clicked",
  LISTING_LONG_PRESS: "listing_long_press",
  LISTING_SAVED: "listing_saved",

  // LISTING CREATION
  CREATE_START: "create_listing_start",
  IMAGE_ADDED: "listing_image_added",
  CATEGORY_SELECTED: "listing_category_selected",
  DESCRIPTION_TYPED: "listing_description_typed",
  LISTING_SUBMITTED: "listing_submitted",
  LISTING_PUBLISHED: "listing_published",

  // USER EVENTS
  SIGNUP: "user_signup",
  LOGIN: "user_login",
  LOGOUT: "user_logout",
  PROFILE_VIEWED: "profile_viewed",
  PROFILE_UPDATED: "profile_updated",

  // TRANSACTIONS / OFFERS / CHAT
  DM_OPENED: "dm_opened",
  MESSAGE_SENT: "message_sent",
  OFFER_SENT: "offer_sent",
  OFFER_ACCEPTED: "offer_accepted",
  OFFER_DECLINED: "offer_declined",

  // SEARCH
  SEARCH: "search_performed",
  SEARCH_CATEGORY: "search_category_changed",
  SEARCH_RESULT_CLICKED: "search_result_clicked",

  // MISC
  LISTING_SHARED: "listing_shared",
  LISTING_REPORTED: "listing_reported",
  SCREENSHOT: "screenshot_taken",
};

let initialized = false;

export function initAnalytics() {
  if (initialized) return;

  if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: "https://app.posthog.com",
      capture_pageview: true,
      persistence: "localStorage",
      loaded: (ph) => {
        console.log("Analytics ready");
      },
    });
  } else {
    console.warn("⚠️ Analytics disabled — no PostHog key.");
  }

  initialized = true;
}

export function track(event: string, props: Record<string, any> = {}) {
  if (!initialized) return console.warn("Analytics not initialized");

  try {
    posthog.capture(event, props);
  } catch (e) {
    console.warn("Analytics error:", e);
  }
}
