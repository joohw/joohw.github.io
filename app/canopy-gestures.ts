import { canopyFrame } from "./canopy-frame";

type Spring = { id: number; x: number; y: number; vx: number; vy: number; toX: number; toY: number };
type Grab = { pointer: number; leaf: Spring; x: number; y: number; started: number; moved: boolean };

export function bindCanopyGestures(
  main: HTMLElement,
  canvas: HTMLCanvasElement,
  pickBlade: (x: number, y: number) => number | null,
  wake: () => void,
  ripple: (x: number, y: number) => void,
) {
  const springs: Spring[] = [];
  const uniforms = new Float32Array(12);
  let grab: Grab | null = null;
  let tap: { pointer: number; x: number; y: number } | null = null;
  let previous: { x: number; y: number } | null = null;
  let lastBrush = 0;
  const controls = "a,button,input,textarea,select,[contenteditable=true],h1,h2,h3,p";
  const isControl = (target: EventTarget | null) => target instanceof Element && Boolean(target.closest(controls));
  const local = (x: number, y: number) => {
    const box = canvas.getBoundingClientRect();
    const { scale, left, top } = canopyFrame(box.width, box.height);
    return { x: (x - box.left - left) / scale, y: (y - box.top - top) / scale };
  };
  const springFor = (id: number) => {
    const existing = springs.find(spring => spring.id === id);
    if (existing) return existing;
    if (springs.length === 4) {
      springs.sort((a, b) => Math.hypot(a.x, a.y, a.vx / 12, a.vy / 12) - Math.hypot(b.x, b.y, b.vx / 12, b.vy / 12));
      springs.shift();
    }
    const spring = { id, x: 0, y: 0, vx: 0, vy: 0, toX: 0, toY: 0 };
    springs.push(spring);
    return spring;
  };
  const release = () => {
    if (grab) {
      grab.leaf.toX = 0;
      grab.leaf.toY = 0;
      if (grab.pointer >= 0 && main.hasPointerCapture(grab.pointer)) main.releasePointerCapture(grab.pointer);
    }
    grab = null;
    previous = null;
    main.removeAttribute("data-leaf-grabbed");
    main.removeAttribute("data-leaf-hover");
    wake();
  };
  const begin = (pointer: number, x: number, y: number, target: EventTarget | null) => {
    if (grab || isControl(target)) return false;
    const point = local(x, y);
    const id = pickBlade(point.x, point.y);
    if (id === null) return false;
    grab = { pointer, leaf: springFor(id), ...point, started: performance.now(), moved: false };
    main.toggleAttribute("data-leaf-grabbed", true);
    return true;
  };
  const drag = (x: number, y: number) => {
    if (!grab) return;
    const point = local(x, y);
    const dx = point.x - grab.x;
    const dy = point.y - grab.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 4) grab.moved = true;
    const gain = distance ? 22 * Math.tanh(distance / 32) / distance : 0;
    grab.leaf.toX = dx * gain;
    grab.leaf.toY = dy * gain;
    wake();
  };
  const pointerDown = (event: PointerEvent) => {
    if (!event.isPrimary) {
      tap = null;
      return;
    }
    if (event.button !== 0 || isControl(event.target)) return;
    tap = { pointer: event.pointerId, x: event.clientX, y: event.clientY };
    if (event.pointerType !== "touch" && begin(event.pointerId, event.clientX, event.clientY, event.target)) {
      event.preventDefault();
      main.setPointerCapture(event.pointerId);
    }
  };
  const isTap = (event: PointerEvent) => tap !== null && Math.hypot(event.clientX - tap.x, event.clientY - tap.y) <= 8;
  const pointerMove = (event: PointerEvent) => {
    if (tap?.pointer === event.pointerId && !isTap(event)) tap = null;
    if (event.pointerType === "touch") return;
    if (grab) {
      if (grab.pointer === event.pointerId) drag(event.clientX, event.clientY);
      return;
    }
    const now = performance.now();
    if (now - lastBrush < 30) return;
    lastBrush = now;
    const point = local(event.clientX, event.clientY);
    const id = isControl(event.target) ? null : pickBlade(point.x, point.y);
    main.toggleAttribute("data-leaf-hover", id !== null);
    if (id !== null && previous) {
      const spring = springFor(id);
      spring.vx = Math.max(-90, Math.min(90, spring.vx + (point.x - previous.x) * 1.8));
      spring.vy = Math.max(-90, Math.min(90, spring.vy + (point.y - previous.y) * 1.8));
      wake();
    }
    previous = point;
  };
  const finish = () => {
    if (grab && !grab.moved) {
      grab.leaf.vx += 65 * Math.cos(grab.leaf.id);
      grab.leaf.vy -= 64;
    }
    release();
  };
  const pointerUp = (event: PointerEvent) => {
    if (tap?.pointer === event.pointerId) {
      if (isTap(event) && !isControl(event.target) && !grab?.moved) ripple(event.clientX, event.clientY);
      tap = null;
    }
    if (grab?.pointer === event.pointerId) finish();
  };
  const pointerCancel = (event: PointerEvent) => {
    if (tap?.pointer === event.pointerId) tap = null;
    if (grab?.pointer === event.pointerId) release();
  };
  const cancel = () => {
    tap = null;
    release();
  };
  const touchStart = (event: TouchEvent) => {
    if (event.touches.length !== 1) { cancel(); return; }
    const touch = event.touches[0];
    begin(-1, touch.clientX, touch.clientY, event.target);
  };
  const touchMove = (event: TouchEvent) => {
    if (grab?.pointer !== -1) return;
    const touch = event.touches[0];
    if (!touch || !event.cancelable) { release(); return; }
    const point = local(touch.clientX, touch.clientY);
    const dx = Math.abs(point.x - grab.x);
    const dy = Math.abs(point.y - grab.y);
    if (performance.now() - grab.started < 150 && dy > 5 && dy > 1.2 * dx) { release(); return; }
    event.preventDefault();
    drag(touch.clientX, touch.clientY);
  };
  const touchEnd = () => { if (grab?.pointer === -1) finish(); };
  main.addEventListener("pointerdown", pointerDown);
  main.addEventListener("pointermove", pointerMove);
  main.addEventListener("pointerup", pointerUp);
  main.addEventListener("pointercancel", pointerCancel);
  main.addEventListener("lostpointercapture", pointerCancel);
  main.addEventListener("touchstart", touchStart, { passive: true });
  main.addEventListener("touchmove", touchMove, { passive: false });
  main.addEventListener("touchend", touchEnd);
  main.addEventListener("touchcancel", cancel);
  window.addEventListener("blur", cancel);
  return {
    step(delta: number, reducedMotion: boolean) {
      uniforms.fill(0);
      const steps = Math.max(1, Math.ceil(delta * 90));
      const dt = delta / steps;
      springs.forEach((spring, i) => {
        if (reducedMotion) {
          spring.x = spring.toX;
          spring.y = spring.toY;
          spring.vx = spring.vy = 0;
        }
        for (let s = 0; s < steps; s++) {
          spring.vx += ((spring.toX - spring.x) * 165 - spring.vx * 16) * dt;
          spring.vy += ((spring.toY - spring.y) * 165 - spring.vy * 16) * dt;
          spring.x += spring.vx * dt;
          spring.y += spring.vy * dt;
        }
        uniforms[i * 3] = spring.id;
        uniforms[i * 3 + 1] = spring.x;
        uniforms[i * 3 + 2] = spring.y;
      });
      return uniforms;
    },
    release,
    dispose() {
      cancel();
      main.removeEventListener("pointerdown", pointerDown);
      main.removeEventListener("pointermove", pointerMove);
      main.removeEventListener("pointerup", pointerUp);
      main.removeEventListener("pointercancel", pointerCancel);
      main.removeEventListener("lostpointercapture", pointerCancel);
      main.removeEventListener("touchstart", touchStart);
      main.removeEventListener("touchmove", touchMove);
      main.removeEventListener("touchend", touchEnd);
      main.removeEventListener("touchcancel", cancel);
      window.removeEventListener("blur", cancel);
    },
  };
}
