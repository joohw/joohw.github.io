import assets from "./canopy-layers.json";

const [artWidth, artHeight] = assets.size;
export const maxCanopyBend = 30;
export const edgeBend = 16;
const margin = edgeBend + 1;

export function canopyFrame(width: number, height: number) {
  const safeWidth = artWidth - margin * 2;
  const safeHeight = artHeight - margin * 2;
  const scale = Math.max(width / safeWidth, height / safeHeight);
  // Keep the phone's right-biased crop and ease into the centered desktop crop.
  const t = Math.max(0, Math.min(1, (width - 480) / (960 - 480)));
  const anchor = 0.78 - 0.28 * t * t * (3 - 2 * t);
  return {
    scale,
    left: (width - safeWidth * scale) * anchor - margin * scale,
    top: (height - safeHeight * scale) * 0.5 - margin * scale,
  };
}
