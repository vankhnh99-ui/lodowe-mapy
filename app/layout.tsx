import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lodowe Mapy",
  description: "Sprawdź grubość lodu i łów bezpiecznie.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
