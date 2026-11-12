import { Suspense } from "react";
import { AuthFromQuery } from "@/components/home/auth-from-query";
import { HomePage } from "@/components/home/home-page";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE_DESCRIPTION, SITE_TITLE } from "@/lib/brand";
import { homeStructuredData, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  path: "/",
  absolute: true,
});

export default function Page() {
  return (
    <>
      <JsonLd data={homeStructuredData()} />
      <HomePage />
      <Suspense fallback={null}>
        <AuthFromQuery />
      </Suspense>
    </>
  );
}
