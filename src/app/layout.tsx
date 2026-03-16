import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s | KoreaStartup",
    default: "KoreaStartup - Curated News & Insights for Founders",
  },
  description: "High-value, AI-curated 5-line summaries of the Korean startup ecosystem, funding events, and tech trends.",
  keywords: ["Korean Startup", "Venture Capital", "Founders", "KoreaTechDesk", "Toss", "K-Startup"],
  openGraph: {
    title: "KoreaStartup - Curated News & Insights for Founders",
    description: "High-value, AI-curated 5-line summaries of the Korean startup ecosystem.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
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
