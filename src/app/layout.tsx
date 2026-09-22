import type { Metadata } from "next";
import { Noto_Naskh_Arabic, Plus_Jakarta_Sans, Source_Serif_4 } from "next/font/google";
import { MushafProvider } from "@/components/providers/mushaf-provider";
import { SITE_DESCRIPTION, SITE_TITLE } from "@/lib/brand";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "600"],
});

const naskh = Noto_Naskh_Arabic({
  variable: "--font-naskh",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
};

const themeScript = `try{var p=JSON.parse(localStorage.getItem('al-mushaf-preferences')||'{}');var home=location.pathname==='/';var t=home?'iris':(p.theme||'iris');document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='iris'}document.documentElement.dataset.scroll=/^\\/(read$|surah\\/|juz\\/)/.test(location.pathname)?'lock':'page';`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="iris"
      className={`${jakarta.variable} ${sourceSerif.variable} ${naskh.variable} min-h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full bg-canvas text-ink">
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <MushafProvider>{children}</MushafProvider>
      </body>
    </html>
  );
}
