export const rippleCount = 4;

export const sceneVertexShader = `
  varying vec2 artPosition;

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    artPosition = vec2(world.x, -world.y);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

export const backgroundFragmentShader = `
  uniform sampler2D painting;
  uniform vec2 artSize;
  uniform float windTime;
  varying vec2 artPosition;

  void main() {
    vec2 uv = artPosition / artSize;
    vec4 still = texture2D(painting, uv);
    vec2 fromCenter = abs(uv - 0.5);
    float perimeter = smoothstep(0.20, 0.46, max(fromCenter.x, fromCenter.y));
    float foliage = smoothstep(0.055, 0.16, dot(still.rgb, vec3(0.21, 0.72, 0.07)));
    float t = windTime - 1.45 * uv.x - 0.4 * uv.y;
    vec2 drift = vec2(sin(0.86 * t + 2.0 * uv.y), 0.44 * sin(0.72 * t - 2.2 * uv.x));
    drift *= 1.8 * perimeter * foliage * smoothstep(0.0, 1.2, windTime);
    gl_FragColor = texture2D(painting, uv - drift / artSize);
  }
`;

export const leafVertexShader = `
  uniform vec2 hinge, axis, offset, artSize;
  uniform float edgeBend;
  uniform float bendLength;
  uniform float pinnedLength;
  uniform float spread;
  varying vec2 spriteUV;

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vec2 art = vec2(world.x, -world.y);
    vec2 relative = art - hinge;
    // Wide, lobed blades flex laterally while the radius around the petiole stays fixed.
    float side = abs(dot(relative, vec2(-axis.y, axis.x)));
    float along = min(length(relative), dot(relative, axis) + spread * side);
    float reach = clamp((along - pinnedLength) / bendLength, 0.0, 1.0);
    // Keep cropped stems inside the original frame as the free leaf tips swing farther.
    vec2 edgeDistance = min(art, artSize - art);
    float travel = edgeBend + max(0.0, min(edgeDistance.x, edgeDistance.y));
    vec2 bend = offset * min(reach * sqrt(reach), travel / max(1.0, length(offset)));
    world.xy += vec2(bend.x, -bend.y);
    spriteUV = vec2(uv.x, 1.0 - uv.y);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

export const leafFragmentShader = `
  uniform sampler2D leafImage;
  varying vec2 spriteUV;

  void main() {
    vec4 leaf = texture2D(leafImage, spriteUV);
    if (leaf.a <= 0.0) discard;
    gl_FragColor = leaf;
  }
`;

export const leafOutlineFragmentShader = `
  uniform sampler2D leafImage;
  varying vec2 spriteUV;

  float leafCoverage(vec2 uv) {
    if (any(lessThan(uv, vec2(0.0))) || any(greaterThanEqual(uv, vec2(1.0)))) return 0.0;
    float alpha = texture2D(leafImage, uv).a;
    return smoothstep(0.4, 0.6, alpha);
  }

  void main() {
    vec2 dx = 1.25 * dFdx(spriteUV);
    vec2 dy = 1.25 * dFdy(spriteUV);
    float coverage = leafCoverage(spriteUV);
    if (coverage <= 0.0) discard;
    float nearby = min(
      min(leafCoverage(spriteUV - dx), leafCoverage(spriteUV + dx)),
      min(leafCoverage(spriteUV - dy), leafCoverage(spriteUV + dy))
    );
    float edge = coverage - nearby;
    if (edge <= 0.0) discard;
    gl_FragColor = vec4(0.80, 0.89, 1.0, 0.23 * edge);
  }
`;

export const rippleVertexShader = `
  varying vec2 screenUV;

  void main() {
    screenUV = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const rippleFragmentShader = `
  uniform sampler2D illustration;
  uniform vec2 aspect;
  uniform vec3 drops[${rippleCount}];
  varying vec2 screenUV;

  void main() {
    vec2 refraction = vec2(0.0);
    float glint = 0.0;
    float waveStrength = 0.0;
    for (int i = 0; i < ${rippleCount}; i++) {
      float age = drops[i].z;
      if (age >= 1.0) continue;

      vec2 fromDrop = (screenUV - drops[i].xy) * aspect;
      float distance = length(fromDrop);
      float behind = 0.022 + 0.77 * age - distance;
      float packet = smoothstep(-0.026, 0.030, behind) * (1.0 - smoothstep(0.056, 0.18, behind));
      float fade = smoothstep(0.0, 0.085, age) * (1.0 - smoothstep(0.24, 1.0, age));
      float wave = behind * 105.0;
      refraction += fromDrop / max(distance, 0.012) * (0.0058 * sin(wave) * packet * fade);
      waveStrength += fade;

      float crest = cos(wave);
      glint += (0.102 * pow(max(crest, 0.0), 5.0) - 0.04 * pow(max(-crest, 0.0), 3.0)) * packet * fade;
    }

    vec2 edge = smoothstep(vec2(0.0), vec2(0.028), min(screenUV, 1.0 - screenUV));
    vec2 sampleAt = screenUV + refraction * edge / (aspect * max(1.0, waveStrength));
    vec3 color = texture2D(illustration, sampleAt).rgb;
    gl_FragColor = vec4(color + vec3(0.52, 0.73, 0.95) * clamp(glint, -0.06, 0.15), 1.0);
  }
`;
