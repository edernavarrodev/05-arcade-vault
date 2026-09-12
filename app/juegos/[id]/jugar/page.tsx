import { notFound } from "next/navigation";
import { getGame } from "@/lib/supabase/queries";
import GamePlayer from "@/components/games/GamePlayer";

export default async function GamePlayerPage({ params }: PageProps<"/juegos/[id]/jugar">) {
  const { id } = await params;
  const game = await getGame(id);
  if (!game) notFound();

  return <GamePlayer game={game} />;
}
