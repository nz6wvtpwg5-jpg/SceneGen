import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/layout/app-shell";
import { SessionProviderWrapper } from "@/components/providers/session-provider-wrapper";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from 'sonner';
import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog-provider";
import { OfflineProvider } from "@/components/providers/offline-provider";
import { NativeRuntime } from "@/components/providers/native-runtime";
import { ApiAvailabilityProvider } from "@/components/providers/api-availability-provider";

const geistSans = localFont({
  src: "./assets/fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
  preload: true,
});
const geistMono = localFont({
  src: "./assets/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL("https://scenegen-web.onrender.com"),
  title: { default: "SceneGen - Live operations for the whole show", template: "%s - SceneGen" },
  description: "Plan tours, advance shows, share day sheets and close the numbers in one live-operations workspace for artists, agents and promoters.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "SceneGen",
    title: "SceneGen - Live operations for the whole show",
    description: "Plan tours, advance shows, share day sheets and close the numbers in one live-operations workspace.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "SceneGen - The whole show. One working record." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SceneGen - Live operations for the whole show",
    description: "The whole show. One working record.",
    images: ["/opengraph-image"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#11100e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-bg-primary text-foreground`} suppressHydrationWarning>
        <SessionProviderWrapper>
          <ThemeProvider>
            <ConfirmDialogProvider>
              <NativeRuntime />
              <ApiAvailabilityProvider><OfflineProvider><AppShell>{children}</AppShell></OfflineProvider></ApiAvailabilityProvider>
            </ConfirmDialogProvider>
            <Toaster />
            <SonnerToaster position="top-right" />
          </ThemeProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
