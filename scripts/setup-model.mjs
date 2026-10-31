// Downloads the hand-tracking model and copies the WASM runtime so the app can serve both itself.
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const MODEL_SHA256 = 'fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1';
const MODEL_PATH = 'public/models/hand_landmarker.task';

const sha256 = (data) => createHash('sha256').update(data).digest('hex');

async function hasValidModel() {
  return existsSync(MODEL_PATH) && sha256(await readFile(MODEL_PATH)) === MODEL_SHA256;
}

await mkdir('public/models', { recursive: true });

if (await hasValidModel()) {
  console.log('Model already present and verified.');
} else {
  console.log('Downloading hand-tracking model...');
  const response = await fetch(MODEL_URL);
  if (!response.ok) throw new Error(`Model download failed: HTTP ${response.status}`);
  const data = Buffer.from(await response.arrayBuffer());
  const actual = sha256(data);
  if (actual !== MODEL_SHA256) {
    throw new Error(`Model checksum mismatch: expected ${MODEL_SHA256}, got ${actual}`);
  }
  await writeFile(MODEL_PATH, data);
  console.log('Model downloaded and verified.');
}

await cp('node_modules/@mediapipe/tasks-vision/wasm', 'public/wasm', { recursive: true });
console.log('WASM runtime copied.');
