import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "./components/Toast";
import RealtimeNotifications from "./components/RealtimeNotifications";
import ServiceWorkerRegister from "./components/ServiceWorkerRegister";
import AppShell from "./components/AppShell";
import ScrollToTop from "./components/ScrollToTop";
import InactivityLogout from "./components/InactivityLogout";
import OnboardingTour from "./components/OnboardingTour";
import OfflineIndicator from "./components/OfflineIndicator";

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
  title: "Super Tierra - Plataforma de Premios QR",
  description: "Genera y gestiona premios con códigos QR para Burrito Bar",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Super Tierra",
  },
  openGraph: {
    siteName: "Burrito Bar · Super Tierra",
    type: "website",
    title: "Super Tierra",
    description: "Plataforma de premios QR de Burrito Bar",
  },
  twitter: {
    card: "summary",
    title: "Super Tierra",
    description: "Plataforma de premios QR de Burrito Bar",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563EB",
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
      <body className="min-h-full bg-[#FAFAF9]">
        <ToastProvider>
          <OfflineIndicator />
          <ScrollToTop />
          <ServiceWorkerRegister />
          <RealtimeNotifications />
          <InactivityLogout />
          <OnboardingTour />
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
