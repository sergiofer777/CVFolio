"use client";

import { useEffect, useRef, useCallback, useState } from "react";

/* ═══════════════════════════════════════════════════════════════
   MinigameCanvas – 3 random mini-games on a single <canvas>
   snake · runner · skills · flappy
   ═══════════════════════════════════════════════════════════════ */

const GAMES = ["snake", "runner", "skills", "flappy"] as const;
type GameType = (typeof GAMES)[number];

const GAME_NAMES: Record<GameType, string> = {
  snake: "Snake",
  runner: "Carrera al Trabajo",
  skills: "Atrapa los Skills",
  flappy: "Flappy Bird",
};

const GAME_HINTS: Record<GameType, string> = {
  snake: "Flechas del teclado para moverse",
  runner: "Espacio o clic para saltar",
  skills: "Clic en las palabras antes de que caigan",
  flappy: "Clic o Espacio para volar",
};

interface MinigameCanvasProps {
  onTimeUp?: () => void;
  standalone?: boolean;
  onBackToCV?: () => void;
}

/* ── Shared state structure ── */
interface Pipe {
  x: number;
  gapY: number; // center of gap
  scored: boolean;
}

interface GameState {
  type: GameType;
  started: boolean;
  over: boolean;
  score: number;
  frameId: number;
  // Snake
  snake?: { x: number; y: number }[];
  snakeDir?: { x: number; y: number };
  snakeNextDir?: { x: number; y: number };
  snakeFood?: { x: number; y: number };
  snakeTick?: number;
  snakeTickRate?: number;
  // Runner
  runnerY?: number;
  runnerVel?: number;
  runnerOnGround?: boolean;
  obstacles?: { x: number; w: number; h: number }[];
  runnerSpeed?: number;
  runnerDist?: number;
  // Skills
  skillWords?: { text: string; x: number; y: number; speed: number; w: number }[];
  skillSpawnTimer?: number;
  skillMisses?: number;
  // Flappy
  birdY?: number;
  birdVel?: number;
  pipes?: Pipe[];
  flappyTimer?: number;
  flappySpeed?: number;
}

const CELL = 18; // snake cell size (bigger = easier)
const SNAKE_INIT_RATE = 10; // higher = slower start (easier)
const SNAKE_MIN_RATE = 5;   // minimum tick rate (lower = harder cap)
const SNAKE_RATE_STEP = 0.2; // how much faster per apple (smaller = easier)

const GAP_SIZE = 90; // flappy pipe gap (bigger = easier)

function createInitState(type: GameType, cw: number, ch: number): GameState {
  const base: GameState = { type, started: false, over: false, score: 0, frameId: 0 };

  if (type === "snake") {
    const gridW = Math.floor(cw / CELL);
    const gridH = Math.floor(ch / CELL);
    const cx = Math.floor(gridW / 2);
    const cy = Math.floor(gridH / 2);
    base.snake = [
      { x: cx, y: cy },
      { x: cx - 1, y: cy },
      { x: cx - 2, y: cy },
    ];
    base.snakeDir = { x: 1, y: 0 };
    base.snakeNextDir = { x: 1, y: 0 };
    base.snakeFood = randFood(gridW, gridH, [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }]);
    base.snakeTick = 0;
    base.snakeTickRate = SNAKE_INIT_RATE;
  }

  if (type === "runner") {
    const ground = ch - 40;
    base.runnerY = ground;
    base.runnerVel = 0;
    base.runnerOnGround = true;
    base.obstacles = [];
    base.runnerSpeed = 3.5;
    base.runnerDist = 0;
  }

  if (type === "skills") {
    base.skillWords = [];
    base.skillSpawnTimer = 0;
    base.skillMisses = 0;
  }

  if (type === "flappy") {
    base.birdY = ch / 2;
    base.birdVel = 0;
    base.pipes = [];
    base.flappyTimer = 0;
    base.flappySpeed = 2.2;
  }

  return base;
}

function randFood(
  gridW: number,
  gridH: number,
  snake: { x: number; y: number }[]
): { x: number; y: number } {
  let pos: { x: number; y: number };
  do {
    pos = {
      x: Math.floor(Math.random() * (gridW - 2)) + 1,
      y: Math.floor(Math.random() * (gridH - 2)) + 1,
    };
  } while (snake.some((s) => s.x === pos.x && s.y === pos.y));
  return pos;
}

export function MinigameCanvas({ onTimeUp, standalone, onBackToCV }: MinigameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const [gameIndex, setGameIndex] = useState(0);
  const [gameType, setGameType] = useState<GameType>(GAMES[0]);
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const mountedRef = useRef(true);

  const CW = 400;
  const CH = 300;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (stateRef.current) cancelAnimationFrame(stateRef.current.frameId);
    };
  }, []);

  const getCtx = useCallback(() => {
    const c = canvasRef.current;
    return c ? c.getContext("2d") : null;
  }, []);

  /* ══════════════════════════════════
     SNAKE
  ══════════════════════════════════ */
  const tickSnake = useCallback((s: GameState) => {
    const gridW = Math.floor(CW / CELL);
    const gridH = Math.floor(CH / CELL);
    s.snakeTick = (s.snakeTick ?? 0) + 1;
    if (s.snakeTick < (s.snakeTickRate ?? SNAKE_INIT_RATE)) return;
    s.snakeTick = 0;

    // Apply buffered direction
    s.snakeDir = s.snakeNextDir ?? s.snakeDir;

    const head = s.snake![0];
    const dir = s.snakeDir!;
    const nx = head.x + dir.x;
    const ny = head.y + dir.y;

    if (nx < 0 || nx >= gridW || ny < 0 || ny >= gridH) { s.over = true; return; }
    if (s.snake!.some((seg, i) => i > 0 && seg.x === nx && seg.y === ny)) { s.over = true; return; }

    s.snake!.unshift({ x: nx, y: ny });
    if (nx === s.snakeFood!.x && ny === s.snakeFood!.y) {
      s.score += 10;
      s.snakeFood = randFood(gridW, gridH, s.snake!);
      if ((s.snakeTickRate ?? SNAKE_INIT_RATE) > SNAKE_MIN_RATE) {
        s.snakeTickRate = (s.snakeTickRate ?? SNAKE_INIT_RATE) - SNAKE_RATE_STEP;
      }
    } else {
      s.snake!.pop();
    }
  }, [CW, CH]);

  const drawSnake = useCallback((s: GameState, ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = "#f5f2eb";
    ctx.fillRect(0, 0, CW, CH);

    // Subtle grid
    ctx.strokeStyle = "rgba(0,0,0,0.04)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= CW; x += CELL) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke(); }
    for (let y = 0; y <= CH; y += CELL) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke(); }

    // Food
    const food = s.snakeFood!;
    ctx.fillStyle = "#c0440a";
    ctx.beginPath();
    ctx.roundRect(food.x * CELL + 2, food.y * CELL + 2, CELL - 4, CELL - 4, 4);
    ctx.fill();

    // Snake body
    s.snake!.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? "#0d0d0d" : i % 2 === 0 ? "#2a2a2a" : "#333";
      ctx.beginPath();
      ctx.roundRect(seg.x * CELL + 2, seg.y * CELL + 2, CELL - 4, CELL - 4, i === 0 ? 5 : 3);
      ctx.fill();
    });

    // Score
    ctx.fillStyle = "#0d0d0d";
    ctx.font = "bold 13px 'DM Sans', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${s.score} pts`, CW - 10, 20);
  }, [CW, CH]);

  /* ══════════════════════════════════
     RUNNER
  ══════════════════════════════════ */
  const tickRunner = useCallback((s: GameState) => {
    const ground = CH - 40;
    const GRAVITY = 0.55;

    if (!s.runnerOnGround) {
      s.runnerVel = (s.runnerVel ?? 0) + GRAVITY;
      s.runnerY = (s.runnerY ?? ground) + (s.runnerVel ?? 0);
      if (s.runnerY! >= ground) {
        s.runnerY = ground;
        s.runnerVel = 0;
        s.runnerOnGround = true;
      }
    }

    s.runnerDist = (s.runnerDist ?? 0) + (s.runnerSpeed ?? 3.5);
    s.score = Math.floor((s.runnerDist ?? 0) / 10);
    if (s.runnerSpeed! < 7) s.runnerSpeed = s.runnerSpeed! + 0.0015;

    const obs = s.obstacles!;
    // Spawn with generous spacing
    if (obs.length === 0 || obs[obs.length - 1].x < CW - 200 - Math.random() * 140) {
      const h = 18 + Math.random() * 18;
      obs.push({ x: CW + 10, w: 16, h });
    }

    for (let i = obs.length - 1; i >= 0; i--) {
      obs[i].x -= s.runnerSpeed!;
      if (obs[i].x < -30) obs.splice(i, 1);
    }

    // Collision (slightly forgiving hitbox)
    const px = 42, pw = 18, ph = 28;
    const py = s.runnerY! - ph;
    for (const ob of obs) {
      const oy = ground - ob.h;
      if (px + pw > ob.x + 2 && px + 2 < ob.x + ob.w && py + ph > oy + 2) {
        s.over = true; return;
      }
    }
  }, [CH, CW]);

  const drawRunner = useCallback((s: GameState, ctx: CanvasRenderingContext2D) => {
    const ground = CH - 40;
    ctx.fillStyle = "#f5f2eb";
    ctx.fillRect(0, 0, CW, CH);

    // Ground
    ctx.strokeStyle = "#d5cfc4";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, ground + 1); ctx.lineTo(CW, ground + 1); ctx.stroke();

    // Moving dashes
    ctx.strokeStyle = "rgba(0,0,0,0.07)";
    ctx.lineWidth = 1;
    const off = (s.runnerDist ?? 0) % 40;
    for (let x = -off; x < CW; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, ground + 8); ctx.lineTo(x + 20, ground + 8); ctx.stroke();
    }

    // Player
    const px = 40, ph = 28;
    const py = s.runnerY! - ph;
    ctx.fillStyle = "#0d0d0d";
    ctx.beginPath(); ctx.roundRect(px, py, 22, ph, 4); ctx.fill();
    ctx.beginPath(); ctx.arc(px + 11, py - 6, 7, 0, Math.PI * 2); ctx.fill();

    // Obstacles (briefcases)
    for (const ob of s.obstacles!) {
      const oy = ground - ob.h;
      ctx.fillStyle = "#7a3f0a";
      ctx.beginPath(); ctx.roundRect(ob.x, oy, ob.w, ob.h, 3); ctx.fill();
      ctx.strokeStyle = "#5a2f06"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(ob.x + ob.w / 2, oy, 4, Math.PI, 0); ctx.stroke();
    }

    ctx.fillStyle = "#0d0d0d";
    ctx.font = "bold 13px 'DM Sans', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${s.score} m`, CW - 10, 20);
  }, [CW, CH]);

  /* ══════════════════════════════════
     SKILLS
  ══════════════════════════════════ */
  const SKILL_WORDS = ["React", "Node", "Python", "Docker", "Git", "SQL", "TypeScript", "AWS", "Figma", "Rust", "Linux", "CSS", "API", "Java", "Swift"];

  const tickSkills = useCallback((s: GameState) => {
    s.skillSpawnTimer = (s.skillSpawnTimer ?? 0) + 1;
    const spawnRate = Math.max(35, 80 - s.score * 2);
    if (s.skillSpawnTimer >= spawnRate) {
      s.skillSpawnTimer = 0;
      const text = SKILL_WORDS[Math.floor(Math.random() * SKILL_WORDS.length)];
      const w = text.length * 9 + 20;
      s.skillWords!.push({
        text,
        x: Math.random() * (CW - w - 20) + 10,
        y: -24,
        speed: 1.0 + Math.random() * 1.2 + s.score * 0.04,
        w,
      });
    }
    for (let i = s.skillWords!.length - 1; i >= 0; i--) {
      s.skillWords![i].y += s.skillWords![i].speed;
      if (s.skillWords![i].y > CH) {
        s.skillWords!.splice(i, 1);
        s.skillMisses = (s.skillMisses ?? 0) + 1;
        if (s.skillMisses! >= 5) { s.over = true; return; }
      }
    }
  }, [CW, CH]);

  const drawSkills = useCallback((s: GameState, ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = "#f5f2eb";
    ctx.fillRect(0, 0, CW, CH);

    ctx.strokeStyle = "#c0440a"; ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(0, CH - 2); ctx.lineTo(CW, CH - 2); ctx.stroke();
    ctx.setLineDash([]);

    for (const word of s.skillWords!) {
      ctx.fillStyle = "#fff"; ctx.strokeStyle = "#d5cfc4"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(word.x, word.y, word.w, 28, 14); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#0d0d0d";
      ctx.font = "500 12px 'DM Sans', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(word.text, word.x + word.w / 2, word.y + 18);
    }

    ctx.textAlign = "right"; ctx.fillStyle = "#0d0d0d";
    ctx.font = "bold 13px 'DM Sans', sans-serif";
    ctx.fillText(`${s.score} pts`, CW - 10, 20);

    ctx.textAlign = "left"; ctx.fillStyle = "#c0440a";
    ctx.font = "13px 'DM Sans', sans-serif";
    const hearts = 5 - (s.skillMisses ?? 0);
    let h = "";
    for (let i = 0; i < 5; i++) h += i < hearts ? "\u2665 " : "\u2661 ";
    ctx.fillText(h, 10, 20);
  }, [CW, CH]);

  /* ══════════════════════════════════
     FLAPPY BIRD
  ══════════════════════════════════ */
  const tickFlappy = useCallback((s: GameState) => {
    const GRAVITY = 0.32;
    const BIRD_X = 60;
    const BIRD_R = 12;

    s.birdVel = (s.birdVel ?? 0) + GRAVITY;
    s.birdY = (s.birdY ?? CH / 2) + s.birdVel!;

    // Hit ceiling or floor
    if (s.birdY! - BIRD_R <= 0 || s.birdY! + BIRD_R >= CH) {
      s.over = true; return;
    }

    s.flappyTimer = (s.flappyTimer ?? 0) + 1;
    // Spawn pipe every ~90 frames
    if (s.flappyTimer! % 90 === 0) {
      const margin = 50;
      const gapY = margin + Math.random() * (CH - margin * 2 - GAP_SIZE);
      s.pipes!.push({ x: CW + 10, gapY: gapY + GAP_SIZE / 2, scored: false });
    }

    const speed = s.flappySpeed!;
    for (let i = s.pipes!.length - 1; i >= 0; i--) {
      s.pipes![i].x -= speed;
      if (s.pipes![i].x < -40) { s.pipes!.splice(i, 1); continue; }

      const p = s.pipes![i];
      const topH = p.gapY - GAP_SIZE / 2;
      const botY = p.gapY + GAP_SIZE / 2;
      const pw = 38;

      // Score when bird passes pipe center
      if (!p.scored && p.x + pw / 2 < BIRD_X) {
        p.scored = true;
        s.score += 1;
        if (s.flappySpeed! < 4) s.flappySpeed = s.flappySpeed! + 0.1;
      }

      // Collision (forgiving: shrink hitbox by 4px)
      const bx = BIRD_X, by = s.birdY!, br = BIRD_R - 4;
      if (bx + br > p.x && bx - br < p.x + pw) {
        if (by - br < topH || by + br > botY) { s.over = true; return; }
      }
    }
  }, [CH, CW]);

  const drawFlappy = useCallback((s: GameState, ctx: CanvasRenderingContext2D) => {
    // Sky
    ctx.fillStyle = "#e8f4f8";
    ctx.fillRect(0, 0, CW, CH);

    // Pipes
    const pw = 38;
    for (const p of s.pipes!) {
      const topH = p.gapY - GAP_SIZE / 2;
      const botY = p.gapY + GAP_SIZE / 2;

      // Top pipe
      ctx.fillStyle = "#2a7a2a";
      ctx.fillRect(p.x, 0, pw, topH);
      ctx.fillStyle = "#1e5c1e";
      ctx.fillRect(p.x - 3, topH - 14, pw + 6, 14);

      // Bottom pipe
      ctx.fillStyle = "#2a7a2a";
      ctx.fillRect(p.x, botY, pw, CH - botY);
      ctx.fillStyle = "#1e5c1e";
      ctx.fillRect(p.x - 3, botY, pw + 6, 14);
    }

    // Bird (little character)
    const bx = 60, by = s.birdY!, br = 12;
    // Body
    ctx.fillStyle = "#c0440a";
    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
    // Eye
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(bx + 4, by - 3, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#0d0d0d";
    ctx.beginPath(); ctx.arc(bx + 5, by - 3, 2, 0, Math.PI * 2); ctx.fill();
    // Beak
    ctx.fillStyle = "#f5a623";
    ctx.beginPath();
    ctx.moveTo(bx + br - 1, by);
    ctx.lineTo(bx + br + 7, by - 2);
    ctx.lineTo(bx + br + 7, by + 3);
    ctx.closePath(); ctx.fill();

    // Score
    ctx.fillStyle = "#0d0d0d";
    ctx.font = "bold 13px 'DM Sans', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${s.score} pts`, CW - 10, 20);
  }, [CW, CH]);

  /* ══════════════════════════════════
     GAME OVER overlay
  ══════════════════════════════════ */
  const drawGameOver = useCallback((s: GameState, ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = "rgba(13,13,13,0.6)";
    ctx.fillRect(0, 0, CW, CH);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 22px 'DM Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${s.score} puntos`, CW / 2, CH / 2 - 10);

    ctx.font = "13px 'DM Sans', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText("Clic para reintentar", CW / 2, CH / 2 + 18);
  }, [CW, CH]);

  /* ══════════════════════════════════
     GAME LOOP
  ══════════════════════════════════ */
  const loop = useCallback(() => {
    if (!mountedRef.current) return;
    const s = stateRef.current;
    const ctx = getCtx();
    if (!s || !ctx || !s.started) return;

    if (!s.over) {
      if (s.type === "snake") tickSnake(s);
      if (s.type === "runner") tickRunner(s);
      if (s.type === "skills") tickSkills(s);
      if (s.type === "flappy") tickFlappy(s);
    }

    if (s.type === "snake") drawSnake(s, ctx);
    if (s.type === "runner") drawRunner(s, ctx);
    if (s.type === "skills") drawSkills(s, ctx);
    if (s.type === "flappy") drawFlappy(s, ctx);

    if (s.over) {
      drawGameOver(s, ctx);
      if (mountedRef.current) { setGameOver(true); }
      return;
    }

    s.frameId = requestAnimationFrame(loop);
  }, [getCtx, tickSnake, drawSnake, tickRunner, drawRunner, tickSkills, drawSkills, tickFlappy, drawFlappy, drawGameOver]);

  /* ── Init on game type change ── */
  useEffect(() => {
    const ctx = getCtx();
    if (!ctx) return;
    if (stateRef.current) cancelAnimationFrame(stateRef.current.frameId);

    const s = createInitState(gameType, CW, CH);
    stateRef.current = s;
    setStarted(false);
    setGameOver(false);

    // Idle screen
    if (gameType === "flappy") {
      ctx.fillStyle = "#e8f4f8";
    } else {
      ctx.fillStyle = "#f5f2eb";
    }
    ctx.fillRect(0, 0, CW, CH);

    ctx.fillStyle = "#0d0d0d";
    ctx.font = "bold 18px 'DM Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(GAME_NAMES[gameType], CW / 2, CH / 2 - 20);

    ctx.font = "13px 'DM Sans', sans-serif";
    ctx.fillStyle = "#888";
    ctx.fillText("Clic para jugar", CW / 2, CH / 2 + 8);

    ctx.font = "11px 'DM Sans', sans-serif";
    ctx.fillStyle = "#aaa";
    ctx.fillText(GAME_HINTS[gameType], CW / 2, CH / 2 + 30);
  }, [gameType, getCtx, CW, CH]);

  /* ── Start ── */
  const startGame = useCallback(() => {
    const s = stateRef.current;
    if (!s || s.started) return;
    s.started = true;
    setStarted(true);
    setGameOver(false);
    s.frameId = requestAnimationFrame(loop);
  }, [loop]);

  /* ── Restart ── */
  const restart = useCallback(() => {
    if (stateRef.current) cancelAnimationFrame(stateRef.current.frameId);
    const s = createInitState(gameType, CW, CH);
    s.started = true;
    stateRef.current = s;
    setStarted(true);
    setGameOver(false);
    s.frameId = requestAnimationFrame(loop);
  }, [gameType, loop, CW, CH]);

  /* ── Flap / jump action ── */
  const doAction = useCallback(() => {
    const s = stateRef.current;
    if (!s) return;
    if (!s.started) { startGame(); return; }
    if (s.over) { restart(); return; }
    if (s.type === "flappy") { s.birdVel = -6.5; }
    if (s.type === "runner" && s.runnerOnGround) { s.runnerVel = -10; s.runnerOnGround = false; }
  }, [startGame, restart]);

  /* ── Canvas click ── */
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const s = stateRef.current;
      if (!s) return;
      if (!s.started) { startGame(); return; }
      if (s.over) { restart(); return; }

      if (s.type === "flappy") { s.birdVel = -6.5; return; }
      if (s.type === "runner" && s.runnerOnGround) { s.runnerVel = -10; s.runnerOnGround = false; return; }

      if (s.type === "skills") {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (CW / rect.width);
        const my = (e.clientY - rect.top) * (CH / rect.height);
        for (let i = s.skillWords!.length - 1; i >= 0; i--) {
          const w = s.skillWords![i];
          if (mx >= w.x && mx <= w.x + w.w && my >= w.y && my <= w.y + 28) {
            s.skillWords!.splice(i, 1);
            s.score += 1;
            break;
          }
        }
      }
    },
    [startGame, restart, CW, CH]
  );

  /* ── Keyboard ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (!s) return;

      if (!s.started || s.over) {
        if (e.code === "Space") { doAction(); e.preventDefault(); }
        return;
      }

      if (s.type === "snake") {
        const dir = s.snakeDir!;
        if (e.key === "ArrowUp" && dir.y !== 1) s.snakeNextDir = { x: 0, y: -1 };
        else if (e.key === "ArrowDown" && dir.y !== -1) s.snakeNextDir = { x: 0, y: 1 };
        else if (e.key === "ArrowLeft" && dir.x !== 1) s.snakeNextDir = { x: -1, y: 0 };
        else if (e.key === "ArrowRight" && dir.x !== -1) s.snakeNextDir = { x: 1, y: 0 };
        else return;
        e.preventDefault();
      }

      if ((s.type === "flappy" || s.type === "runner") && e.code === "Space") {
        doAction(); e.preventDefault();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [doAction]);

  /* ── Switch game (sequential) ── */
  const randomGame = useCallback(() => {
    if (stateRef.current) cancelAnimationFrame(stateRef.current.frameId);
    const nextIndex = (gameIndex + 1) % GAMES.length;
    setGameIndex(nextIndex);
    setGameType(GAMES[nextIndex]);
  }, [gameIndex]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[0.72rem] tracking-[0.08em] uppercase text-[var(--muted-color)] font-medium">
          {GAME_NAMES[gameType]}
        </span>
        <button
          onClick={randomGame}
          className="text-[0.72rem] text-[var(--rust)] hover:text-[var(--ink)] transition-colors font-medium"
        >
          Otro juego &rarr;
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={CW}
        height={CH}
        onClick={handleCanvasClick}
        className="w-full rounded-lg border border-[var(--sand)] cursor-pointer"
        style={{ imageRendering: "auto", aspectRatio: `${CW}/${CH}` }}
      />

      {standalone && onBackToCV && (
        <div className="flex justify-center mt-3">
          <button
            onClick={onBackToCV}
            className="text-[0.78rem] text-[var(--muted-color)] font-medium px-4 py-2 rounded-md border border-[var(--sand)] hover:border-[var(--ink)] hover:text-[var(--ink)] hover:bg-[var(--cream)] transition-all"
          >
            ← Volver al CV
          </button>
        </div>
      )}
    </div>
  );
}
