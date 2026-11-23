export function createLeafHitTest() {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  const masks = new WeakMap<HTMLImageElement, Uint8Array>();
  return (image: HTMLImageElement, bounds: number[], x: number, y: number) => {
    const [left, top, width, height] = bounds;
    const u = (x - left) / width, v = (y - top) / height;
    if (u < 0 || u >= 1 || v < 0 || v >= 1) return false;
    const columns = image.naturalWidth, rows = image.naturalHeight;

    // Keep one bit per texel, allocated only when a pointer enters this image.
    let mask = masks.get(image);
    if (!mask) {
      canvas.width = columns;
      canvas.height = rows;
      context.drawImage(image, 0, 0);
      const { data } = context.getImageData(0, 0, columns, rows);
      mask = new Uint8Array(Math.ceil(columns * rows / 8));
      for (let index = 0; index < columns * rows; index++) {
        if (data[index * 4 + 3] >= 128) mask[index >> 3] |= 1 << (index & 7);
      }
      masks.set(image, mask);
      canvas.width = canvas.height = 1;
    }

    const index = Math.floor(v * rows) * columns + Math.floor(u * columns);
    return (mask[index >> 3] & (1 << (index & 7))) !== 0;
  };
}
