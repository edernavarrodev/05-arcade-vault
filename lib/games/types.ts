import type { ComponentType, ReactNode, Ref } from "react";

export interface GameComponentHandle {
  pause(): void;
  resume(): void;
  restart(): void;
}

export interface GameComponentProps<TState> {
  onStateChange: (state: TState) => void;
}

export interface GameRegistryEntry<TState = unknown> {
  Component: ComponentType<GameComponentProps<TState> & { ref?: Ref<GameComponentHandle> }>;
  hasLives: boolean;
  getScore: (state: TState) => number;
  getLevel: (state: TState) => number;
  getLives?: (state: TState) => number;
  isOver: (state: TState) => boolean;
  isWin?: (state: TState) => boolean;
  renderExtraHud?: (state: TState) => ReactNode;
}
