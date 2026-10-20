import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./apple.css";
import { ToastProvider } from "./components/Toast";
import ServiceWorkerRegister from "./components/ServiceWorkerRegister";
import AppShell from "./components/AppShell";
import ScrollToTop from "./components/ScrollToTop";
import InactivityLogout from "./components/InactivityLogout";
import OnboardingTour from "./components/OnboardingTour";
import OfflineIndicator from "./components/OfflineIndicator";
import InstallBanner from "./components/InstallBanner";

export const metadata: Metadata = {
  title: "3E - Plataforma de Premios QR",
  description: "Genera y gestiona premios con códigos QR para 3E",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/icon-192.png",
    shortcut: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "3E",
  },
  openGraph: {
    siteName: "3E",
    type: "website",
    title: "3E",
    description: "Plataforma de premios QR de 3E",
  },
  twitter: {
    card: "summary",
    title: "3E",
    description: "Plataforma de premios QR de 3E",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F2F2F7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className="h-full antialiased"
    >
      <body className="min-h-full" style={{ overflowX: 'hidden', maxWidth: '100vw' }}>
        <ToastProvider>
          <OfflineIndicator />
          <ScrollToTop />
          <ServiceWorkerRegister />
          <InactivityLogout />
          <OnboardingTour />
          <InstallBanner />
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
