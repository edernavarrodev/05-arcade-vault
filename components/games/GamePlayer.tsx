"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Game } from "@/lib/data";
import { saveScore } from "@/lib/scores";
import { useSession } from "@/lib/session";
import { getGameRegistryEntry } from "@/lib/games/registry";
import type { GameComponentHandle } from "@/lib/games/types";

type SaveStatus = "idle" | "guardando" | "guardado" | "error";

export default function GamePlayer({ game }: { game: Game }) {
  const router = useRouter();
  const { user } = useSession();
  const entry = getGameRegistryEntry(game.id);

  const [score, setScore] = useState(0);
  const [lives] = useState(3);
  const [level, setLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [name, setName] = useState(user ? user.name : "INVITADO");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- estado genérico: cada juego del registry define su propio TState
  const [engineState, setEngineState] = useState<any>(null);
  const gameRef = useRef<GameComponentHandle>(null);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
  }, [user]);

  useEffect(() => {
    if (entry || over || paused) return;
    const t = setInterval(() => setScore((s) => s + Math.floor(10 + Math.random() * 90)), 220);
    return () => clearInterval(t);
  }, [entry, over, paused]);

  useEffect(() => {
    if (entry) return;
    if (score > 0 && score % 2500 < 100) setLevel((l) => l + 1);
  }, [entry, score]);

  useEffect(() => {
    if (entry && engineState && entry.isOver(engineState)) setOver(true);
  }, [entry, engineState]);

  useEffect(() => {
    if (entry && engineState && typeof engineState.paused === "boolean") {
      setPaused(engineState.paused);
    }
  }, [entry, engineState]);

  const displayScore = entry ? (engineState ? entry.getScore(engineState) : 0) : score;
  const displayLives = entry
    ? engineState && entry.getLives
      ? entry.getLives(engineState)
      : 3
    : lives;
  const displayLevel = entry ? (engineState ? entry.getLevel(engineState) : 1) : level;

  const endGame = () => setOver(true);
  const togglePause = () => {
    setPaused((p) => {
      const next = !p;
      if (entry) {
        if (next) gameRef.current?.pause();
        else gameRef.current?.resume();
      }
      return next;
    });
  };
  const restart = () => {
    if (entry) {
      gameRef.current?.restart();
    } else {
      setScore(0);
      setLevel(1);
    }
    setPaused(false);
    setOver(false);
    setSaveStatus("idle");
  };

  const handleSave = async () => {
    setSaveStatus("guardando");
    try {
      await saveScore({ game: game.id, score: displayScore, name, level: displayLevel });
      setSaveStatus("guardado");
    } catch {
      setSaveStatus("error");
    }
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{displayScore.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(displayLives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(displayLevel).padStart(2, "0")}</div>
          </div>
          {entry?.renderExtraHud && engineState && entry.renderExtraHud(engineState)}
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={togglePause}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          {!entry && (
            <button className="btn magenta" onClick={endGame}>
              FIN
            </button>
          )}
          <button className="btn ghost" onClick={() => router.push(`/juegos/${game.id}`)}>
            SALIR
          </button>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {entry ? (
            <entry.Component ref={gameRef} onStateChange={setEngineState} />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div className="crt-content" style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}>
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{displayScore.toLocaleString("es-ES")}</div>
            {saveStatus === "guardado" ? (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            ) : (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase().slice(0, 10))}
                  placeholder="TUS INICIALES"
                  disabled={saveStatus === "guardando"}
                />
                <button
                  className="btn yellow"
                  onClick={handleSave}
                  disabled={saveStatus === "guardando"}
                >
                  {saveStatus === "guardando" ? "GUARDANDO..." : "GUARDAR PUNTUACIÓN"}
                </button>
                {saveStatus === "error" && (
                  <div className="toast-error">▸ ERROR AL GUARDAR. REINTENTÁ.</div>
                )}
              </div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <button className="btn magenta" onClick={() => router.push("/")}>
                VOLVER AL VAULT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
