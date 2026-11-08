import { decompressFrames, parseGIF } from "gifuct-js";

export type GifAnimation = { frames: HTMLCanvasElement[]; delays: number[]; total: number };

export async function loadGif(url: string): Promise<GifAnimation | null> {
  try {
    const buffer = await (await fetch(url)).arrayBuffer();
    const gif = parseGIF(buffer);
    const parts = decompressFrames(gif, true);
    if (!parts.length) return null;
    const width = gif.lsd.width;
    const height = gif.lsd.height;
    const work = document.createElement("canvas");
    work.width = width;
    work.height = height;
    const ctx = work.getContext("2d")!;
    const patch = document.createElement("canvas");
    const patchCtx = patch.getContext("2d")!;
    const frames: HTMLCanvasElement[] = [];
    const delays: number[] = [];
    for (const part of parts) {
      const { dims } = part;
      const before = part.disposalType === 3 ? ctx.getImageData(0, 0, width, height) : null;
      patch.width = dims.width;
      patch.height = dims.height;
      const data = patchCtx.createImageData(dims.width, dims.height);
      data.data.set(part.patch);
      patchCtx.putImageData(data, 0, 0);
      ctx.drawImage(patch, dims.left, dims.top);
      const snap = document.createElement("canvas");
      snap.width = width;
      snap.height = height;
      snap.getContext("2d")!.drawImage(work, 0, 0);
      frames.push(snap);
      delays.push(Math.max(part.delay || 100, 20));
      if (part.disposalType === 2) ctx.clearRect(dims.left, dims.top, dims.width, dims.height);
      else if (before) ctx.putImageData(before, 0, 0);
    }
    return { frames, delays, total: delays.reduce((a, b) => a + b, 0) };
  } catch {
    return null;
  }
}

export function frameAt(gif: GifAnimation, time: number): HTMLCanvasElement {
  let t = time % gif.total;
  for (let i = 0; i < gif.frames.length; i++) {
    t -= gif.delays[i]!;
    if (t < 0) return gif.frames[i]!;
  }
  return gif.frames[0]!;
}
