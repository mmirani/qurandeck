import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/brand";

const PATHS = ["/", "/read", "/about", "/contact", "/privacy", "/terms"];

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteUrl();
  const pages = PATHS.map((path) => ({
    url: path === "/" ? origin : `${origin}${path}`,
  }));
  const surahs = Array.from({ length: 114 }, (_, index) => ({
    url: `${origin}/surah/${index + 1}`,
  }));
  return [...pages, ...surahs];
}
