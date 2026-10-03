// The app's version, worked out from the Conventional Commit history so it
// never needs bumping by hand:
//   type!: …  or "BREAKING CHANGE"  → major (and minor, patch reset)
//   feat: …                          → minor (patch reset)
//   fix / perf / style / refactor    → patch
//   docs, chore, test, merges        → no change
// Pre-launch the major stays 0 until a breaking change says otherwise.
import { execFileSync } from "node:child_process";

export function versionFromCommits(subjects) {
  let major = 0;
  let minor = 0;
  let patch = 0;
  for (const s of subjects) {
    if (/^Merge /.test(s)) continue;
    const m = s.match(/^(\w+)(\([^)]*\))?(!)?:/);
    if (!m) continue;
    const [, type, , bang] = m;
    if (bang || /BREAKING CHANGE/.test(s)) {
      major++;
      minor = 0;
      patch = 0;
    } else if (type === "feat") {
      minor++;
      patch = 0;
    } else if (["fix", "perf", "style", "refactor", "revert"].includes(type)) {
      patch++;
    }
  }
  return `${major}.${minor}.${patch}`;
}

/** Reads the full history (oldest first). Returns null where git or history is unavailable. */
export function appVersion() {
  try {
    const shallow = execFileSync("git", ["rev-parse", "--is-shallow-repository"], { encoding: "utf8" }).trim();
    if (shallow === "true") return null; // a partial history would give a wrong number
    const log = execFileSync("git", ["log", "--reverse", "--format=%s"], { encoding: "utf8" });
    return versionFromCommits(log.split("\n").filter(Boolean));
  } catch {
    return null;
  }
}

// `node scripts/version.mjs` prints it.
if (import.meta.url === `file://${process.argv[1]}`) console.log(appVersion() ?? "unknown");
