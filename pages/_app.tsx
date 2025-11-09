import "../styles/globals.css";
import type { AppProps } from "next/app";
import Header from "../components/Header";
import AuthWrapper from "../components/AuthWrapper";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthWrapper>
      <Header /> {/* Show header + notification bell on every page */}
      <Component {...pageProps} />
    </AuthWrapper>
  );
}