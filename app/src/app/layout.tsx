import type { Metadata } from "next";
import { Rajdhani, Orbitron, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { BackgroundProvider } from "@/context/BackgroundContext";
import AppShell from "@/components/AppShell";

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SC-Nexus — Org Logistics & Ops Portal",
  description: "Star Citizen Organization management portal for shared inventory, assets, and Conquest Zone operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${rajdhani.variable} ${orbitron.variable} ${geistMono.variable} antialiased scan-line-bg`}
      >
        <ThemeProvider>
          <AuthProvider>
            <BackgroundProvider>
              <AppShell>{children}</AppShell>
            </BackgroundProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
