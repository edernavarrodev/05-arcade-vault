"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { createTetrisEngine, type TetrisEngine, type TetrisState } from "@/lib/games/tetris/engine";
import type { GameComponentHandle, GameComponentProps } from "@/lib/games/types";

const TetrisGame = forwardRef<GameComponentHandle, GameComponentProps<TetrisState>>(
  function TetrisGame({ onStateChange }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const nextCanvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<TetrisEngine | null>(null);
    const onStateChangeRef = useRef(onStateChange);
    onStateChangeRef.current = onStateChange;

    useEffect(() => {
      const canvas = canvasRef.current;
      const nextCanvas = nextCanvasRef.current;
      if (!canvas || !nextCanvas) return;
      const engine = createTetrisEngine(canvas, nextCanvas, (state) =>
        onStateChangeRef.current(state),
      );
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
      <div className="tetris-game">
        <canvas ref={canvasRef} className="tetris-board-canvas" />
        <div className="tetris-side">
          <div className="tetris-next-label">SIGUIENTE</div>
          <canvas ref={nextCanvasRef} className="tetris-next-canvas" />
        </div>
        <div className="tetris-touch-controls">
          <div className="tetris-touch-group">
            <button
              type="button"
              aria-label="Mover izquierda"
              className="tetris-touch-btn"
              onPointerDown={() => engineRef.current?.moveLeft(true)}
              onPointerUp={() => engineRef.current?.moveLeft(false)}
              onPointerLeave={() => engineRef.current?.moveLeft(false)}
            >
              ◄
            </button>
            <button
              type="button"
              aria-label="Mover derecha"
              className="tetris-touch-btn"
              onPointerDown={() => engineRef.current?.moveRight(true)}
              onPointerUp={() => engineRef.current?.moveRight(false)}
              onPointerLeave={() => engineRef.current?.moveRight(false)}
            >
              ►
            </button>
            <button
              type="button"
              aria-label="Bajar"
              className="tetris-touch-btn"
              onPointerDown={() => engineRef.current?.softDrop(true)}
              onPointerUp={() => engineRef.current?.softDrop(false)}
              onPointerLeave={() => engineRef.current?.softDrop(false)}
            >
              ▼
            </button>
          </div>
          <div className="tetris-touch-group">
            <button
              type="button"
              aria-label="Rotar"
              className="tetris-touch-btn"
              onClick={() => engineRef.current?.rotate()}
            >
              ⟳
            </button>
            <button
              type="button"
              aria-label="Caída rápida"
              className="tetris-touch-btn"
              onClick={() => engineRef.current?.hardDrop()}
            >
              ⇓
            </button>
          </div>
        </div>
      </div>
    );
  },
);

export default TetrisGame;
