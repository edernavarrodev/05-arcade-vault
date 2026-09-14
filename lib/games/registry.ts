import type { GameRegistryEntry } from "@/lib/games/types";
import AsteroidsGame, { AsteroidsPowerupsHud } from "@/components/games/AsteroidsGame";
import type { AsteroidsState } from "@/lib/games/asteroids/engine";
import TetrisGame from "@/components/games/TetrisGame";
import type { TetrisState } from "@/lib/games/tetris/engine";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- el registry borra el TState concreto de cada juego a propósito
const registry: Record<string, GameRegistryEntry<any>> = {
  asteroids: {
    Component: AsteroidsGame,
    hasLives: true,
    getScore: (s: AsteroidsState) => s.score,
    getLevel: (s: AsteroidsState) => s.level,
    getLives: (s: AsteroidsState) => s.lives,
    isOver: (s: AsteroidsState) => s.phase === "gameover",
    renderExtraHud: (s: AsteroidsState) => AsteroidsPowerupsHud({ state: s }),
  },
  tetris: {
    Component: TetrisGame,
    hasLives: true,
    getScore: (s: TetrisState) => s.score,
    getLevel: (s: TetrisState) => s.level,
    getLives: (s: TetrisState) => s.lives,
    isOver: (s: TetrisState) => s.phase === "gameover",
  },
};

export function getGameRegistryEntry(id: string) {
  return registry[id];
}
