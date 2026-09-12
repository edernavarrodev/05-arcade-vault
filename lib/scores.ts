import { createClient } from "@/lib/supabase/client";

export async function saveScore(entry: {
  game: string;
  score: number;
  name: string;
  level: number;
}): Promise<void> {
  const supabase = createClient();

  const { error: insertError } = await supabase
    .from("scores")
    .insert({ game_id: entry.game, name: entry.name, score: entry.score, level: entry.level });
  if (insertError) throw insertError;

  const { count, error: countError } = await supabase
    .from("scores")
    .select("*", { count: "exact", head: true })
    .eq("game_id", entry.game);
  if (countError) throw countError;

  const { data: bestRow, error: bestError } = await supabase
    .from("scores")
    .select("score")
    .eq("game_id", entry.game)
    .order("score", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (bestError) throw bestError;

  const dificultad = Math.min(5, Math.max(1, entry.level));

  const { error: updateError } = await supabase
    .from("games")
    .update({ plays: count ?? 0, best: bestRow?.score ?? entry.score, dificultad })
    .eq("id", entry.game);
  if (updateError) throw updateError;
}
