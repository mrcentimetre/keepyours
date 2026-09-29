import { SHADERS, VERTEX, type BadgePreset } from "./badge-shaders";

type ProgramInfo = {
  program: WebGLProgram;
  uResolution: WebGLUniformLocation | null;
  uTime: WebGLUniformLocation | null;
  uSeed: WebGLUniformLocation | null;
};

type Entry = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  preset: BadgePreset;
  seed: number;
  visible: boolean;
};

// All badges render through this single GL context and are copied onto their
// own 2D canvases, since browsers only allow a handful of live GL contexts.
// `gl` and `shared` are set together by init(); everything past init() only
// runs once it has returned true, hence the non-null assertions below.
let gl: WebGLRenderingContext | null = null;
let shared: HTMLCanvasElement | null = null;
let failed = false;
const programs = new Map<BadgePreset, ProgramInfo | null>();
const entries = new Set<Entry>();
let counter = 0;
let frame = 0;
let last = 0;
let time = 0;
let reducedQuery: MediaQueryList | null = null;

function init(): boolean {
  if (gl || failed) return !failed;
  shared = document.createElement("canvas");
  gl = shared.getContext("webgl", { alpha: false, antialias: false, depth: false, stencil: false });
  if (!gl) {
    failed = true;
    return false;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  reducedQuery.addEventListener("change", run);
  document.addEventListener("visibilitychange", run);
  return true;
}

function compile(type: number, source: string): WebGLShader | null {
  const g = gl!;
  const shader = g.createShader(type);
  if (!shader) return null;
  g.shaderSource(shader, source);
  g.compileShader(shader);
  if (!g.getShaderParameter(shader, g.COMPILE_STATUS)) {
    console.error(g.getShaderInfoLog(shader));
    g.deleteShader(shader);
    return null;
  }
  return shader;
}

function program(preset: BadgePreset): ProgramInfo | null {
  if (programs.has(preset)) return programs.get(preset) ?? null;

  const g = gl!;
  let info: ProgramInfo | null = null;
  const vs = compile(g.VERTEX_SHADER, VERTEX);
  const fs = compile(g.FRAGMENT_SHADER, SHADERS[preset]);
  const p = vs && fs ? g.createProgram() : null;
  if (vs && fs && p) {
    g.attachShader(p, vs);
    g.attachShader(p, fs);
    g.bindAttribLocation(p, 0, "aPos");
    g.linkProgram(p);
    if (g.getProgramParameter(p, g.LINK_STATUS)) {
      info = {
        program: p,
        uResolution: g.getUniformLocation(p, "uResolution"),
        uTime: g.getUniformLocation(p, "uTime"),
        uSeed: g.getUniformLocation(p, "uSeed"),
      };
    } else {
      console.error(g.getProgramInfoLog(p));
    }
  }
  programs.set(preset, info);
  return info;
}

function draw(entry: Entry) {
  const { canvas, ctx } = entry;
  const w = canvas.width;
  const h = canvas.height;
  const p = program(entry.preset);
  const g = gl!;
  const out = shared!;
  if (!p || !w || !h) return;

  if (out.width < w) out.width = w;
  if (out.height < h) out.height = h;

  g.viewport(0, 0, w, h);
  g.useProgram(p.program);
  g.uniform2f(p.uResolution, w, h);
  g.uniform1f(p.uTime, time);
  g.uniform1f(p.uSeed, entry.seed);
  g.drawArrays(g.TRIANGLES, 0, 3);

  // GL rows run bottom-up, so read from the bottom of the shared canvas.
  ctx.drawImage(out, 0, out.height - h, w, h, 0, 0, w, h);
}

function drawVisible() {
  for (const entry of entries) if (entry.visible) draw(entry);
}

function tick(now: number) {
  // Capped so returning to the tab does not jump the animation.
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 0;
  last = now;
  time += dt;
  drawVisible();
  frame = requestAnimationFrame(tick);
}

function run() {
  cancelAnimationFrame(frame);
  frame = 0;
  last = 0;

  if (![...entries].some((e) => e.visible)) return;
  if (reducedQuery?.matches || document.hidden) {
    drawVisible();
    return;
  }
  frame = requestAnimationFrame(tick);
}

// Null when WebGL is missing; the CSS gradient then stays.
export function registerBadge(canvas: HTMLCanvasElement, preset: BadgePreset): (() => void) | null {
  if (!init()) return null;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const entry: Entry = {
    canvas,
    ctx,
    preset,
    seed: (counter++ * 0.618034) % 1,
    visible: false,
  };
  entries.add(entry);

  const resize = new ResizeObserver(() => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      draw(entry);
    }
  });
  resize.observe(canvas);

  const intersect = new IntersectionObserver(([e]) => {
    entry.visible = e.isIntersecting;
    if (entry.visible) draw(entry);
    run();
  });
  intersect.observe(canvas);

  return () => {
    resize.disconnect();
    intersect.disconnect();
    entries.delete(entry);
    run();
  };
}
