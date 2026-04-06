import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Chirpie — News, but it texts you back",
  description:
    "Your AI-native daily digest. News delivered in a conversational style, personalized to your tone, interests, and vibe.",
  keywords: ["news", "digest", "AI", "personalized", "conversational"],
  openGraph: {
    title: "Chirpie — News, but it texts you back",
    description: "Your AI-native daily digest. News in a personalized, chat-style format.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <ThemeProvider defaultThemeId="classic-chat">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
