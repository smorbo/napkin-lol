import { useEffect, useState } from "react";
import { Clock3, MousePointer2 } from "lucide-react";

const DAY = 24 * 3600;

// Peer identities mirror what a real Napkin hands out: roster name + colour.
const PEERS = [
  { name: "Daffy-02", color: "#FFD60A", className: "demo-cursor-a" },
  { name: "GIR-04", color: "#63E6BE", className: "demo-cursor-b" },
] as const;

function formatClock(total: number) {
  return [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

// A miniature Napkin that explains itself: the board draws a greeting while
// two guests move around and drop a chat message, with the 24-hour clock
// ticking in the corner. Static under reduced-motion preferences.
export function NapkinDemo() {
  const [seconds, setSeconds] = useState(23 * 3600 + 58 * 60 + 41);

  useEffect(() => {
    const timer = window.setInterval(
      () => setSeconds((left) => (left > 0 ? left - 1 : DAY)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0e] shadow-[0_30px_90px_-30px_rgba(250,204,21,0.28)]">
        {/* Three-by-three board grid */}
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

        {/* The doodle, drawn stroke by stroke */}
        <svg
          aria-hidden
          viewBox="0 0 100 100"
          className="absolute inset-0 size-full"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Sun */}
          <path
            className="demo-draw"
            d="M20 11 C 25 9.5, 29.5 13.5, 28.5 18.5 C 27.5 23.5, 22 25.5, 17 23 C 12.5 20.5, 12.5 14, 16.5 11.5"
            stroke="#FFD60A"
            strokeWidth="2.4"
          />
          <path
            className="demo-draw demo-draw-2"
            d="M20 5.5 L20 7.5 M11.5 17 L9.5 17 M28.5 17 L30.5 17 M13.5 9.5 L11.5 7.5 M26.5 9.5 L28.5 7.5"
            stroke="#FFD60A"
            strokeWidth="2"
          />
          {/* Arrow from the sun toward the greeting */}
          <path
            className="demo-draw demo-draw-3"
            d="M33 22 C 45 16, 57 17, 64 23 M59.5 19 L64 23 L58.5 26.5"
            stroke="#C084FC"
            strokeWidth="2"
          />
          {/* Handwritten greeting */}
          <text
            x="67"
            y="36"
            className="demo-fade demo-fade-1"
            fill="#FFD60A"
            fontFamily="Caveat, cursive"
            fontSize="15"
          >
            hi!
          </text>
          {/* Wavy underline */}
          <path
            className="demo-draw demo-draw-4"
            d="M15 48 C 25 43.5, 34 52, 44 47.5 C 54 43, 64 51.5, 74 47"
            stroke="#63E6BE"
            strokeWidth="2.6"
          />
          {/* Smiley */}
          <path
            className="demo-draw demo-draw-5"
            d="M77 66 C 83 66, 87.5 70.5, 87 76.5 C 86.5 82.5, 81 86.5, 75 85.5 C 69 84.5, 65.5 79, 66.5 73 C 67.5 68, 71.5 66, 77 66"
            stroke="#FFD60A"
            strokeWidth="2.4"
          />
          <g className="demo-fade demo-fade-2">
            <circle cx="74" cy="74" r="1.3" fill="#FFD60A" />
            <circle cx="82" cy="74" r="1.3" fill="#FFD60A" />
          </g>
          <path
            className="demo-fade demo-fade-3"
            d="M71.5 79.5 C 74.5 82.5, 80 82.5, 83 79"
            stroke="#FFD60A"
            strokeWidth="2.2"
          />
        </svg>

        {/* Guests moving around the board */}
        {PEERS.map((peer) => (
          <div
            key={peer.name}
            className={`demo-peer pointer-events-none absolute flex items-start gap-1 text-[11px] font-semibold ${peer.className}`}
            style={{ left: peer.className === "demo-cursor-a" ? "14%" : "68%", top: peer.className === "demo-cursor-a" ? "26%" : "62%" }}
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

        {/* Chat message popping in */}
        <div className="demo-bubble absolute bottom-4 left-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/45 py-1.5 pl-1.5 pr-3 backdrop-blur-md">
          <span
            className="size-5 rounded-full"
            style={{ backgroundColor: "#63E6BE" }}
          />
          <span className="text-[11px] leading-none text-white/90">
            <span className="font-semibold">GIR-04</span> hi!!
          </span>
        </div>

        {/* The 24-hour clock, always ticking */}
        <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/45 px-2.5 py-1.5 text-[11px] font-medium tabular-nums text-white/80 backdrop-blur-md">
          <Clock3 className="size-3.5 text-[#FFD60A]" />
          {formatClock(seconds)}
        </div>
      </div>

      <p className="mt-4 text-balance text-center text-sm text-muted-foreground">
        This is a Napkin — draw together, chat, and watch the clock.
        When it hits zero, everything evaporates.
      </p>
    </div>
  );
}
