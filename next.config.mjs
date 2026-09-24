import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // There is a stray package-lock.json in the home directory; without this,
  // Turbopack walks up past the repo looking for the workspace root.
  turbopack: { root: here },
};

export default nextConfig;
