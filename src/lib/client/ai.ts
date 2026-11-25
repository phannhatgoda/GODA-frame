"use client";
// Open-source, on-device AI (Google MediaPipe, Apache-2.0). Guest photos never leave the browser.
import type { FaceDetector, ImageSegmenter } from "@mediapipe/tasks-vision";

const WASM = "/mediapipe/wasm";
const MODELS = {
  face: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
  seg: "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite",
};

let visionP: Promise<typeof import("@mediapipe/tasks-vision")> | null = null;
let filesetP: Promise<unknown> | null = null;
let faceP: Promise<FaceDetector> | null = null;
let segP: Promise<ImageSegmenter> | null = null;

async function base() {
  visionP ||= import("@mediapipe/tasks-vision");
  const v = await visionP;
  filesetP ||= v.FilesetResolver.forVisionTasks(WASM);
  return { v, fileset: (await filesetP) as Awaited<ReturnType<typeof v.FilesetResolver.forVisionTasks>> };
}

async function withDelegate<T>(make: (d: "GPU" | "CPU") => Promise<T>) {
  try {
    return await make("GPU");
  } catch {
    return make("CPU");
  }
}

export function warmup(kind: "face" | "seg") {
  if (kind === "face") void getFace().catch(() => {});
  else void getSeg().catch(() => {});
}

function getFace() {
  faceP ||= (async () => {
    const { v, fileset } = await base();
    return withDelegate((delegate) =>
      v.FaceDetector.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODELS.face, delegate },
        runningMode: "IMAGE",
        minDetectionConfidence: 0.5,
      }),
    );
  })();
  faceP.catch(() => (faceP = null));
  return faceP;
}

function getSeg() {
  segP ||= (async () => {
    const { v, fileset } = await base();
    return withDelegate((delegate) =>
      v.ImageSegmenter.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODELS.seg, delegate },
        runningMode: "IMAGE",
        outputCategoryMask: false,
        outputConfidenceMasks: true,
      }),
    );
  })();
  segP.catch(() => (segP = null));
  return segP;
}

function downscale(img: CanvasImageSource & { width: number; height: number }, max: number) {
  const s = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * s);
  c.height = Math.round(img.height * s);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return { canvas: c, s };
}

export interface FaceBox { x: number; y: number; w: number; h: number; count: number }

/** Returns the largest face in natural image coordinates. */
export async function detectFace(img: HTMLCanvasElement | HTMLImageElement): Promise<FaceBox | null> {
  const det = await getFace();
  const { canvas, s } = downscale(img as HTMLCanvasElement, 1024);
  const res = det.detect(canvas);
  const faces = (res.detections || []).map((d) => d.boundingBox).filter(Boolean) as { originX: number; originY: number; width: number; height: number }[];
  if (!faces.length) return null;
  const b = faces.sort((a, z) => z.width * z.height - a.width * a.height)[0];
  // BlazeFace boxes are tight around the face: grow a bit to include hair/chin
  return { x: b.originX / s, y: b.originY / s, w: b.width / s, h: b.height / s, count: faces.length };
}

/** Person cut-out with soft alpha edges. Returns a canvas at the source resolution. */
export async function removeBackground(img: HTMLCanvasElement | HTMLImageElement): Promise<HTMLCanvasElement> {
  const seg = await getSeg();
  const W = img.width, H = img.height;
  const { canvas } = downscale(img as HTMLCanvasElement, 1024);
  const res = seg.segment(canvas);
  const bgMask = res.confidenceMasks?.[0];
  if (!bgMask) throw new Error("Không tách được nền");
  const mw = bgMask.width, mh = bgMask.height;
  const data = bgMask.getAsFloat32Array();

  const m = document.createElement("canvas");
  m.width = mw; m.height = mh;
  const mctx = m.getContext("2d")!;
  const id = mctx.createImageData(mw, mh);
  for (let i = 0; i < data.length; i++) {
    // contrast curve to sharpen the edge while keeping hair soft
    const a = Math.min(1, Math.max(0, (1 - data[i] - 0.25) / 0.5));
    id.data[i * 4 + 3] = Math.round(a * 255);
  }
  mctx.putImageData(id, 0, 0);
  res.close?.();

  const out = document.createElement("canvas");
  out.width = W; out.height = H;
  const o = out.getContext("2d")!;
  o.drawImage(img, 0, 0, W, H);
  o.globalCompositeOperation = "destination-in";
  o.filter = `blur(${Math.max(1, Math.round(W / 700))}px)`;
  o.drawImage(m, 0, 0, W, H);
  return out;
}
