import type { Metadata } from "next";
import type { ReactNode } from "react";
import { EB_Garamond, Open_Sans } from "next/font/google";
import "@/styles/globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Intro } from "@/ui/intro";
import { Footer } from "@/ui/footer";
import { appearanceBootstrap } from "@/lib/appearance-bootstrap";

const garamond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
  display: "swap",
  preload: true,
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
  display: "swap",
  preload: true,
});

const title = "Dundee Zhang";
const description =
  "Dundee Zhang's portfolio. View my projects and other works! Love from Toronto.";
const previewImage = "/card-preview-v6.jpeg";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NODE_ENV === "production"
      ? "https://dundeezhang.com"
      : "http://localhost:3000",
  ),
  title,
  description,
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title,
    description,
    images: [
      {
        url: previewImage,
        width: 1200,
        height: 630,
        alt: "Dundee Zhang's homepage with a Garamond signature and colored ASCII art of Half Dome",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [previewImage],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={openSans.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: appearanceBootstrap }} />
      </head>
      <body className={`${garamond.variable} antialiased`}>
        <ThemeProvider>
          <a className="skip-link" href="#main-content">Skip to content</a>
          <div className="site-shell">
            <Intro />
            <main id="main-content" className="site-main" tabIndex={-1}>
              {children}
            </main>
            <Footer />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
