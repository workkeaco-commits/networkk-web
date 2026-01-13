"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/browser";
import AIJobPostAssistant from "@/components/AIJobPostAssistant";

export default function PostJobRoute() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace(`/client/sign-in?next=/post-job`);
        return;
      }

      if (mounted) setReady(true);
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (!ready) return null;

  return <AIJobPostAssistant />;
}
