import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react"; // <--- 1. Importujemy licznik

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LODOWE MAPY ❄️",
  description: "Sprawdź grubość lodu i łów bezpiecznie.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body className={inter.className}>
        {children}
        <Analytics /> {/* <--- 2. Tu wstawiamy licznik */}
      </body>
    </html>
  );
}