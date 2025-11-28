import "../styles/globals.css";
import type { AppProps } from "next/app";
import Header from "../components/Header";
import AuthWrapper from "../components/AuthWrapper";

import { useEffect } from "react";
import { initPostHog } from "../lib/posthogClient";
import posthog from "posthog-js";
import { useRouter } from "next/router";

export default function MyApp({ Component, pageProps }: AppProps) {

  useEffect(() => {
    const ph = initPostHog();
const router = useRouter();
useEffect(() => {
  const handleRoute = () => posthog.capture("$pageview");
  router.events.on("routeChangeComplete", handleRoute);
  return () => router.events.off("routeChangeComplete", handleRoute);
}, []);

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
