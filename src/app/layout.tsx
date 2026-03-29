import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s | KoreaStartup",
    default: "KoreaStartup - Curated News & Insights for Founders",
  },
  description: "High-value, AI-curated 5-line summaries of the Korean startup ecosystem, funding events, and tech trends.",
  keywords: ["Korean Startup", "Venture Capital", "Founders", "KoreaTechDesk", "Toss", "K-Startup"],
  icons: {
    icon: [
      { url: "/koreastartup-favicon.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
    apple: "/icon-512.png",
    shortcut: "/koreastartup-favicon.png",
  },
  openGraph: {
    title: "KoreaStartup - Curated News & Insights for Founders",
    description: "High-value, AI-curated 5-line summaries of the Korean startup ecosystem.",
    images: [{ url: "/koreastartup-logo.png", width: 1024, height: 1024 }],
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    images: ["/koreastartup-logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="stylesheet" as="style" crossOrigin="" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
