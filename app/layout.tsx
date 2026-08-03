import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { isSttConfigured } from "@/lib/tts";
import { DictationProvider } from "@/components/ui/DictationContext";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["SOFT", "opsz"],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Stardrop",
  description: "Game Design class hub",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${jakarta.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased text-wood-900 bg-cream-100">
        {/* Set the theme before first paint so there's no light-mode flash.
            Reads the saved per-device choice, else follows the OS setting. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('theme');var t=(s==='light'||s==='dark')?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
          }}
        />
        <DictationProvider enabled={isSttConfigured()}>
          <div className="min-h-screen bg-paper bg-repeat">{children}</div>
        </DictationProvider>
      </body>
    </html>
  );
}