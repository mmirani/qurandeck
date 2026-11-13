import type { Metadata, Viewport } from "next";
import { Noto_Naskh_Arabic, Noto_Nastaliq_Urdu, Noto_Sans_Hebrew, Noto_Sans_Thaana, Plus_Jakarta_Sans, Source_Serif_4 } from "next/font/google";
import { PrivacyAnalytics } from "@/components/analytics/privacy-analytics";
import { AppProviders } from "@/components/providers/app-providers";
import { PRODUCT_NAME, SITE_DESCRIPTION, SITE_TITLE, siteUrl } from "@/lib/brand";
import { googleSiteVerification, isPreviewDeployment } from "@/lib/seo";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: false,
});

const naskh = Noto_Naskh_Arabic({
  variable: "--font-naskh",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  preload: false,
  display: "swap",
});

const nastaliq = Noto_Nastaliq_Urdu({
  variable: "--font-nastaliq",
  subsets: ["arabic"],
  weight: "400",
  preload: false,
  display: "swap",
});

const hebrew = Noto_Sans_Hebrew({
  variable: "--font-hebrew",
  subsets: ["hebrew"],
  weight: "400",
  preload: false,
  display: "swap",
});

const thaana = Noto_Sans_Thaana({
  variable: "--font-thaana",
  subsets: ["thaana"],
  weight: "400",
  preload: false,
  display: "swap",
});

const googleVerification = googleSiteVerification();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: SITE_TITLE, template: `%s · ${PRODUCT_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: PRODUCT_NAME,
  robots: isPreviewDeployment()
    ? { index: false, follow: false, nocache: true }
    : { index: true, follow: true },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: PRODUCT_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml", sizes: "any" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  ...(googleVerification ? { verification: { google: googleVerification } } : {}),
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  colorScheme: "light",
};

const themeScript = `try{var p=JSON.parse(localStorage.getItem('al-mushaf-preferences')||'{}');var t=p.theme||'iris';document.documentElement.dataset.theme=t;var size=Number(p.fontSize);if(size>=14&&size<=36)document.documentElement.style.setProperty('--reading-size',size+'px');}catch(e){document.documentElement.dataset.theme='iris'}document.documentElement.dataset.scroll=/^\\/(read$|surah\\/|juz\\/)/.test(location.pathname)?'lock':'page';`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="iris"
      className={`${jakarta.variable} ${sourceSerif.variable} ${naskh.variable} ${nastaliq.variable} ${hebrew.variable} ${thaana.variable} min-h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full bg-canvas text-ink">
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <AppProviders>{children}</AppProviders>
        <PrivacyAnalytics />
      </body>
    </html>
  );
}
