import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "./components/toast-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const space_grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "H2GO - Green Hydrogen Blockchain Solution",
  description:
    "Trust, Transparency, and Traceability for green hydrogen guarantees of origin.",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="dark"
    >
      <body
        className={`${inter.variable} ${space_grotesk.variable} antialiased bg-linear-to-br from-accent/25 via-accent/5 to-accent-foreground`}
      >
        <ToastProvider />
        {children}
      </body>
    </html>
  );
}
