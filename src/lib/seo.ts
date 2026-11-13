import type { Metadata, MetadataRoute } from "next";
import { PRODUCT_NAME, SITE_DESCRIPTION, siteUrl } from "@/lib/brand";

export function isPreviewDeployment(env = process.env.VERCEL_ENV) {
  return env === "preview";
}

export function googleSiteVerification(env = process.env.GOOGLE_SITE_VERIFICATION) {
  const value = env?.trim();
  return value ? value : undefined;
}

export function robotRules(env = process.env.VERCEL_ENV): MetadataRoute.Robots {
  if (isPreviewDeployment(env)) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/auth/", "/admin", "/beta"],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}

export function pageMeta({
  title,
  description,
  path,
  absolute = false,
  index = true,
}: {
  title: string;
  description: string;
  path: string;
  /** Homepage title already includes the brand, so the template must not append it again. */
  absolute?: boolean;
  /** Juz pages are noindex. Leave true to inherit preview noindex from the root layout. */
  index?: boolean;
}): Metadata {
  const socialTitle = absolute ? title : `${title} · ${PRODUCT_NAME}`;
  return {
    title: absolute ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: socialTitle,
      description,
      url: path,
      type: "website",
      siteName: PRODUCT_NAME,
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
    },
    ...(index ? {} : { robots: { index: false, follow: true } }),
  };
}

export function homeStructuredData(description = SITE_DESCRIPTION) {
  const origin = siteUrl();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        name: PRODUCT_NAME,
        url: origin,
        description,
        inLanguage: "en",
        publisher: { "@id": `${origin}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        name: PRODUCT_NAME,
        url: origin,
        logo: {
          "@type": "ImageObject",
          url: `${origin}/icons/icon-512.png`,
          width: 512,
          height: 512,
        },
      },
      {
        "@type": "WebApplication",
        "@id": `${origin}/#app`,
        name: PRODUCT_NAME,
        url: origin,
        description,
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
        inLanguage: ["en", "ar"],
        isAccessibleForFree: true,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        publisher: { "@id": `${origin}/#organization` },
      },
    ],
  };
}

export function surahBreadcrumb(surah: { id: number; name: string }) {
  const origin = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: origin },
      { "@type": "ListItem", position: 2, name: "Read", item: `${origin}/read` },
      { "@type": "ListItem", position: 3, name: surah.name, item: `${origin}/surah/${surah.id}` },
    ],
  };
}
