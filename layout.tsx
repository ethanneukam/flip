import "./globals.css";
import { Inter } from "next/font/google";
import InstallPrompt from "@/components/InstallPrompt";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "FLIP Market Oracle",
  description: "Real-time market valuation",
  manifest: "/manifest.json",
  themeColor: "#000000",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FLIP",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Extra insurance for mobile sizing */}
        <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no, viewport-fit=cover" />
      </head>
      <body className={`${inter.className} bg-black overscroll-none`}>
        {children}
        
        {/* The Mobile Install Hint */}
        <InstallPrompt />
      </body>
    </html>
  );
}
