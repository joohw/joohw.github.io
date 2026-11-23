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
  varying vec2 artPosition;

  void main() {
    gl_FragColor = texture2D(painting, artPosition / artSize);
  }
`;

export const leafVertexShader = `
  uniform vec2 hinge, axis, offset;
  uniform float lengthToTip;
  varying vec2 spriteUV;

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vec2 art = vec2(world.x, -world.y);
    float reach = clamp(dot(art - hinge, axis) / lengthToTip, 0.0, 1.0);
    vec2 bend = offset * reach * reach;
    world.xy += vec2(bend.x, -bend.y);
    spriteUV = vec2(uv.x, 1.0 - uv.y);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

export const leafFragmentShader = `
  uniform sampler2D sprites;
  uniform vec4 atlasRegion;
  varying vec2 spriteUV;

  void main() {
    vec4 leaf = texture2D(sprites, atlasRegion.xy + spriteUV * atlasRegion.zw);
    if (leaf.a <= 0.0) discard;
    gl_FragColor = leaf;
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
