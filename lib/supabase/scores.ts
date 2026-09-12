import type { SupabaseClient } from "@supabase/supabase-js";

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // created_at formateado
}

export async function getTopScores(
  gameId: string,
  limit: number,
  supabase: SupabaseClient
): Promise<ScoreRow[]> {
  const { data, error } = await supabase
    .from("scores")
    .select("name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row, i) => ({
    rank: i + 1,
    name: row.name,
    score: row.score,
    date: new Date(row.created_at).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
  }));
}
