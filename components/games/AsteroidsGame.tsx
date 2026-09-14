"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import {
  createAsteroidsEngine,
  type AsteroidsEngine,
  type AsteroidsState,
} from "@/lib/games/asteroids/engine";
import type { GameComponentHandle, GameComponentProps } from "@/lib/games/types";

export function AsteroidsPowerupsHud({ state }: { state: AsteroidsState }) {
  return (
    <div className="hud-powerups">
      {state.powerups.triple > 0 && (
        <span className="hud-powerup triple">TRIPLE {state.powerups.triple.toFixed(1)}s</span>
      )}
      {state.powerups.shield > 0 && (
        <span className="hud-powerup shield">ESCUDO {state.powerups.shield.toFixed(1)}s</span>
      )}
      {state.powerups.slow > 0 && (
        <span className="hud-powerup slow">SLOW {state.powerups.slow.toFixed(1)}s</span>
      )}
      {state.powerups.novaCharges > 0 && (
        <span className="hud-powerup nova">NOVA x{state.powerups.novaCharges}</span>
      )}
    </div>
  );
}

const AsteroidsGame = forwardRef<GameComponentHandle, GameComponentProps<AsteroidsState>>(
  function AsteroidsGame({ onStateChange }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<AsteroidsEngine | null>(null);
    const onStateChangeRef = useRef(onStateChange);
    onStateChangeRef.current = onStateChange;

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const engine = createAsteroidsEngine(canvas, (state) => onStateChangeRef.current(state));
      engineRef.current = engine;
      engine.start();
      return () => {
        engine.stop();
        engineRef.current = null;
      };
    }, []);

    useImperativeHandle(ref, () => ({
      pause() {
        engineRef.current?.setPaused(true);
      },
      resume() {
        engineRef.current?.setPaused(false);
      },
      restart() {
        engineRef.current?.restart();
      },
    }));

    return (
      <div className="asteroids-game">
        <canvas ref={canvasRef} className="asteroids-canvas" />
        <div className="asteroids-touch-controls">
          <div className="asteroids-touch-group">
            <button
              type="button"
              aria-label="Rotar izquierda"
              className="asteroids-touch-btn"
              onPointerDown={() => engineRef.current?.pressLeft(true)}
              onPointerUp={() => engineRef.current?.pressLeft(false)}
              onPointerLeave={() => engineRef.current?.pressLeft(false)}
            >
              ◄
            </button>
            <button
              type="button"
              aria-label="Rotar derecha"
              className="asteroids-touch-btn"
              onPointerDown={() => engineRef.current?.pressRight(true)}
              onPointerUp={() => engineRef.current?.pressRight(false)}
              onPointerLeave={() => engineRef.current?.pressRight(false)}
            >
              ►
            </button>
            <button
              type="button"
              aria-label="Propulsar"
              className="asteroids-touch-btn"
              onPointerDown={() => engineRef.current?.pressThrust(true)}
              onPointerUp={() => engineRef.current?.pressThrust(false)}
              onPointerLeave={() => engineRef.current?.pressThrust(false)}
            >
              ▲
            </button>
          </div>
          <div className="asteroids-touch-group">
            <button
              type="button"
              aria-label="Disparar"
              className="asteroids-touch-btn"
              onPointerDown={() => engineRef.current?.shoot()}
            >
              ●
            </button>
            <button
              type="button"
              aria-label="Nova"
              className="asteroids-touch-btn"
              onPointerDown={() => engineRef.current?.nova()}
            >
              ✷
            </button>
          </div>
        </div>
      </div>
    );
  },
);

export default AsteroidsGame;
