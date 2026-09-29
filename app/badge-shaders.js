export const VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const HEAD = `
precision highp float;

uniform vec2  uResolution;
uniform float uTime;
uniform float uSeed;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
  return v;
}

vec3 warp(vec2 p, float t, float k) {
  vec2 q = vec2(fbm(p + vec2(0.0, t * 0.07)), fbm(p + vec2(5.2, 1.3) - t * 0.05));
  vec2 r = vec2(fbm(p + k * q + vec2(1.7, 9.2) + t * 0.04),
                fbm(p + k * q + vec2(8.3, 2.8) - t * 0.03));
  return vec3(fbm(p + k * r), q);
}
`;

// Scaled by height so a longer word widens the view instead of stretching it.
export const SHADERS = {
  keep: `${HEAD}
void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.y;
  float aspect = uResolution.x / uResolution.y;
  float t = uTime;
  vec2 o = vec2(uSeed * 13.7, uSeed * 7.3);

  vec3 w = warp(uv * vec2(0.8, 1.6) + o + vec2(t * 0.15, 0.0), t * 2.4, 2.0);
  float f = smoothstep(0.30, 0.66, w.x);
  float s = clamp(f + (hash(gl_FragCoord.xy + o * 100.0) - 0.5) * 0.2, 0.0, 1.0);

  // Brand greens. Starts at deep green, not Night, or it vanishes into the pill.
  vec3 deep  = vec3(0.020, 0.290, 0.150);
  vec3 green = vec3(0.086, 0.722, 0.384);
  vec3 mint  = vec3(0.384, 0.902, 0.627);
  vec3 ink   = vec3(0.918, 0.961, 0.937);

  vec3 col = mix(deep, green, smoothstep(0.10, 0.50, s));
  col = mix(col, mint, smoothstep(0.50, 0.85, s));
  col = mix(col, ink, smoothstep(0.85, 1.0, s) * 0.6);

  float cycle = t * 0.11 + uSeed;
  float k = fract(cycle);
  float open = smoothstep(0.0, 0.05, k) * (1.0 - smoothstep(0.05, 0.16, k));
  vec2 at = vec2(aspect * (0.25 + 0.5 * hash(vec2(floor(cycle), 3.1))), 0.52);
  vec2 d = abs(uv - at);
  float star = exp(-d.x * 5.0) * exp(-d.y * 70.0)
             + exp(-d.y * 9.0) * exp(-d.x * 70.0)
             + exp(-length(d) * 22.0);
  col += ink * star * open * 1.4;

  gl_FragColor = vec4(col, 1.0);
}`,
};

export const FALLBACK = {
  keep: "radial-gradient(120% 90% at 30% 40%, #62e6a0 0%, #16b862 45%, #054a26 100%)",
};
