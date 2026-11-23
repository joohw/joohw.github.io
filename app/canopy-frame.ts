import assets from "./canopy-layers.json";

const [artWidth, artHeight] = assets.size;
export const maxCanopyBend = 16;
const margin = maxCanopyBend + 1;

export function canopyFrame(width: number, height: number) {
  const safeWidth = artWidth - margin * 2;
  const safeHeight = artHeight - margin * 2;
  const scale = Math.max(width / safeWidth, height / safeHeight);
  return {
    scale,
    left: (width - safeWidth * scale) * (width <= 639 ? 0.78 : 0.5) - margin * scale,
    top: (height - safeHeight * scale) * 0.5 - margin * scale,
  };
}
