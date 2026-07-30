import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import "leaflet/dist/leaflet.css";

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocol = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  return {
    title: "VECTOR — Live GPS Tracking",
    description: "Professional fictional GPS tracking simulator for screen production.",
    applicationName: "VECTOR",
    manifest: "/manifest.webmanifest",
    icons: { icon: "/favicon.svg", apple: "/icon-192.png" },
    appleWebApp: { capable: true, title: "VECTOR", statusBarStyle: "black-translucent" },
    openGraph: { title: "VECTOR — Live GPS Tracking", description: "Professional fictional GPS tracking simulator for screen production.", images: [{ url: `${origin}/og.png`, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: "VECTOR — Live GPS Tracking", description: "Professional fictional GPS tracking simulator for screen production.", images: [`${origin}/og.png`] },
  };
}
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0b1118" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){addEventListener('load',()=>navigator.serviceWorker.register('/sw.js'))}` }} /></body></html>;
}
