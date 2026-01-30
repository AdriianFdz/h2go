import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { NavLogo } from "./components/nav-logo";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const space_grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

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
        className={`${inter.variable} ${space_grotesk.variable} antialiased`}
      >
        <header>
          <NavLogo />
        </header>
        {children}
      </body>
    </html>
  );
}
