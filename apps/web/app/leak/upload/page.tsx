"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function RedirectContent() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const caseId = params.get("caseId");
    const demo = params.get("demo") === "1" ? "?demo=1" : "";
    if (caseId) {
      router.replace(`/report/${caseId}`);
    } else {
      router.replace(`/leak${demo}`);
    }
  }, [router, params]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafaf8]">
      <div className="w-7 h-7 border-2 border-[#e8e4de] border-t-[#0a0a0a] rounded-full animate-spin" />
    </div>
  );
}

export default function LeakUploadRedirect() {
  return (
    <Suspense>
      <RedirectContent />
    </Suspense>
  );
}