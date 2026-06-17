import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Radar de Leads",
  description:
    "Detecta noticias chilenas con potencial para videos cortos (Facebook, Shorts, TikTok, Reels).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <div className="min-h-screen">
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
              <Link href="/" className="flex items-center gap-2">
                <span className="text-xl">📡</span>
                <span className="text-lg font-semibold">Radar de Leads</span>
              </Link>
              <nav className="flex items-center gap-4 text-sm">
                <Link
                  href="/"
                  className="text-slate-600 hover:text-slate-900"
                >
                  Dashboard
                </Link>
                <Link
                  href="/sources"
                  className="text-slate-600 hover:text-slate-900"
                >
                  Fuentes RSS
                </Link>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
