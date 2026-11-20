import layers from "./canopy-layers.json";

export const artWidth = 1672;
export const artHeight = 941;
export const vertexStride = 11;

export function canopyFrame(width: number, height: number) {
  const scale = Math.max(width / artWidth, height / artHeight);
  const left = (width - artWidth * scale) * (width <= 639 ? 0.78 : 0.5);
  const top = (height - artHeight * scale) * 0.5;
  return { scale, left, top };
}

export function makeCanopyMesh() {
  // The underpainting is a single stationary quad. Each blade gets its own
  // grid, UV island, hinge and draw order, including where silhouettes overlap.
  const vertices = [
    0,0,0,0,0,0,0,-1,0,1,0,   artWidth,0,1,0,0,0,0,-1,0,1,0,
    0,artHeight,0,1,0,0,0,-1,0,1,0,   artWidth,artHeight,1,1,0,0,0,-1,0,1,0,
  ];
  const indices = [0, 1, 2, 1, 3, 2];
  const [atlasWidth, atlasHeight] = layers.atlasSize;

  for (const blade of layers.leaves) {
    const [x,y,w,h] = blade.bounds;
    const [rx,ry] = blade.root;
    const dx = blade.tip[0] - rx;
    const dy = blade.tip[1] - ry;
    const length = Math.max(1, Math.hypot(dx,dy));
    const cols = Math.max(2, Math.ceil(w / 15));
    const rows = Math.max(2, Math.ceil(h / 15));
    const first = vertices.length / vertexStride;
    for (let j = 0; j <= rows; j++) {
      for (let i = 0; i <= cols; i++) {
        const bx = w * i / cols;
        const by = h * j / rows;
        vertices.push(x+bx, y+by, (blade.atlas[0]+bx)/atlasWidth, (blade.atlas[1]+by)/atlasHeight,
          rx, ry, dx/length, dy/length, blade.id, length, blade.depth);
        if (i < cols && j < rows) {
          const k = first + j * (cols+1) + i;
          indices.push(k,k+1,k+cols+1,k+1,k+cols+2,k+cols+1);
        }
      }
    }
  }
  return { vertices: new Float32Array(vertices), indices: new Uint16Array(indices) };
}
