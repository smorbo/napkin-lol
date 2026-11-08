/**
 * Facilitation frameworks that can be dropped onto a board as scalable line art.
 * Each template renders to an SVG string in the board's ink colour, so it reads
 * clearly on both the black and white boards without drowning out people's ink.
 */

export type BoardTemplate = {
  id: string;
  name: string;
  blurb: string;
  width: number;
  height: number;
  /** Returns the inner SVG markup drawn with `ink` as the stroke/fill colour. */
  draw: (ink: string) => string;
};

function label(x: number, y: number, text: string, ink: string, size = 26, anchor = "middle") {
  return `<text x="${x}" y="${y}" fill="${ink}" font-family="Inter, Helvetica, Arial, sans-serif" font-size="${size}" font-weight="600" text-anchor="${anchor}" opacity="0.85">${text}</text>`;
}

const PETALS = [
  "Technology",
  "Customers",
  "Culture",
  "Economy",
  "Policy",
  "Environment",
  "Competitors",
  "Uncertainties",
];

export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    id: "petals",
    name: "8-Petal Diagram",
    blurb: "Map eight forces around one central question.",
    width: 1000,
    height: 1000,
    draw: (ink) => {
      const cx = 500;
      const cy = 500;
      const petals = PETALS.map((name, index) => {
        const angle = (index / 8) * Math.PI * 2 - Math.PI / 2;
        const px = cx + Math.cos(angle) * 300;
        const py = cy + Math.sin(angle) * 300;
        const lx = cx + Math.cos(angle) * 150;
        const ly = cy + Math.sin(angle) * 150;
        const tx = cx + Math.cos(angle) * 300;
        const ty = cy + Math.sin(angle) * 300 + 6;
        return `<line x1="${lx}" y1="${ly}" x2="${px - Math.cos(angle) * 130}" y2="${py - Math.sin(angle) * 130}" stroke="${ink}" stroke-width="3" opacity="0.4" />
<circle cx="${px}" cy="${py}" r="128" fill="none" stroke="${ink}" stroke-width="4" opacity="0.7" />
${label(tx, ty, name, ink, 28)}`;
      }).join("\n");
      return `${petals}
<circle cx="${cx}" cy="${cy}" r="120" fill="none" stroke="${ink}" stroke-width="6" />
${label(cx, cy + 8, "Core question", ink, 30)}`;
    },
  },
  {
    id: "janus",
    name: "Janus Cone",
    blurb: "Look as far back as you look forward.",
    width: 1400,
    height: 900,
    draw: (ink) => {
      const cx = 700;
      const cy = 450;
      const rings = [180, 340, 500, 660]
        .map(
          (r, index) =>
            `<line x1="${cx - r}" y1="60" x2="${cx - r}" y2="840" stroke="${ink}" stroke-width="2" stroke-dasharray="10 12" opacity="0.35" />
<line x1="${cx + r}" y1="60" x2="${cx + r}" y2="840" stroke="${ink}" stroke-width="2" stroke-dasharray="10 12" opacity="0.35" />
${label(cx - r, 880, `-${(index + 1) * 10} yrs`, ink, 22)}
${label(cx + r, 880, `+${(index + 1) * 10} yrs`, ink, 22)}`,
        )
        .join("\n");
      return `${rings}
<path d="M ${cx} ${cy} L 40 90 L 40 810 Z" fill="none" stroke="${ink}" stroke-width="5" opacity="0.8" />
<path d="M ${cx} ${cy} L 1360 90 L 1360 810 Z" fill="none" stroke="${ink}" stroke-width="5" opacity="0.8" />
<line x1="${cx}" y1="60" x2="${cx}" y2="840" stroke="${ink}" stroke-width="4" />
<circle cx="${cx}" cy="${cy}" r="14" fill="${ink}" />
${label(300, 50, "What shaped us", ink, 30)}
${label(1100, 50, "What could come", ink, 30)}
${label(cx, 40, "Today", ink, 26)}`;
    },
  },
  {
    id: "horizons",
    name: "Horizon Map",
    blurb: "Today's core, tomorrow's bets, the far future.",
    width: 1400,
    height: 900,
    draw: (ink) => `
<line x1="90" y1="780" x2="1340" y2="780" stroke="${ink}" stroke-width="4" />
<line x1="90" y1="780" x2="90" y2="90" stroke="${ink}" stroke-width="4" />
<path d="M 90 220 C 420 230 620 420 760 780" fill="none" stroke="${ink}" stroke-width="6" opacity="0.85" />
<path d="M 300 780 C 560 660 720 300 1130 250" fill="none" stroke="${ink}" stroke-width="6" stroke-dasharray="16 12" opacity="0.8" />
<path d="M 700 780 C 980 740 1120 450 1340 160" fill="none" stroke="${ink}" stroke-width="6" stroke-dasharray="4 14" opacity="0.8" />
${label(280, 160, "H1 · Core today", ink, 30)}
${label(760, 210, "H2 · Emerging bets", ink, 30)}
${label(1130, 420, "H3 · Transformation", ink, 30)}
${label(715, 850, "Time", ink, 26)}
<text x="50" y="440" fill="${ink}" font-family="Inter, Helvetica, Arial, sans-serif" font-size="26" font-weight="600" opacity="0.85" text-anchor="middle" transform="rotate(-90 50 440)">Value</text>`,
  },
  {
    id: "matrix",
    name: "2×2 Matrix",
    blurb: "Sort ideas by impact and effort.",
    width: 1100,
    height: 1100,
    draw: (ink) => `
<rect x="80" y="80" width="940" height="940" fill="none" stroke="${ink}" stroke-width="5" rx="18" />
<line x1="550" y1="80" x2="550" y2="1020" stroke="${ink}" stroke-width="4" />
<line x1="80" y1="550" x2="1020" y2="550" stroke="${ink}" stroke-width="4" />
${label(315, 130, "Quick wins", ink, 28)}
${label(785, 130, "Big bets", ink, 28)}
${label(315, 1000, "Nice to have", ink, 28)}
${label(785, 1000, "Money pit", ink, 28)}
${label(550, 50, "High impact", ink, 26)}
${label(550, 1075, "Low impact", ink, 26)}
<text x="40" y="550" fill="${ink}" font-family="Inter, Helvetica, Arial, sans-serif" font-size="26" font-weight="600" opacity="0.85" text-anchor="middle" transform="rotate(-90 40 550)">Low effort</text>
<text x="1062" y="550" fill="${ink}" font-family="Inter, Helvetica, Arial, sans-serif" font-size="26" font-weight="600" opacity="0.85" text-anchor="middle" transform="rotate(90 1062 550)">High effort</text>`,
  },
  {
    id: "empathy",
    name: "Empathy Map",
    blurb: "Says, thinks, does, feels — in one view.",
    width: 1200,
    height: 1000,
    draw: (ink) => `
<rect x="60" y="60" width="1080" height="880" fill="none" stroke="${ink}" stroke-width="5" rx="18" />
<line x1="600" y1="60" x2="600" y2="940" stroke="${ink}" stroke-width="4" />
<line x1="60" y1="500" x2="1140" y2="500" stroke="${ink}" stroke-width="4" />
<circle cx="600" cy="500" r="110" fill="none" stroke="${ink}" stroke-width="6" />
${label(600, 510, "Person", ink, 30)}
${label(330, 120, "Says", ink, 30)}
${label(870, 120, "Thinks", ink, 30)}
${label(330, 910, "Does", ink, 30)}
${label(870, 910, "Feels", ink, 30)}`,
  },
  {
    id: "timeline",
    name: "Milestone Timeline",
    blurb: "Lay a plan or retro out in order.",
    width: 1400,
    height: 620,
    draw: (ink) => {
      const marks = [220, 460, 700, 940, 1180]
        .map(
          (x, index) => `<circle cx="${x}" cy="310" r="18" fill="${ink}" />
<line x1="${x}" y1="310" x2="${x}" y2="${index % 2 === 0 ? 180 : 440}" stroke="${ink}" stroke-width="3" opacity="0.5" />
${label(x, index % 2 === 0 ? 160 : 480, `Step ${index + 1}`, ink, 26)}`,
        )
        .join("\n");
      return `<line x1="80" y1="310" x2="1320" y2="310" stroke="${ink}" stroke-width="5" />
<path d="M 1320 310 l -26 -16 l 0 32 Z" fill="${ink}" />
${marks}`;
    },
  },
];

/** Full SVG document for a template, ready to rasterise or preview. */
export function templateSvg(template: BoardTemplate, ink: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${template.width} ${template.height}" width="${template.width}" height="${template.height}"><g stroke-linecap="round" stroke-linejoin="round">${template.draw(ink)}</g></svg>`;
}

/** Rasterise a template to a transparent PNG so it syncs like any other picture. */
export async function templatePng(template: BoardTemplate, ink: string, scale = 2): Promise<Blob> {
  const svg = templateSvg(template, ink);
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const image = new Image();
    image.decoding = "sync";
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("template render failed"));
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = template.width * scale;
    canvas.height = template.height * scale;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("no canvas context");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("no blob"))), "image/png"),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
