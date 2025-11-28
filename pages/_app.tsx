import "../styles/globals.css";
import type { AppProps } from "next/app";
import Header from "../components/Header";
import AuthWrapper from "../components/AuthWrapper";

import { useEffect } from "react";
import { useRouter } from "next/router";
import posthog from "posthog-js";

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  // --- Initialize PostHog once ---
  useEffect(() => {
    if (typeof window === "undefined") return;

    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY || "", {
      api_host: "https://app.posthog.com",
      capture_pageview: false, // we manually track below
      persistence: "localStorage",
      session_recording: {
        maskAllInputs: false,
      },
    });

    // Feature flags
    posthog.onFeatureFlags(() => {
      const showNewUI = posthog.isFeatureEnabled("flip-new-ui");
      if (showNewUI) {
        document.body.classList.add("new-ui");
      } else {
        document.body.classList.remove("new-ui");
      }
    });

    // Pageview tracking
    const handleRoute = () => posthog.capture("$pageview");
    router.events.on("routeChangeComplete", handleRoute);

    return () => {
      router.events.off("routeChangeComplete", handleRoute);
    };
  }, []);

  // --- Identify user if passed in pageProps ---
  useEffect(() => {
    if (pageProps?.user) {
      posthog.identify(pageProps.user.id, {
        email: pageProps.user.email,
        username: pageProps.user.username,
      });
    }
  }, [pageProps?.user]);

  return (
    <AuthWrapper>
      <Header />
      <Component {...pageProps} />
    </AuthWrapper>
  );
}
