import { SHADERS, VERTEX } from "./badge-shaders";

// All badges render through this single GL context and are copied onto their
// own 2D canvases, since browsers only allow a handful of live GL contexts.
let gl = null;
let shared = null;
let failed = false;
const programs = new Map();
const entries = new Set();
let counter = 0;
let frame = 0;
let last = 0;
let time = 0;
let reducedQuery = null;

function init() {
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

function compile(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function program(preset) {
  if (programs.has(preset)) return programs.get(preset);

  let info = null;
  const vs = compile(gl.VERTEX_SHADER, VERTEX);
  const fs = compile(gl.FRAGMENT_SHADER, SHADERS[preset]);
  if (vs && fs) {
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.bindAttribLocation(p, 0, "aPos");
    gl.linkProgram(p);
    if (gl.getProgramParameter(p, gl.LINK_STATUS)) {
      info = {
        program: p,
        uResolution: gl.getUniformLocation(p, "uResolution"),
        uTime: gl.getUniformLocation(p, "uTime"),
        uSeed: gl.getUniformLocation(p, "uSeed"),
      };
    } else {
      console.error(gl.getProgramInfoLog(p));
    }
  }
  programs.set(preset, info);
  return info;
}

function draw(entry) {
  const { canvas, ctx } = entry;
  const w = canvas.width;
  const h = canvas.height;
  const p = program(entry.preset);
  if (!p || !w || !h) return;

  if (shared.width < w) shared.width = w;
  if (shared.height < h) shared.height = h;

  gl.viewport(0, 0, w, h);
  gl.useProgram(p.program);
  gl.uniform2f(p.uResolution, w, h);
  gl.uniform1f(p.uTime, time);
  gl.uniform1f(p.uSeed, entry.seed);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  // GL rows run bottom-up, so read from the bottom of the shared canvas.
  ctx.drawImage(shared, 0, shared.height - h, w, h, 0, 0, w, h);
}

function drawVisible() {
  for (const entry of entries) if (entry.visible) draw(entry);
}

function tick(now) {
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
export function registerBadge(canvas, preset) {
  if (!init()) return null;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const entry = {
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
