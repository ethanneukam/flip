import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Shield, CheckCircle, Star } from "lucide-react";

export default function FlipIDBadge({ userId }: { userId: string }) {
  const [trust, setTrust] = useState<any>(null);

  useEffect(() => {
    const fetchTrust = async () => {
      const { data, error } = await supabase
        .from("flipid_trust")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (!error) setTrust(data);
    };
    fetchTrust();
  }, [userId]);

  if (!trust) return null;

  const { trust_points, verified_email, verified_phone } = trust;

  let badge, color, label;

  if (trust_points >= 100) {
    badge = <Shield className="text-yellow-500" size={16} />;
    label = "Top Rated Seller";
    color = "text-yellow-600";
  } else if (trust_points >= 50) {
    badge = <Star className="text-blue-500" size={16} />;
    label = "Trusted User";
    color = "text-blue-600";
  } else if (verified_email || verified_phone) {
    badge = <CheckCircle className="text-green-500" size={16} />;
    label = "Verified";
    color = "text-green-600";
  }

  return (
    <span className={`flex items-center gap-1 text-xs ${color}`}>
      {badge}
      {label && <span>{label}</span>}
    </span>
  );
}