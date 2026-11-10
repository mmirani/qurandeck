import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/brand";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteUrl();
  const now = new Date();
  const pages = ["", "/read", "/about", "/contact", "/privacy", "/terms"].map((path) => ({
    url: `${origin}${path || "/"}`,
    lastModified: now,
  }));
  const surahs = Array.from({ length: 114 }, (_, index) => ({
    url: `${origin}/surah/${index + 1}`,
    lastModified: now,
  }));
  return [...pages, ...surahs];
}
