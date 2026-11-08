export function generateRoomId() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "0123456789";
  const pick = (characters: string, length: number) =>
    Array.from({ length }, () => characters[Math.floor(Math.random() * characters.length)]).join(
      "",
    );
  return `${pick(letters, 4)}${pick(digits, 3)}`;
}

const CHARACTER_IDENTITIES = [
  ["Ren", "#E6C280"], ["Stimpy", "#D92B36"], ["Lion-O", "#D47043"],
  ["She-Ra", "#F2C249"], ["He-Man", "#EBB075"], ["Skeletor", "#4F4588"],
  ["Homer", "#FFD90F"], ["Krusty", "#1BA56A"], ["Doofenshmirtz", "#C4C7C2"],
  ["Scooby", "#875224"], ["Shaggy", "#8E9D27"], ["Plankton", "#2B7A4A"],
  ["SpongeBob", "#FCE22A"], ["Patrick", "#F699A6"], ["Squidward", "#87B3A6"],
  ["Mr. Krabs", "#C90016"], ["Cartman", "#E5312C"], ["Kenny", "#F17A16"],
  ["Butters", "#77B4A0"], ["Bender", "#A6A7AC"], ["Zoidberg", "#D34547"],
  ["Fry", "#D74823"], ["Leela", "#7D3C98"], ["Farnsworth", "#F9E4B7"],
  ["Dexter", "#E8E8E8"], ["DeeDee", "#F5A4C5"], ["Mandark", "#2C1844"],
  ["Mojo Jojo", "#77B03D"], ["Bubbles", "#59A0D6"], ["Blossom", "#F56C7D"],
  ["Buttercup", "#6FBD50"], ["Johnny Bravo", "#FFE066"], ["Courage", "#D092C5"],
  ["Eustace", "#8B7355"], ["Muriel", "#6B8E23"], ["Ed", "#FFCC00"],
  ["Edd", "#222222"], ["Eddy", "#E74C3C"], ["Rolf", "#4CAF50"],
  ["Plank", "#DEB887"], ["Pikachu", "#F4D03F"], ["Charizard", "#E67E22"],
  ["Gengar", "#8E44AD"], ["Mewtwo", "#D2B4DE"], ["Jigglypuff", "#F5B7B1"],
  ["Psyduck", "#F1C40F"], ["Meowth", "#F5CBA7"], ["Magikarp", "#E74C3C"],
  ["Togepi", "#FDEDEC"], ["Bulbasaur", "#73C6B6"], ["Squirtle", "#85C1E9"],
  ["Snorlax", "#2E4053"], ["Wile E.", "#8B4513"], ["Roadrunner", "#3498DB"],
  ["Bugs", "#BDC3C7"], ["Daffy", "#17202A"], ["Porky", "#F5B7B1"],
  ["Marvin", "#27AE60"], ["Taz", "#A04000"], ["Sylvester", "#111111"],
  ["Tweety", "#F1C40F"], ["Foghorn", "#E67E22"], ["Gossamer", "#C0392B"],
  ["Brain", "#FEF9E7"], ["Pinky", "#FADBD8"], ["Wakko", "#1F618D"],
  ["Yakko", "#AAB7B8"], ["Dot", "#F1948A"], ["Freakazoid", "#E74C3C"],
  ["Zim", "#2ECC71"], ["GIR", "#52BE80"], ["Dib", "#34495E"],
  ["Gaz", "#8E44AD"], ["CatDog", "#E67E22"], ["Winslow", "#3498DB"],
  ["Rocko", "#D35400"], ["Heffer", "#F4D03F"], ["Filburt", "#27AE60"],
  ["Spunky", "#BDC3C7"], ["Arnold", "#F1C40F"], ["Helga", "#F1948A"],
  ["Gerald", "#E74C3C"], ["Reptar", "#2ECC71"], ["Chuckie", "#E67E22"],
  ["Tommy", "#3498DB"], ["Angelica", "#8E44AD"], ["Nigel", "#E67E22"],
  ["Donnie", "#BDC3C7"], ["Darwin", "#E67E22"], ["Gumball", "#5DADE2"],
  ["Finn", "#FCF3CF"], ["Jake", "#F1C40F"], ["BMO", "#73C6B6"],
  ["Marceline", "#34495E"], ["Ice King", "#AED6F1"], ["Rigby", "#A04000"],
  ["Mordecai", "#5DADE2"], ["Muscle Man", "#7DCEA0"], ["Skips", "#FADBD8"],
] as const;

export const COLORS = [...new Set(CHARACTER_IDENTITIES.map(([, color]) => color))];

/** The eight chakra-inspired swatches offered in the colour picker. */
export const CHAKRA_COLORS = [
  { name: "Root", value: "#E23B2E" },
  { name: "Sacral", value: "#F2802A" },
  { name: "Solar", value: "#F5C518" },
  { name: "Heart", value: "#35B36B" },
  { name: "Throat", value: "#2FA9D8" },
  { name: "Third eye", value: "#3C4EA8" },
  { name: "Crown", value: "#8A4FBF" },
  { name: "Aura", value: "#F2F2F2" },
] as const;

export type Identity = { id: string; name: string; color: string };

let cached: Identity | null = null;

export function getIdentity(): Identity {
  if (cached) return cached;
  if (typeof window === "undefined") {
    return { id: "server", name: "Ren-01", color: COLORS[0] ?? "#E6C280" };
  }
  const stored =
    window.sessionStorage.getItem("napkin-identity") ??
    window.sessionStorage.getItem("sandbox-identity");
  if (stored) {
    cached = JSON.parse(stored) as Identity;
    return cached;
  }
  const character =
    CHARACTER_IDENTITIES[Math.floor(Math.random() * CHARACTER_IDENTITIES.length)] ??
    CHARACTER_IDENTITIES[0];
  const suffixLength = 1 + Math.floor(Math.random() * 3);
  const suffix = Math.floor(Math.random() * 10 ** suffixLength)
    .toString()
    .padStart(suffixLength, "0");
  const identity: Identity = {
    id: crypto.randomUUID(),
    name: `${character[0]}-${suffix}`,
    color: character[1],
  };
  window.sessionStorage.setItem("napkin-identity", JSON.stringify(identity));
  cached = identity;
  return identity;
}

export function adoptIdentityId(id: string): Identity {
  const next: Identity = { ...getIdentity(), id };
  cached = next;
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem("napkin-identity", JSON.stringify(next));
  }
  return next;
}

export function setIdentity(update: { name: string; color: string }): Identity {
  const base = getIdentity();
  const next: Identity = { ...base, name: update.name.trim() || base.name, color: update.color };
  cached = next;
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem("napkin-identity", JSON.stringify(next));
  }
  return next;
}

export type ImageFrame = { x: number; y: number; w: number; h: number; rotation?: number };
export type StrokePayload = {
  color: string;
  width?: number;
  points: { x: number; y: number }[];
  parent?: string;
  base?: ImageFrame;
  sid?: string;
};
export type ImagePayload = {
  path: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
  locked?: boolean;
};
export type TextFont = "sketch" | "type";
export type TextPayload = {
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
  rotation?: number;
  locked?: boolean;
  font?: TextFont;
};

/** Canvas font stacks for handwritten vs typed text boxes. */
export function textFontStack(font: TextFont | undefined, size: number) {
  return font === "type"
    ? `600 ${size}px "DM Sans", Inter, Arial, sans-serif`
    : `700 ${size}px Caveat, "Segoe Script", cursive`;
}
export type ObjectKind = "stroke" | "image" | "text";
export type CanvasObject = {
  id: string;
  author_id?: string | null;
  kind: ObjectKind;
  payload: StrokePayload | ImagePayload | TextPayload;
};

export const BOARD_BG: Record<"dark" | "light", string> = {
  dark: "#12141c",
  light: "#f5f7fb",
};

function parseHex(color: string): [number, number, number] | null {
  const value = color.trim().replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function toHex(rgb: [number, number, number]) {
  return `#${rgb
    .map((v) =>
      Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/** Perceived luminance, 0 (black) to 1 (white). */
export function luminance(color: string) {
  const rgb = parseHex(color);
  if (!rgb) return 0.5;
  const [r, g, b] = rgb;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function mix(color: string, target: [number, number, number], amount: number) {
  const rgb = parseHex(color);
  if (!rgb) return color;
  return toHex([
    rgb[0] + (target[0] - rgb[0]) * amount,
    rgb[1] + (target[1] - rgb[1]) * amount,
    rgb[2] + (target[2] - rgb[2]) * amount,
  ]);
}

/**
 * Keep a person's chosen colour visible on the current board: pure white on a
 * light board (or pure black on a dark board) is nudged until it reads.
 */
export function readableInk(color: string, theme: "dark" | "light") {
  const light = luminance(color);
  if (theme === "dark" && light < 0.32) {
    return mix(color, [255, 255, 255], (0.32 - light) / 0.32);
  }
  if (theme === "light" && light > 0.7) {
    return mix(color, [0, 0, 0], (light - 0.7) / 0.3);
  }
  return color;
}

/** Text colour that stays readable on top of the given colour. */
export function onColor(color: string) {
  return luminance(color) > 0.6 ? "#12141c" : "#ffffff";
}
