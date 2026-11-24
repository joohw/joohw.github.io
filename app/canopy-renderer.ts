import {
  Group, LinearFilter, LinearMipmapLinearFilter, Mesh, OrthographicCamera, PlaneGeometry, Scene,
  ShaderMaterial, Texture, Vector2, WebGLRenderer, WebGLRenderTarget,
} from "three";
import { canopyFrame, edgeBend, maxCanopyBend } from "./canopy-frame";
import { createLeafHitTest } from "./canopy-leaf-hit-test";
import assets from "./canopy-layers.json";
import {
  backgroundFragmentShader, leafFragmentShader, leafOutlineFragmentShader, leafVertexShader,
  rippleFragmentShader, rippleVertexShader, sceneVertexShader,
} from "./canopy-shaders";

const sceneMaterial = {
  vertexShader: sceneVertexShader,
  depthTest: false,
  depthWrite: false,
  toneMapped: false,
};

export function createCanopyRenderer(
  canvas: HTMLCanvasElement,
  background: HTMLImageElement,
  leafImages: HTMLImageElement[],
  showLeafOutlines: boolean,
) {
  const context = canvas.getContext("webgl2", {
    alpha: false, antialias: false, depth: false, powerPreference: "low-power",
  });
  if (!context || context.isContextLost()) return null;
  const hitLeaf = createLeafHitTest();
  if (!hitLeaf) return null;

  const [artWidth, artHeight] = assets.size;
  const artSize = new Vector2(artWidth, artHeight);
  const renderer = new WebGLRenderer({ canvas, context });
  const scene = new Scene();
  const camera = new OrthographicCamera();
  camera.position.z = 1;
  const geometry = new PlaneGeometry(1, 1);
  const leafGeometry = new PlaneGeometry(1, 1, 16, 16);
  const painting = new Texture(background);
  const leafTextures = leafImages.map(image => {
    const texture = new Texture(image);
    texture.premultiplyAlpha = true;
    return texture;
  });
  const textures = [painting, ...leafTextures];
  for (const texture of textures) {
    texture.flipY = false;
    texture.generateMipmaps = true;
    texture.minFilter = LinearMipmapLinearFilter;
    texture.magFilter = LinearFilter;
    texture.needsUpdate = true;
  }

  const backgroundMaterial = new ShaderMaterial({
    ...sceneMaterial,
    fragmentShader: backgroundFragmentShader,
    uniforms: { painting: { value: painting }, artSize: { value: artSize }, windTime: { value: 0 } },
  });
  const plate = new Mesh(geometry, backgroundMaterial);
  plate.name = "Canopy backdrop";
  plate.scale.set(artWidth, artHeight, 1);
  plate.position.set(artWidth / 2, -artHeight / 2, 0);
  scene.add(plate);

  const leafOutlines = showLeafOutlines ? new Group() : null;
  if (leafOutlines) {
    leafOutlines.renderOrder = 1;
    scene.add(leafOutlines);
  }

  const leaves = assets.leaves.map((leaf, index) => {
    const { id, motion, root, tip, pin, bounds: [x, y, width, height] } = leaf;
    const dx = tip[0] - root[0], dy = tip[1] - root[1];
    const distance = Math.max(1, Math.hypot(dx, dy));
    const length = Math.max(1, distance - pin);
    const axis = new Vector2(dx / distance, dy / distance);
    const offset = new Vector2();
    const spread = leaf.spread ?? 0;
    const uniforms = {
      leafImage: { value: leafTextures[index] },
      artSize: { value: artSize },
      edgeBend: { value: edgeBend },
      hinge: { value: new Vector2(root[0], root[1]) },
      axis: { value: axis },
      bendLength: { value: length },
      pinnedLength: { value: pin },
      spread: { value: spread },
      offset: { value: offset },
    };
    const material = new ShaderMaterial({
      ...sceneMaterial,
      vertexShader: leafVertexShader,
      fragmentShader: leafFragmentShader,
      transparent: true,
      premultipliedAlpha: true,
      uniforms,
    });
    const mesh = new Mesh(leafGeometry, material);
    mesh.name = `Seedream layer ${id}`;
    mesh.position.set(x + width / 2, -y - height / 2, 0);
    mesh.scale.set(width, height, 1);
    mesh.renderOrder = index + 1;
    mesh.frustumCulled = false;
    scene.add(mesh);

    const outline = motion && leafOutlines ? new Mesh(leafGeometry, new ShaderMaterial({
      ...sceneMaterial,
      vertexShader: leafVertexShader,
      fragmentShader: leafOutlineFragmentShader,
      transparent: true,
      uniforms,
    })) : null;
    if (outline) {
      outline.position.copy(mesh.position);
      outline.scale.copy(mesh.scale);
      outline.frustumCulled = false;
      leafOutlines?.add(outline);
    }
    return { leaf, axis, length, offset, spread, mesh, outline };
  });
  const movingLeaves = leaves.filter(({ leaf }) => leaf.motion !== 0);

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

  let viewWidth = 0, viewHeight = 0;
  return {
    resize(commitResolution: boolean) {
      const width = Math.max(1, canvas.clientWidth), height = Math.max(1, canvas.clientHeight);
      // During a live resize, CSS scales the last buffer while the camera tracks the viewport.
      if (commitResolution || viewWidth === 0) {
        const dpr = Math.min(3, window.devicePixelRatio || 1, Math.sqrt(8_294_400 / (width * height)));
        const pixelWidth = Math.max(1, Math.round(width * dpr)), pixelHeight = Math.max(1, Math.round(height * dpr));
        if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
          renderer.setSize(pixelWidth, pixelHeight, false);
        }
      }
      if (width === viewWidth && height === viewHeight) return;
      viewWidth = width;
      viewHeight = height;
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
      backgroundMaterial.uniforms.windTime.value = seconds;
      const fade = Math.min(1, seconds / 1.2);
      for (const { leaf: { motion, root }, axis: {x: ax, y: ay}, length, offset } of movingLeaves) {
        let pullX = 0, pullY = 0;
        for (let i = 0; i < pulls.length; i += 3) {
          if (pulls[i] === motion) { pullX = pulls[i + 1]; pullY = pulls[i + 2]; break; }
        }
        // A slow gust travels across the canopy. Each leaf adds a smaller
        // local bend; blades sharing a rachis have identical motion parameters.
        const t = seconds - 1.45 * root[0] / artWidth - 0.4 * root[1] / artHeight;
        const strength = 1.85 * fade * Math.min(14.5, 4.2 + 0.54 * Math.sqrt(length));
        const envelope = 0.74 + 0.26 * Math.sin(0.29 * t);
        const gust = strength * envelope * (0.85 * Math.sin(0.86 * t) + 0.20 * Math.sin(1.48 * t + 0.6));
        const flutter = strength * envelope * 0.16 * Math.sin(1.92 * t + motion * 2.39996);
        const along = (pullX * ax + pullY * ay) * 0.24;
        const across = (-pullX * ay + pullY * ax) * 0.41 + flutter;
        const x = ax * along - ay * across + gust;
        const y = ay * along + ax * across - 0.32 * gust + strength * 0.10 * Math.sin(0.72 * t);
        const limit = Math.min(1, maxCanopyBend / Math.max(1, Math.hypot(x, y)));
        offset.set(x * limit, y * limit);
      }

      if (ripples && (reflection.width !== canvas.width || reflection.height !== canvas.height)) {
        reflection.setSize(canvas.width, canvas.height);
      }
      renderer.setRenderTarget(ripples ? reflection : null);
      renderer.render(scene, camera);
      if (ripples) {
        rippleUniforms.drops.value = ripples;
        renderer.setRenderTarget(null);
        renderer.render(rippleScene, camera);
      }
    },
    pick(x: number, y: number) {
      // Pick from front to back, reversing the same hinge deformation that the vertex shader applies.
      for (let i = leaves.length - 1; i >= 0; i--) {
        const { leaf, axis, length, offset, spread } = leaves[i];
        const [left, top, width, height] = leaf.bounds;
        if (x < left - maxCanopyBend || x > left + width + maxCanopyBend ||
            y < top - maxCanopyBend || y > top + height + maxCanopyBend) continue;
        if (!leaf.motion) {
          if (hitLeaf(leafImages[i], leaf.bounds, x, y)) return null;
          continue;
        }
        let sourceX = x, sourceY = y;
        const travel = Math.max(1, offset.length());
        for (let step = 0; step < 4; step++) {
          const dx = sourceX - leaf.root[0], dy = sourceY - leaf.root[1];
          const side = Math.abs(-dx * axis.y + dy * axis.x);
          const along = Math.min(Math.hypot(dx, dy), dx * axis.x + dy * axis.y + spread * side);
          const reach = Math.max(0, Math.min(1, (along - leaf.pin) / length));
          const edgeDistance = Math.max(0, Math.min(sourceX, artWidth - sourceX, sourceY, artHeight - sourceY));
          const bend = Math.min(reach * Math.sqrt(reach), (edgeBend + edgeDistance) / travel);
          sourceX = x - offset.x * bend;
          sourceY = y - offset.y * bend;
        }
        if (hitLeaf(leafImages[i], leaf.bounds, sourceX, sourceY)) return leaf.motion;
      }
      return null;
    },
    dispose() {
      for (const { mesh, outline } of leaves) {
        mesh.material.dispose();
        outline?.material.dispose();
      }
      backgroundMaterial.dispose();
      rippleMaterial.dispose();
      geometry.dispose();
      leafGeometry.dispose();
      rippleGeometry.dispose();
      for (const texture of textures) texture.dispose();
      reflection.dispose();
      renderer.dispose();
    },
  };
}
