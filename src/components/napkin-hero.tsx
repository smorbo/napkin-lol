import { useEffect, useRef, useState } from "react";

const YOU_COLOR = "#2f2a5c";
const NICK_COLOR = "#f97316";

type Pt = { x: number; y: number };

type Stroke = {
  author: "you" | "nick";
  color: string;
  wetColor: string;
  width: number;
  points: Pt[];
  reveal: number;
  bornAt: number;
  done: boolean;
};

function shade(hex: string, amount: number): string {
  const value = hex.replace("#", "");
  const num = parseInt(value, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const mix = (channel: number) =>
    Math.round(channel + (0 - channel) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function ring(cx: number, cy: number, r: number, n = 26): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

function quad(
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  n = 14,
): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    const x = (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0];
    const y = (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1];
    pts.push([x, y]);
  }
  return pts;
}

function doodleSun(): [number, number][][] {
  const strokes: [number, number][][] = [ring(50, 44, 19)];
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    strokes.push([
      [50 + Math.cos(a) * 26, 44 + Math.sin(a) * 26],
      [50 + Math.cos(a) * 34, 44 + Math.sin(a) * 34],
    ]);
  }
  return strokes;
}

function doodleHeart(): [number, number][][] {
  const pts: [number, number][] = [];
  const n = 52;
  for (let i = 0; i <= n; i += 1) {
    const t = (i / n) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y =
      13 * Math.cos(t) -
      5 * Math.cos(2 * t) -
      2 * Math.cos(3 * t) -
      Math.cos(4 * t);
    pts.push([50 + x * 1.85, 48 - y * 1.85]);
  }
  return [pts];
}

function doodleHouse(): [number, number][][] {
  return [
    [
      [12, 48],
      [88, 48],
      [88, 92],
      [12, 92],
      [12, 48],
    ],
    [
      [5, 48],
      [50, 15],
      [95, 48],
    ],
    [
      [43, 92],
      [43, 66],
      [57, 66],
      [57, 92],
    ],
    [
      [22, 60],
      [33, 60],
      [33, 71],
      [22, 71],
      [22, 60],
    ],
    [
      [67, 60],
      [78, 60],
      [78, 71],
      [67, 71],
      [67, 60],
    ],
  ];
}

function doodleFlower(): [number, number][][] {
  const strokes: [number, number][][] = [ring(50, 30, 6, 18)];
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2;
    strokes.push(ring(50 + Math.cos(a) * 13.5, 30 + Math.sin(a) * 13.5, 8, 16));
  }
  strokes.push(quad([50, 40], [45, 62], [50, 92]));
  strokes.push([
    ...quad([49, 70], [62, 62], [68, 72], 10),
    ...quad([68, 72], [58, 80], [50, 76], 10),
  ]);
  return strokes;
}

function doodleSpiral(): [number, number][][] {
  const pts: [number, number][] = [];
  const turns = Math.PI * 2 * 2.6;
  const n = 130;
  for (let i = 0; i <= n; i += 1) {
    const t = (i / n) * turns;
    const r = 2 + t * 2.35;
    pts.push([50 + Math.cos(t) * r * 0.95, 50 + Math.sin(t) * r * 0.95]);
  }
  return [pts];
}

function doodlePlane(): [number, number][][] {
  return [
    [
      [8, 58],
      [93, 25],
      [37, 80],
      [8, 58],
    ],
    [
      [37, 80],
      [93, 25],
    ],
    [
      [37, 80],
      [54, 52],
    ],
    [
      [4, 76],
      [16, 71],
    ],
    [
      [9, 88],
      [21, 81],
    ],
  ];
}

const DOODLES = [
  doodlePlane,
  doodleSun,
  doodleFlower,
  doodleHouse,
  doodleHeart,
  doodleSpiral,
];

const ZONES: [number, number][] = [
  [0.22, 0.3],
  [0.74, 0.27],
  [0.27, 0.68],
  [0.7, 0.64],
  [0.48, 0.42],
];

const NOTES = ["hi!", "nice one", "my turn", "ooh — good line", "draw with me"];

export function NapkinHero() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const drawingRef = useRef<Stroke | null>(null);
  const rafRef = useRef(0);
  const nickBusyRef = useRef(false);
  const [youActive, setYouActive] = useState(false);
  const [nickActive, setNickActive] = useState(false);
  const [note, setNote] = useState<{ id: number; text: string } | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let disposed = false;

    function resize() {
      if (!wrap || !canvas) return;
      const rect = wrap.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      paint(performance.now());
    }

    function drawStroke(stroke: Stroke, now: number) {
      if (!ctx) return;
      const count = Math.max(
        0,
        Math.min(stroke.points.length, Math.floor(stroke.reveal)),
      );
      if (count === 0) return;
      const wetness = stroke.done
        ? Math.max(0, 1 - (now - stroke.bornAt) / 4200)
        : 1;
      const pts = stroke.points.slice(0, count);
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (pts.length === 1) {
        ctx.fillStyle = wetness > 0.03 ? stroke.wetColor : stroke.color;
        ctx.beginPath();
        ctx.arc(pts[0].x * width, pts[0].y * height, stroke.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }
      const path = () => {
        ctx.beginPath();
        pts.forEach((pt, index) => {
          const x = pt.x * width;
          const y = pt.y * height;
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
      };
      if (wetness > 0.03) {
        ctx.globalAlpha = 0.15 * wetness;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width * 2.3;
        path();
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = wetness > 0.03 ? stroke.wetColor : stroke.color;
      ctx.lineWidth = stroke.width * (1 + 0.18 * wetness);
      path();
      ctx.stroke();
      ctx.restore();
    }

    function paint(now: number) {
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      for (const stroke of strokesRef.current) drawStroke(stroke, now);
    }

    function needsFrame(now: number): boolean {
      if (drawingRef.current) return true;
      for (const stroke of strokesRef.current) {
        if (!stroke.done) return true;
        if (now - stroke.bornAt < 4500) return true;
      }
      return false;
    }

    function loop(now: number) {
      if (disposed) return;
      paint(now);
      if (needsFrame(now)) {
        rafRef.current = window.requestAnimationFrame(loop);
      } else {
        rafRef.current = 0;
      }
    }

    function kick() {
      if (!rafRef.current && !disposed) {
        rafRef.current = window.requestAnimationFrame(loop);
      }
    }

    function toLocal(event: PointerEvent): Pt {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left) / rect.width,
        y: (event.clientY - rect.top) / rect.height,
      };
    }

    function onDown(event: PointerEvent) {
      if (event.button !== 0 && event.pointerType === "mouse") return;
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      const stroke: Stroke = {
        author: "you",
        color: YOU_COLOR,
        wetColor: shade(YOU_COLOR, 0.25),
        width: 3.4,
        points: [toLocal(event)],
        reveal: 1,
        bornAt: performance.now(),
        done: false,
      };
      strokesRef.current.push(stroke);
      drawingRef.current = stroke;
      setYouActive(true);
      kick();
    }

    function onMove(event: PointerEvent) {
      const stroke = drawingRef.current;
      if (!stroke) return;
      const pt = toLocal(event);
      const last = stroke.points[stroke.points.length - 1];
      if (Math.hypot(pt.x - last.x, pt.y - last.y) < 0.0016) return;
      stroke.points.push(pt);
      stroke.reveal = stroke.points.length;
      stroke.bornAt = performance.now();
      kick();
    }

    function onUp() {
      const stroke = drawingRef.current;
      if (!stroke) return;
      stroke.done = true;
      stroke.bornAt = performance.now();
      drawingRef.current = null;
      setYouActive(false);
      kick();
    }

    function placeDoodle() {
      const unit = Math.min(width, height) * 0.36;
      if (unit <= 0) return;
      const make = DOODLES[Math.floor(Math.random() * DOODLES.length)];
      const zone = ZONES[Math.floor(Math.random() * ZONES.length)];
      const raw = make();
      const total = raw.reduce((sum, s) => sum + s.length, 0);
      const strokes: Stroke[] = raw.map((pts) => ({
        author: "nick" as const,
        color: NICK_COLOR,
        wetColor: shade(NICK_COLOR, 0.22),
        width: 3,
        points: pts.map(([px, py]) => ({
          x: (zone[0] * width + ((px - 50) / 100) * unit) / width,
          y: (zone[1] * height + ((py - 50) / 100) * unit) / height,
        })),
        reveal: 0,
        bornAt: performance.now(),
        done: false,
      }));
      strokesRef.current.push(...strokes);
      if (reduced) {
        for (const stroke of strokes) {
          stroke.reveal = stroke.points.length;
          stroke.done = true;
          stroke.bornAt = performance.now() - 10000;
        }
        paint(performance.now());
        return;
      }
      nickBusyRef.current = true;
      setNickActive(true);
      const duration = Math.min(3400, Math.max(1300, total * 15));
      const start = performance.now();
      const step = (now: number) => {
        if (disposed) return;
        const progress = Math.min(1, (now - start) / duration);
        let remaining = Math.floor(progress * total);
        for (const stroke of strokes) {
          const take = Math.min(stroke.points.length, remaining);
          stroke.reveal = take;
          stroke.bornAt = now;
          remaining -= take;
          if (remaining <= 0) break;
        }
        kick();
        if (progress < 1) {
          window.requestAnimationFrame(step);
        } else {
          for (const stroke of strokes) {
            stroke.done = true;
            stroke.bornAt = performance.now();
          }
          nickBusyRef.current = false;
          setNickActive(false);
          kick();
        }
      };
      window.requestAnimationFrame(step);
    }

    let noteTimer = 0;
    function showNote() {
      const text = NOTES[Math.floor(Math.random() * NOTES.length)];
      setNote({ id: Date.now(), text });
      noteTimer = window.setTimeout(() => setNote(null), 3900);
    }

    let nickTimer = 0;
    function scheduleNick(delay: number) {
      nickTimer = window.setTimeout(() => {
        if (disposed) return;
        if (document.hidden || nickBusyRef.current) {
          scheduleNick(2600);
          return;
        }
        if (drawingRef.current) {
          scheduleNick(2200);
          return;
        }
        if (Math.random() < 0.24) showNote();
        else placeDoodle();
        scheduleNick(6500 + Math.random() * 6500);
      }, delay);
    }

    const observer = new ResizeObserver(resize);
    observer.observe(wrap);
    resize();
    scheduleNick(1500);

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    return () => {
      disposed = true;
      observer.disconnect();
      window.clearTimeout(nickTimer);
      window.clearTimeout(noteTimer);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex items-end justify-between px-1 pb-3">
        <div
          className="flex items-center gap-2.5"
          aria-label="At the table: you and Nick"
        >
          <span
            className={`relative flex items-center gap-2 rounded-full border border-border bg-background/70 py-1 pl-1 pr-3 text-xs font-medium backdrop-blur-md transition-transform duration-300 ${youActive ? "scale-110" : ""}`}
          >
            <span className="relative flex size-6 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: YOU_COLOR }}>
              {youActive && (
                <span className="absolute inset-0 animate-ping rounded-full opacity-40" style={{ backgroundColor: YOU_COLOR }} />
              )}
              You
            </span>
            You
          </span>
          <span
            className={`relative flex items-center gap-2 rounded-full border border-border bg-background/70 py-1 pl-1 pr-3 text-xs font-medium backdrop-blur-md transition-transform duration-300 ${nickActive ? "scale-110" : ""}`}
          >
            <span className="relative block size-6 overflow-hidden rounded-full bg-[#fdfaf1]">
              {nickActive && (
                <span className="absolute inset-0 z-10 animate-ping rounded-full bg-orange-400 opacity-40" />
              )}
              <img src="/favicon.png" alt="" className="size-full object-contain" />
            </span>
            Nick
          </span>
        </div>
        <span className="hidden text-xs text-muted-foreground sm:block">
          Go ahead — doodle on it
        </span>
      </div>

      <div
        ref={wrapRef}
        className="napkin-paper relative h-[380px] overflow-hidden rounded-[4px] shadow-[0_35px_80px_-25px_rgba(0,0,0,0.55)] sm:h-[460px]"
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 size-full cursor-crosshair touch-none select-none"
          role="img"
          aria-label="A paper napkin you can doodle on, with Nick the Napkin mascot drawing beside you"
        />
        <span
          aria-hidden
          className="font-scribble pointer-events-none absolute bottom-3 left-4 -rotate-3 text-2xl opacity-70"
          style={{ color: YOU_COLOR }}
        >
          You
        </span>
        <span
          aria-hidden
          className="font-scribble pointer-events-none absolute bottom-3 right-4 rotate-2 text-2xl opacity-80"
          style={{ color: NICK_COLOR }}
        >
          Nick
        </span>
        {note && (
          <div
            key={note.id}
            className="hero-note pointer-events-none absolute right-0 top-[30%] max-w-[11rem] rounded-l-xl px-3 py-2 text-sm font-semibold shadow-lg"
            style={{ backgroundColor: NICK_COLOR, color: "#1c1005" }}
            role="status"
          >
            {note.text}
          </div>
        )}
      </div>
    </div>
  );
}
