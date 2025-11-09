import { supabase } from "./supabaseClient";

export const updateTrustScore = async (userId: string, action: string) => {
  let points = 0;

  switch (action) {
    case "verified_email":
      points = 10;
      break;
    case "verified_phone":
      points = 15;
      break;
    case "completed_sale":
      points = 20;
      break;
    case "completed_purchase":
      points = 15;
      break;
    default:
      return;
  }

  const { data, error } = await supabase
    .from("flipid_trust")
    .update({ trust_points: supabase.rpc("increment", { x: points }) })
    .eq("user_id", userId);

  if (error) console.error("Error updating trust:", error);
};