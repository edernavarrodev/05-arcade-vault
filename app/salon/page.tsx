import SalonClient from "@/components/SalonClient";
import { getGames } from "@/lib/supabase/queries";

export default async function HallOfFamePage() {
  const games = await getGames();
  return <SalonClient games={games} />;
}
