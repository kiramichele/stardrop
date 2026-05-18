import type { Metadata } from "next";
import { Lora, Inter_Tight } from "next/font/google";
import "./globals.css";

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
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
    <html lang="en" className={`${lora.variable} ${interTight.variable}`}>
      <body className="font-sans antialiased text-wood-900 bg-cream-100">
        {children}
      </body>
    </html>
  );
}