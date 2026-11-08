import { useEffect, useState } from "react";
import {
  Clock3,
  Image as ImageIcon,
  Link2,
  MessageCircle,
  MousePointer2,
  PenLine,
  Plus,
  Type,
} from "lucide-react";

const DAY = 24 * 3600;

const PEERS = [
  { name: "Daffy-02", color: "#FFD60A", className: "wt-cursor-a" },
  { name: "GIR-04", color: "#63E6BE", className: "wt-cursor-b" },
] as const;

const TOOLS = [
  { Icon: PenLine, label: "Pen" },
  { Icon: Type, label: "Text" },
  { Icon: ImageIcon, label: "Image" },
  { Icon: MessageCircle, label: "Chat" },
];

function formatClock(total: number) {
  return [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div className="wt-stage relative flex h-40 flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border border-white/10 bg-[#0c0c0e]">
      {children}
    </div>
  );
}

function BoardGrid() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 grid grid-cols-3 grid-rows-3 place-items-center"
    >
      {Array.from({ length: 9 }).map((_, index) => (
        <span
          key={index}
          className="size-1 rounded-full bg-white/15"
          style={{ opacity: index === 4 ? 0.35 : 1 }}
        />
      ))}
    </div>
  );
}

function VisualCreate() {
  return (
    <Stage>
      <span className="wt-tap grid size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg">
        <Plus className="size-6" />
      </span>
      <span className="wt-code rounded-full border border-white/15 bg-black/45 px-3 py-1 font-mono text-xs tracking-widest text-white/85">
        ABCD123
      </span>
      <span className="wt-link flex items-center gap-1.5 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[11px] text-white/60">
        <Link2 className="size-3.5 text-primary" /> napkin.lol/room/ABCD123
      </span>
    </Stage>
  );
}

function VisualCollaborate() {
  return (
    <Stage>
      <BoardGrid />
      <svg
        aria-hidden
        viewBox="0 0 100 100"
        className="absolute inset-0 size-full"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          className="wt-draw"
          d="M18 62 C 28 52, 38 70, 48 58 C 56 49, 64 62, 78 52"
          stroke="#FFD60A"
          strokeWidth="2.6"
        />
        <path
          className="wt-draw wt-draw-2"
          d="M60 30 C 65 24, 72 25, 74 31 C 76 37, 70 42, 64 40 C 58 38, 56 33, 60 30"
          stroke="#C084FC"
          strokeWidth="2.2"
        />
      </svg>
      {PEERS.map((peer) => (
        <div
          key={peer.name}
          className={`pointer-events-none absolute flex items-start gap-1 text-[11px] font-semibold ${peer.className}`}
        >
          <MousePointer2
            className="size-4 drop-shadow"
            style={{ fill: peer.color, color: peer.color }}
          />
          <span
            className="rounded-full px-1.5 py-0.5 leading-none"
            style={{ backgroundColor: peer.color, color: "#0b0b0c" }}
          >
            {peer.name}
          </span>
        </div>
      ))}
    </Stage>
  );
}

function VisualTools() {
  return (
    <Stage>
      <div className="flex gap-2.5">
        {TOOLS.map(({ Icon, label }, index) => (
          <span
            key={label}
            className="wt-tile flex size-11 flex-col items-center justify-center gap-0.5 rounded-xl border border-white/12 text-white/70"
            style={{ animationDelay: `${index * 1.5}s` }}
          >
            <Icon className="size-4.5" />
            <span className="text-[8px] leading-none">{label}</span>
          </span>
        ))}
      </div>
      <span className="text-[11px] text-white/45">one shared canvas</span>
    </Stage>
  );
}

function VisualEvaporate() {
  const [seconds, setSeconds] = useState(DAY);

  useEffect(() => {
    const timer = window.setInterval(
      () => setSeconds((left) => (left > 0 ? left - 1 : DAY)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, []);

  return (
    <Stage>
      <BoardGrid />
      <svg
        aria-hidden
        viewBox="0 0 100 100"
        className="wt-vanish absolute inset-0 size-full"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d="M20 55 C 30 45, 40 63, 50 51 C 58 42, 66 55, 80 45"
          stroke="#FFD60A"
          strokeWidth="2.6"
        />
        <path
          d="M24 68 L58 68"
          stroke="#63E6BE"
          strokeWidth="2.4"
        />
        <path
          d="M24 76 L48 76"
          stroke="#C084FC"
          strokeWidth="2.4"
        />
      </svg>
      <span className="wt-vanish text-[11px] text-white/45">everything on the board</span>
      <span aria-hidden className="wt-ember left-[30%] bottom-[42%] absolute size-1.5 rounded-full bg-white/50" />
      <span aria-hidden className="wt-ember left-[52%] bottom-[38%] absolute size-1 rounded-full bg-white/40" style={{ animationDelay: "0.6s" }} />
      <span aria-hidden className="wt-ember left-[68%] bottom-[46%] absolute size-1.5 rounded-full bg-white/35" style={{ animationDelay: "1.1s" }} />
      <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/45 px-2.5 py-1.5 text-[11px] font-medium tabular-nums text-white/80 backdrop-blur-md">
        <Clock3 className="size-3.5 text-[#FFD60A]" />
        {formatClock(seconds)}
      </div>
    </Stage>
  );
}

const STEPS = [
  { number: "01", title: "Create", copy: "Tap plus. A private room opens instantly — no account, just a code.", Visual: VisualCreate },
  { number: "02", title: "Share & draw", copy: "Send the link or code. Everyone draws, types, and chats live together.", Visual: VisualCollaborate },
  { number: "03", title: "Pick your tool", copy: "Pen, text, images, and chat — all on one shared canvas.", Visual: VisualTools },
  { number: "04", title: "Gone in 24 hours", copy: "Napkins evaporate after a day. Export anything you want to keep.", Visual: VisualEvaporate },
];

export function NapkinWalkthrough() {
  return (
    <section
      className="mx-auto w-full max-w-6xl py-24"
      aria-labelledby="walkthrough-title"
    >
      <p className="text-sm font-medium text-primary">How it works</p>
      <h2 id="walkthrough-title" className="mt-3 max-w-2xl text-4xl font-semibold text-balance sm:text-5xl">
        From blank page to gone in one day
      </h2>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
        One Napkin, start to finish.
      </p>
      <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(({ number, title, copy, Visual }) => (
          <li
            key={number}
            className="overflow-hidden rounded-2xl border border-border bg-background/80 backdrop-blur-xl"
          >
            <Visual />
            <div className="p-5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-primary">{number}</span>
                <h3 className="text-lg font-semibold">{title}</h3>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
