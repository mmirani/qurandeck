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

const themeScript = `try{var p=JSON.parse(localStorage.getItem('al-mushaf-preferences')||'{}');if(p.theme)document.documentElement.dataset.theme=p.theme;}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="manuscript"
      className={`${jakarta.variable} ${sourceSerif.variable} ${naskh.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="h-full overflow-hidden">
        <a className="skip-link" href="#main-reader">
          Skip to reading
        </a>
        <MushafProvider>{children}</MushafProvider>
      </body>
    </html>
  );
}
