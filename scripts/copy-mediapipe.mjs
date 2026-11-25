// Self-host MediaPipe WASM runtime so guest pages don't depend on a third-party CDN for code.
import { cpSync, existsSync, mkdirSync } from "node:fs";
const src = "node_modules/@mediapipe/tasks-vision/wasm";
const dst = "public/mediapipe/wasm";
if (existsSync(src)) {
  mkdirSync(dst, { recursive: true });
  cpSync(src, dst, { recursive: true });
  console.log("[goda-frame] MediaPipe wasm copied to", dst);
}
