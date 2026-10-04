// Captures video/explainer.html frame by frame and encodes an MP4.
// Usage: node video/render.mjs [out.mp4] [--frames 0,5.5,12]   (needs playwright + ffmpeg)
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const fi = args.indexOf("--frames");
const stills = fi >= 0 ? args[fi + 1].split(",").map(Number) : null;
const out = (fi === 0 ? null : args[0]) || path.join(here, "keepyours-explainer.mp4");
const FPS = 30;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(pathToFileURL(path.join(here, "explainer.html")).href + "?capture");
await page.evaluate(() => window.__ready);
const duration = await page.evaluate(() => window.__duration);

if (stills) {
  for (const t of stills) {
    await page.evaluate((t) => window.__render(t), t);
    await page.screenshot({ path: path.join(path.dirname(out), `still-${t}.png`) });
  }
} else {
  const ff = spawn("ffmpeg", ["-y", "-v", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out],
    { stdio: ["pipe", "inherit", "inherit"] });
  const total = Math.round(duration * FPS);
  for (let f = 0; f < total; f++) {
    await page.evaluate((t) => window.__render(t), f / FPS);
    ff.stdin.write(await page.screenshot({ type: "jpeg", quality: 95 }));
    if (f % 150 === 0) console.log(`frame ${f}/${total}`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
  console.log("wrote", out);
}
await browser.close();
