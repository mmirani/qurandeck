import { Suspense } from "react";
import { AuthFromQuery } from "@/components/home/auth-from-query";
import { HomePage } from "@/components/home/home-page";

export default function Page() {
  return (
    <>
      <HomePage />
      <Suspense fallback={null}>
        <AuthFromQuery />
      </Suspense>
    </>
  );
}
