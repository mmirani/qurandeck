import type { MetadataRoute } from "next";
import { robotRules } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return robotRules();
}
