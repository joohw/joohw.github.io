import {
  Group, LinearFilter, Mesh, OrthographicCamera, PlaneGeometry, Scene,
  ShaderMaterial, Texture, Vector2, Vector4, WebGLRenderer, WebGLRenderTarget,
} from "three";
import { canopyFrame } from "./canopy-frame";
import { createLeafHitTest } from "./canopy-leaf-hit-test";
import assets from "./canopy-layers.json";
import {
  backgroundFragmentShader, leafFragmentShader, leafVertexShader, rippleFragmentShader,
  rippleVertexShader, sceneVertexShader,
} from "./canopy-shaders";

const [artWidth, artHeight] = assets.size;
const [atlasWidth, atlasHeight] = assets.atlasSize;
const artSize = new Vector2(artWidth, artHeight);
const sceneMaterial = {
  vertexShader: sceneVertexShader,
  depthTest: false,
  depthWrite: false,
  toneMapped: false,
};

export function createCanopyRenderer(canvas: HTMLCanvasElement, background: HTMLImageElement, atlas: HTMLImageElement) {
  const context = canvas.getContext("webgl2", {
    alpha: false, antialias: false, depth: false, powerPreference: "low-power",
  });
  if (!context || context.isContextLost()) return null;
  const hitLeaf = createLeafHitTest(atlas);
  if (!hitLeaf) return null;

  const renderer = new WebGLRenderer({ canvas, context });
  const scene = new Scene();
  const camera = new OrthographicCamera();
  camera.position.z = 1;
  const geometry = new PlaneGeometry(1, 1);
  const leafGeometry = new PlaneGeometry(1, 1, 16, 16);
  const painting = new Texture(background);
  const sprites = new Texture(atlas);
  sprites.premultiplyAlpha = true;
  for (const texture of [painting, sprites]) {
    texture.flipY = false;
    texture.generateMipmaps = false;
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
    texture.needsUpdate = true;
  }

  const backgroundMaterial = new ShaderMaterial({
    ...sceneMaterial,
    fragmentShader: backgroundFragmentShader,
    uniforms: { painting: { value: painting }, artSize: { value: artSize } },
  });
  const paper = new Mesh(geometry, backgroundMaterial);
  paper.name = "Canopy backdrop";
  paper.scale.set(artWidth, artHeight, 1);
  paper.position.set(artWidth / 2, -artHeight / 2, 0);
  scene.add(paper);

  const layers = new Map<number, Group>();
  for (const depth of new Set(assets.leaves.map(leaf => leaf.depth))) {
    const layer = new Group();
    layer.name = `Canopy depth ${depth}`;
    layer.renderOrder = 1 + depth;
    scene.add(layer);
    layers.set(depth, layer);
  }

  const leaves = assets.leaves.map(leaf => {
    const { id, root, tip, depth, bounds: [x, y, width, height], atlas: [u, v] } = leaf;
    const dx = tip[0] - root[0], dy = tip[1] - root[1];
    const length = Math.max(1, Math.hypot(dx, dy));
    const axis = new Vector2(dx / length, dy / length);
    const offset = new Vector2();
    const material = new ShaderMaterial({
      ...sceneMaterial,
      vertexShader: leafVertexShader,
      fragmentShader: leafFragmentShader,
      transparent: true,
      premultipliedAlpha: true,
      uniforms: {
        sprites: { value: sprites },
        atlasRegion: { value: new Vector4(u / atlasWidth, v / atlasHeight, width / atlasWidth, height / atlasHeight) },
        hinge: { value: new Vector2(root[0], root[1]) },
        axis: { value: axis },
        lengthToTip: { value: length },
        offset: { value: offset },
      },
    });
    const mesh = new Mesh(leafGeometry, material);
    mesh.name = `Leaf ${id}`;
    mesh.position.set(x + width / 2, -y - height / 2, depth * 0.3);
    mesh.scale.set(width, height, 1);
    mesh.renderOrder = id;
    mesh.frustumCulled = false;
    layers.get(depth)?.add(mesh);
    return { leaf, axis, length, offset, mesh };
  });

  const reflection = new WebGLRenderTarget(1, 1, {
    depthBuffer: false, stencilBuffer: false, minFilter: LinearFilter, magFilter: LinearFilter,
  });
  const rippleScene = new Scene();
  const rippleGeometry = new PlaneGeometry(2, 2);
  const rippleUniforms = {
    illustration: { value: reflection.texture },
    aspect: { value: new Vector2(1, 1) },
    drops: { value: null as Float32Array | null },
  };
  const rippleMaterial = new ShaderMaterial({
    vertexShader: rippleVertexShader,
    fragmentShader: rippleFragmentShader,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    uniforms: rippleUniforms,
  });
  const water = new Mesh(rippleGeometry, rippleMaterial);
  water.name = "Water ripple";
  water.frustumCulled = false;
  rippleScene.add(water);

  return {
    resize() {
      const width = Math.max(1, canvas.clientWidth), height = Math.max(1, canvas.clientHeight);
      const dpr = Math.min(2, window.devicePixelRatio || 1, Math.sqrt(4_200_000 / (width * height)));
      const pixelWidth = Math.max(1, Math.round(width * dpr)), pixelHeight = Math.max(1, Math.round(height * dpr));
      renderer.setSize(pixelWidth, pixelHeight, false);
      reflection.setSize(pixelWidth, pixelHeight);
      const { scale, left, top } = canopyFrame(width, height);
      camera.left = -left / scale;
      camera.right = (width - left) / scale;
      camera.top = top / scale;
      camera.bottom = (top - height) / scale;
      camera.updateProjectionMatrix();
      const shorterSide = Math.min(width, height);
      rippleUniforms.aspect.value.set(width / shorterSide, height / shorterSide);
    },
    draw(seconds: number, pulls: Float32Array, ripples?: Float32Array) {
      let moving = false;
      for (const { leaf: { id, depth }, axis: {x: ax, y: ay}, offset } of leaves) {
        let pullX = 0, pullY = 0;
        for (let i = 0; i < pulls.length; i += 3) {
          if (pulls[i] === id) { pullX = pulls[i + 1]; pullY = pulls[i + 2]; break; }
        }
        const phase = id * 2.39996;
        const wind = Math.min(1, seconds) * (1.4 + 1.2 * depth) *
          (Math.sin(seconds * 0.72 + phase) + 0.17 * Math.sin(seconds * 1.04 - phase));
        const along = (pullX * ax + pullY * ay) * 0.24;
        const across = (-pullX * ay + pullY * ax) * 0.41 + wind;
        const x = ax * along - ay * across, y = ay * along + ax * across;
        const limit = Math.min(1, 12 / Math.max(1, Math.hypot(x, y)));
        offset.set(Math.round(x * limit * 10) * 0.1, Math.round(y * limit * 10) * 0.1);
        moving ||= offset.x !== 0 || offset.y !== 0;
      }
      if (!moving && !ripples) return false;

      renderer.setRenderTarget(ripples ? reflection : null);
      renderer.render(scene, camera);
      if (ripples) {
        rippleUniforms.drops.value = ripples;
        renderer.setRenderTarget(null);
        renderer.render(rippleScene, camera);
      }
      return true;
    },
    pick(x: number, y: number) {
      // Pick from front to back, reversing the same hinge deformation that the vertex shader applies.
      for (let i = leaves.length - 1; i >= 0; i--) {
        const { leaf, axis, length, offset } = leaves[i];
        const [left, top, width, height] = leaf.bounds;
        if (x < left - 12 || x > left + width + 12 || y < top - 12 || y > top + height + 12) continue;
        let sourceX = x, sourceY = y;
        for (let step = 0; step < 4; step++) {
          const along = (sourceX - leaf.root[0])*axis.x + (sourceY - leaf.root[1])*axis.y;
          const reach = Math.max(0, Math.min(1, along / length));
          sourceX = x - offset.x * reach * reach;
          sourceY = y - offset.y * reach * reach;
        }
        if (hitLeaf(leaf, sourceX, sourceY)) return leaf.id;
      }
      return null;
    },
    dispose() {
      for (const { mesh } of leaves) mesh.material.dispose();
      backgroundMaterial.dispose();
      rippleMaterial.dispose();
      geometry.dispose();
      leafGeometry.dispose();
      rippleGeometry.dispose();
      painting.dispose();
      sprites.dispose();
      reflection.dispose();
      renderer.dispose();
    },
  };
}
