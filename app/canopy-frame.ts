import assets from "./canopy-layers.json";

const [artWidth, artHeight] = assets.size;

export function canopyFrame(width: number, height: number) {
  const scale = Math.max(width / artWidth, height / artHeight);
  return {
    scale,
    left: (width - artWidth * scale) * (width <= 639 ? 0.78 : 0.5),
    top: (height - artHeight * scale) * 0.5,
  };
}
