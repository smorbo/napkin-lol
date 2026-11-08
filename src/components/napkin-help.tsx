import { useEffect, useState } from "react";

const TARGETS: { label: string; selector: string }[] = [
  { label: "Invite link", selector: '[aria-label="Copy Napkin link"]' },
  { label: "Time left", selector: '[aria-label^="Time remaining"]' },
  { label: "Select & move", selector: '[aria-label="Pointer"]' },
  { label: "Draw & erase", selector: '[aria-label="Pen"]' },
  { label: "Type", selector: '[aria-label="Text"]' },
  { label: "Add pictures & GIFs", selector: 'label[title="Image"]' },
  { label: "Chat", selector: '[aria-label^="Open chat"], [aria-label="Minimise chat"]' },
  { label: "People", selector: '[aria-label$="people in this Napkin"]' },
  { label: "Board colour", selector: '[aria-label^="Switch board"]' },
  { label: "Grid", selector: '[aria-label^="Dot grid"]' },
  { label: "Door", selector: '[aria-label$="at the door"], [aria-label="Unlock the door"], [aria-label="Lock the door"]' },
  { label: "Save a copy", selector: '[aria-label="Export Napkin"]' },
  { label: "Shred", selector: '[aria-label*="hred"]' },
  { label: "Leave", selector: '[aria-label="Leave this Napkin"]' },
];

type Placed = { edge?: string; left?: number; label: string; tx: number; ty: number; lx: number; ly: number; cx: number; cy: number; ex: number; ey: number; bx: number; by: number };

function layout(): Placed[] {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const placed: Placed[] = [];
  const counts = { top: 0, bottom: 0, left: 0, right: 0 };
  TARGETS.forEach(({ label, selector }, i) => {
    const el = [...document.querySelectorAll<HTMLElement>(selector)].find((node) => {
      const r = node.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    if (!el) return;
    const r = el.getBoundingClientRect();
    const tx = r.left + r.width / 2;
    const ty = r.top + r.height / 2;
    // Point labels away from whichever screen edge the control sits on, staggered so they don't collide
    const edges = { top: ty, bottom: vh - ty, left: tx, right: vw - tx };
    const edge = (Object.keys(edges) as (keyof typeof edges)[]).reduce((a, b) => (edges[a] <= edges[b] ? a : b));
    const n = counts[edge]++;
    const [dx, dy] = edge === "top" ? [0, 1] : edge === "bottom" ? [0, -1] : edge === "left" ? [1, 0] : [-1, 0];
    const dist = edge === "bottom" || edge === "top" ? 55 + n * 42 : 70 + (n % 2) * 95;
    const lx = Math.min(vw - 70, Math.max(70, tx + dx * dist));
    const ly = Math.min(vh - 20, Math.max(20, ty + dy * dist));
    const radius = Math.max(r.width, r.height) / 2 + 6;
    const ex = tx + dx * radius;
    const ey = ty + dy * radius;
    const side = i % 2 ? 1 : -1;
    const cx = (lx + ex) / 2 - dy * 22 * side;
    const cy = (ly + ey) / 2 + dx * 22 * side;
    placed.push({ label, tx, ty, lx, ly, cx, cy, ex, ey, edge, left: r.left, bx: r.right - 2, by: r.top + 2 });
  });
  // Right-hand rail: one tidy column of labels, never stacked on top of each other
  const rail = placed.filter((item) => item.edge === "right").sort((a, b) => a.ty - b.ty);
  const railX = Math.min(...rail.map((item) => item.left ?? vw)) - 80;
  let prev = -Infinity;
  for (const item of rail) {
    item.lx = railX;
    item.ly = Math.max(item.ty + 12, prev + 30);
    prev = item.ly;
    item.ex = (item.left ?? item.tx) - 4;
    item.ey = item.ty;
    item.cx = (item.lx + 40 + item.ex) / 2;
    item.cy = item.ly;
  }
  return placed;
}

/** "How it works" overlay. Any click anywhere closes it and still reaches what was clicked. */
export function NapkinHelp({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<Placed[]>([]);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const update = () => {
      setItems(layout());
      setCompact(window.innerWidth < 640 || window.innerHeight < 560);
    };
    update();
    const close = () => onClose();
    const key = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("resize", update);
    window.addEventListener("pointerdown", close, true);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("pointerdown", close, true);
      window.removeEventListener("keydown", key);
    };
  }, [onClose]);

  if (compact) {
    return (
      <div className="pointer-events-none fixed inset-0 z-[70] bg-background/75 text-primary" role="dialog" aria-label="How Napkin works">
        {items.map((item, i) => (
          <span
            key={item.label}
            className="absolute grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground shadow"
            style={{ left: item.bx, top: item.by }}
          >
            {i + 1}
          </span>
        ))}
        <div className="absolute left-1/2 top-[12%] w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 text-center" style={{ fontFamily: "Caveat, cursive" }}>
          <p className="-rotate-3 text-4xl font-bold">Welcome to Napkin!</p>
          <p className="mt-1 text-lg text-foreground/80">tap anywhere to start</p>
          <ol className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 rounded-2xl bg-background/85 p-3 text-left text-lg leading-tight">
            {items.map((item, i) => (
              <li key={item.label} className="flex min-w-0 items-center gap-2">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary font-sans text-[11px] font-bold text-primary-foreground">{i + 1}</span>
                <span className="truncate">{item.label}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] bg-background/70 text-primary" role="dialog" aria-label="How Napkin works">
      <svg className="absolute inset-0 size-full" aria-hidden="true">
        <defs>
          <marker id="napkin-help-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M1 1 L8 5 L1 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        </defs>
        {items.map((item) => (
          <path
            key={item.label}
            d={`M${item.edge === "right" ? item.lx + 42 : item.lx} ${item.ly} Q${item.cx} ${item.cy} ${item.ex} ${item.ey}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            markerEnd="url(#napkin-help-arrow)"
          />
        ))}
      </svg>
      {items.map((item) => (
        <span
          key={item.label}
          className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-background/80 px-1.5 text-lg leading-tight"
          style={{ left: item.lx, top: item.ly, fontFamily: "Caveat, cursive" }}
        >
          {item.label}
        </span>
      ))}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center" style={{ fontFamily: "Caveat, cursive" }}>
        <p className="-rotate-3 text-4xl font-bold sm:text-5xl">Welcome to Napkin!</p>
        <p className="mt-1 text-lg text-foreground/80">tap anywhere to start</p>
      </div>
    </div>
  );
}
