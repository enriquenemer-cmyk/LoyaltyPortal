import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "./components/Toast";
import ServiceWorkerRegister from "./components/ServiceWorkerRegister";
import AppShell from "./components/AppShell";
import ScrollToTop from "./components/ScrollToTop";
import InactivityLogout from "./components/InactivityLogout";
import OnboardingTour from "./components/OnboardingTour";
import OfflineIndicator from "./components/OfflineIndicator";
import InstallBanner from "./components/InstallBanner";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
    statusBarStyle: "default",
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
  themeColor: "#F97316",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${plusJakarta.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#FAFAF9]" style={{ overflowX: 'hidden', maxWidth: '100vw' }}>
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
