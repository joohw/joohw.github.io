import { artHeight, artWidth, canopyFrame, makeCanopyMesh, vertexStride } from "./canopy-mesh";

const vertexSource = `
  attribute vec2 position, uv, hinge, axis;
  attribute vec3 blade;
  uniform vec3 pulls[4];
  uniform vec4 frame;
  uniform vec2 look, probe;
  uniform float time, breeze;
  uniform mediump float picking;
  varying mediump vec2 sampleUV;
  varying mediump float leafId, light;

  void main() {
    vec2 p = position;
    light = 1.0;
    if (blade.x > 0.5) {
      vec2 pull = vec2(0.0);
      for (int i=0; i<4; i++) {
        if (abs(blade.x - pulls[i].x) < 0.25) pull = pulls[i].yz;
      }
      vec2 local = p - hinge;
      vec2 normal = vec2(-axis.y, axis.x);
      float reach = clamp(length(local)/blade.y, 0.0, 1.15);
      float phase = blade.x * 2.39996;
      float wind = breeze * (sin(time*(0.62+0.12*sin(phase))+phase)
                         + 0.19*sin(time*1.09-phase));
      float turn = reach * (dot(pull,normal)/max(105.0,blade.y) + 0.011*wind);
      float pitch = reach * (0.014*dot(pull,axis) + 0.038*wind);
      float spine = dot(local,axis);
      vec2 folded = axis*spine*cos(pitch) + normal*dot(local,normal);
      float z = spine*sin(pitch);
      vec2 rolled = mat2(cos(turn),sin(turn),-sin(turn),cos(turn))*folded;
      p = hinge + rolled*(1150.0/(1150.0-z)) + look*reach*blade.z;
      light += 0.11*sin(pitch);
    }
    if (picking > 0.5) {
      gl_Position = vec4((p-probe)*vec2(2.0,-2.0),0.0,1.0);
    } else {
      vec2 screen = p/vec2(1672.0,941.0)*frame.xy + frame.zw;
      gl_Position = vec4(screen*vec2(2.0,-2.0)+vec2(-1.0,1.0),0.0,1.0);
    }
    sampleUV = uv;
    leafId = blade.x;
  }
`;

const fragmentSource = `
  precision mediump float;
  uniform sampler2D painting;
  uniform mediump float picking;
  varying mediump vec2 sampleUV;
  varying mediump float leafId, light;
  void main() {
    vec4 ink = texture2D(painting,sampleUV);
    if (picking > 0.5) {
      if (ink.a < 0.5) discard;
      gl_FragColor = vec4(leafId/255.0,0.0,0.0,1.0);
    } else {
      gl_FragColor = vec4(ink.rgb*light, ink.a);
    }
  }
`;

export function createCanopyRenderer(canvas: HTMLCanvasElement, base: HTMLImageElement, leaves: HTMLImageElement) {
  const gl = canvas.getContext("webgl", {
    alpha: false, depth: false, antialias: false, preserveDrawingBuffer: true, powerPreference: "low-power",
  });
  if (!gl) return null;
  const program = gl.createProgram();
  if (!program) return null;
  for (const [type,source] of [[gl.VERTEX_SHADER,vertexSource],[gl.FRAGMENT_SHADER,fragmentSource]] as const) {
    const shader = gl.createShader(type);
    if (!shader) { gl.deleteProgram(program); return null; }
    gl.shaderSource(shader,source);
    gl.compileShader(shader);
    gl.attachShader(program,shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program,gl.LINK_STATUS)) { gl.deleteProgram(program); return null; }
  gl.useProgram(program);
  const vertices = gl.createBuffer();
  const indices = gl.createBuffer();
  const baseTexture = gl.createTexture();
  const leafTexture = gl.createTexture();
  const hitTexture = gl.createTexture();
  const hitBuffer = gl.createFramebuffer();
  const dispose = () => {
    gl.deleteBuffer(vertices); gl.deleteBuffer(indices);
    gl.deleteTexture(baseTexture); gl.deleteTexture(leafTexture); gl.deleteTexture(hitTexture);
    gl.deleteFramebuffer(hitBuffer); gl.deleteProgram(program);
  };
  if (!vertices || !indices || !baseTexture || !leafTexture || !hitTexture || !hitBuffer) { dispose(); return null; }

  const mesh = makeCanopyMesh();
  gl.bindBuffer(gl.ARRAY_BUFFER,vertices);
  gl.bufferData(gl.ARRAY_BUFFER,mesh.vertices,gl.STATIC_DRAW);
  for (const [name,size,offset] of [["position",2,0],["uv",2,2],["hinge",2,4],["axis",2,6],["blade",3,8]] as const) {
    const location=gl.getAttribLocation(program,name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location,size,gl.FLOAT,false,vertexStride*4,offset*4);
  }
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indices);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,mesh.indices,gl.STATIC_DRAW);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
  for (const [texture,image] of [[baseTexture,base],[leafTexture,leaves],[hitTexture,null]] as const) {
    gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    if (image) gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
    else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER,hitBuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,hitTexture,0);
  const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  if (!complete) { dispose(); return null; }

  const uniform = (name: string) => gl.getUniformLocation(program,name);
  const frame = uniform("frame"), look = uniform("look"), time = uniform("time");
  const breeze = uniform("breeze"), pulls = uniform("pulls[0]"), picking = uniform("picking"), probe = uniform("probe");
  const pixel = new Uint8Array(4);
  const bladeIndexCount = mesh.indices.length - 6;
  const drawBlades = () => {
    gl.bindTexture(gl.TEXTURE_2D,leafTexture);
    gl.drawElements(gl.TRIANGLES,bladeIndexCount,gl.UNSIGNED_SHORT,12);
  };
  gl.disable(gl.DITHER);
  gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);

  return {
    resize() {
      const width = Math.max(1,canvas.clientWidth), height = Math.max(1,canvas.clientHeight);
      const dpr = Math.min(window.devicePixelRatio || 1,1.5);
      const pixelsWide = Math.round(width*dpr), pixelsHigh = Math.round(height*dpr);
      if (canvas.width !== pixelsWide) canvas.width = pixelsWide;
      if (canvas.height !== pixelsHigh) canvas.height = pixelsHigh;
      gl.viewport(0,0,canvas.width,canvas.height);
      const {scale,left,top} = canopyFrame(width,height);
      gl.uniform4f(frame,scale*artWidth/width,scale*artHeight/height,left/width,top/height);
    },
    draw(seconds: number, x: number, y: number, leafPulls: Float32Array) {
      gl.uniform1f(time,seconds);
      gl.uniform1f(breeze,Math.min(1,seconds));
      gl.uniform2f(look,x,y);
      gl.uniform3fv(pulls,leafPulls);
      gl.disable(gl.BLEND);
      gl.bindTexture(gl.TEXTURE_2D,baseTexture);
      gl.drawElements(gl.TRIANGLES,6,gl.UNSIGNED_SHORT,0);
      gl.enable(gl.BLEND);
      drawBlades();
    },
    pick(x: number, y: number) {
      // Use the same poses, cutout alpha and back-to-front order as the image.
      gl.bindFramebuffer(gl.FRAMEBUFFER,hitBuffer);
      gl.viewport(0,0,1,1);
      gl.disable(gl.BLEND);
      gl.clearColor(0,0,0,0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(picking,1);
      gl.uniform2f(probe,x,y);
      drawBlades();
      gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
      gl.uniform1f(picking,0);
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);
      gl.viewport(0,0,canvas.width,canvas.height);
      return pixel[0] || null;
    },
    dispose,
  };
}
