import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";

export default function AuthWrapper({ children }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const setupAuth = async () => {
      // Get current session
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        setLoading(false);
        router.push("/auth");
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Ensure wallet exists
      if (user) {
        await supabase
          .from("flip_wallets")
          .upsert({ user_id: user.id }, { onConflict: "user_id" });
      }

      setLoading(false);
    };

    setupAuth();

    // Listen for login/logout
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.push("/auth");
    });

    return () => listener.subscription.unsubscribe();
  }, [router]);

  if (loading) return <p>Loading...</p>;

  return <>{children}</>;
}