import "../styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect } from "react";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { createBrowserSupabaseClient } from "@supabase/auth-helpers-nextjs";
import posthog from "posthog-js";

import Header from "../components/Header";
import AuthWrapper from "../components/AuthWrapper";
import { Toaster } from "../components/ui/sonner"; // if you use a toast lib

export default function MyApp({ Component, pageProps }: AppProps) {
  const [supabaseClient] = useState(() => createBrowserSupabaseClient());

  // ---- PostHog Initialization ----
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      capture_pageview: true,
    });
  }, []);

  return (
    <SessionContextProvider
      supabaseClient={supabaseClient}
      initialSession={pageProps.initialSession}
    >
      <AuthWrapper>
        <Header />
        <Component {...pageProps} />
        <Toaster />
      </AuthWrapper>
    </SessionContextProvider>
  );
}
