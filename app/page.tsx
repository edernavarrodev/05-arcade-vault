import HomeClient from "@/components/HomeClient";
import { getGames, getRecentScores, getGlobalTopScores } from "@/lib/supabase/queries";

export default async function Home() {
  const [games, latestScores, topPlayers] = await Promise.all([
    getGames(),
    getRecentScores(7),
    getGlobalTopScores(5),
  ]);

  return <HomeClient games={games} latestScores={latestScores} topPlayers={topPlayers} />;
}
