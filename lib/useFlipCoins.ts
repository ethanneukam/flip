import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export function useFlipCoins(userId: string | undefined) {
  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    if (!userId) return;
    const fetchBalance = async () => {
      const { data } = await supabase
        .from("flip_coins")
        .select("balance")
        .eq("user_id", userId)
        .single();
      if (data?.balance) setBalance(Number(data.balance));
    };
    fetchBalance();
  }, [userId]);

  return balance;
}
