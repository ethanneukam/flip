// lib/useAuth.ts
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { useRouter } from "next/router";

export function useAuthRedirect(protectedRoute = true) {
  const [session, setSession] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (protectedRoute && !data.session) router.push("/auth");
      else setSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && protectedRoute) router.push("/auth");
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [router, protectedRoute]);

  return session;
}