import type { CSSProperties } from "react";

/**
 * Loading mark: the Napkin logo drawn in stroke by stroke — the stacked
 * napkins first, then the smiley face on the front one.
 */
export function NapkinDraw({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`napkin-draw ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="32"
        y="10"
        width="52"
        height="52"
        rx="6"
        style={{ strokeDasharray: 230, strokeDashoffset: 230, animationDelay: "0s", ["--dash" as string]: "230" } as CSSProperties}
      />
      <rect
        x="24"
        y="20"
        width="52"
        height="52"
        rx="6"
        style={{ strokeDasharray: 230, strokeDashoffset: 230, animationDelay: "0.4s", ["--dash" as string]: "230" } as CSSProperties}
      />
      <rect
        className="napkin-front"
        x="16"
        y="30"
        width="56"
        height="56"
        rx="7"
        style={{ strokeDasharray: 248, strokeDashoffset: 248, animationDelay: "0.8s", ["--dash" as string]: "248" } as CSSProperties}
      />
      <path
        className="napkin-face napkin-eye"
        d="M32 54 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0"
        style={{ animationDelay: "1.5s" } as CSSProperties}
      />
      <path
        className="napkin-face napkin-eye"
        d="M50 54 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0"
        style={{ animationDelay: "1.6s" } as CSSProperties}
      />
      <path
        className="napkin-face napkin-smile"
        d="M28 66 C34 78 54 80 61 65"
        style={{ animationDelay: "1.7s" } as CSSProperties}
      />
    </svg>
  );
}
