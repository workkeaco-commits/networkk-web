"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/browser";
import JobPostPage from "@/components/JobPostPage";

export default function ManualPostJobRoute() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace(`/client/sign-in?next=/post-job/manual`);
        return;
      }

      if (mounted) setReady(true);
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (!ready) return null;

  return <JobPostPage />;
}
