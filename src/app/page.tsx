import { Suspense } from "react";
import { HomePage } from "@/components/home/home-page";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <HomePage />
    </Suspense>
  );
}
