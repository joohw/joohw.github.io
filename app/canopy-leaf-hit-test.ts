import type assets from "./canopy-layers.json";

type Leaf = typeof assets.leaves[number];

export function createLeafHitTest(atlas: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  canvas.width = atlas.naturalWidth;
  canvas.height = atlas.naturalHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(atlas, 0, 0);
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);

  return ({ bounds: [left, top, width, height], atlas: [u, v] }: Leaf, x: number, y: number) => {
    const column = Math.floor(x - left), row = Math.floor(y - top);
    if (column < 0 || row < 0 || column >= width || row >= height) return false;
    return data[4 * ((v + row) * canvas.width + u + column) + 3] >= 128;
  };
}
