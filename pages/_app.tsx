import "../styles/globals.css";
import type { AppProps } from "next/app";
import Header from "../components/Header";
import AuthWrapper from "../components/AuthWrapper";

import { useEffect } from "react";
import { initPostHog } from "../lib/posthogClient";
import posthog from "posthog-js";

export default function MyApp({ Component, pageProps }: AppProps) {

  useEffect(() => {
    const ph = initPostHog();

    // Auto identify if user is in pageProps
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
