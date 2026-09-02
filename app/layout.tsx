import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AisuVault — Your knowledge, organized",
  description: "A private home for notes, documents, and files.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
