import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
const imagesDir = path.join(root, "public/images");
const outputPath = path.join(root, "app/canopy-assets.json");
const source = JSON.parse(await readFile(path.join(root, "app/canopy-layers.json"), "utf8"));
// Keep the original manifest and artwork intact so builds never recompress a derivative.
const settings = { version: 1, backgroundQuality: 94, leafQuality: 90, posterQuality: 86, margin: 17 };
const names = [source.background, ...source.leaves.map(leaf => leaf.texture)];
const originals = new Map(await Promise.all(names.map(async name => [name, await readFile(path.join(imagesDir, name))])));
const digest = createHash("sha256").update(JSON.stringify({ source, settings }));
for (const data of originals.values()) digest.update(data);
const sourceDigest = digest.digest("hex");

let cached;
try { cached = JSON.parse(await readFile(outputPath, "utf8")); } catch { /* First build. */ }
if (cached?.sourceDigest === sourceDigest) {
  try {
    await Promise.all([cached.background, cached.poster, ...cached.leaves.map(leaf => leaf.texture)]
      .map(name => access(path.join(imagesDir, name))));
    console.log("Canopy delivery assets are current.");
    process.exit(0);
  } catch { /* Regenerate missing delivery files. */ }
}

await mkdir(imagesDir, { recursive: true });
const sizes = [];
async function publish(data, kind) {
  const hash = createHash("sha256").update(data).digest("hex").slice(0, 10);
  const name = `canopy-delivery-${kind}-${hash}.webp`;
  await writeFile(path.join(imagesDir, name), data);
  return name;
}

async function compress(name, kind, quality) {
  const original = originals.get(name);
  const encoded = await sharp(original).webp({ quality, alphaQuality: 100, effort: 5 }).toBuffer();
  // Small, already-efficient cutouts are better left as-is.
  const data = encoded.length < original.length ? encoded : original;
  const before = await sharp(original).metadata();
  const after = await sharp(data).metadata();
  if (before.width !== after.width || before.height !== after.height) throw new Error(`Size changed: ${name}`);
  if (before.hasAlpha) {
    const oldAlpha = await sharp(original).extractChannel("alpha").raw().toBuffer();
    const newAlpha = await sharp(data).extractChannel("alpha").raw().toBuffer();
    if (!oldAlpha.equals(newAlpha)) throw new Error(`Alpha changed: ${name}`);
  }
  const filename = data === original ? name : await publish(data, kind);
  sizes.push({ source: name, file: filename, before: original.length, after: data.length });
  return filename;
}

const background = await compress(source.background, "base", settings.backgroundQuality);
const leaves = [];
for (const leaf of source.leaves) {
  leaves.push({ ...leaf, texture: await compress(leaf.texture, `leaf-${leaf.id}`, settings.leafQuality) });
}

// Recreate the current scene at rest, in its original stacking order. Crop the
// same safety margin used by canopyFrame so CSS cover matches the WebGL camera.
const [width, height] = source.size;
const overlays = [];
for (const leaf of source.leaves) {
  const [x, y, w, h] = leaf.bounds.map(Math.round);
  const left = Math.max(0, x), top = Math.max(0, y);
  const right = Math.min(width, x + w), bottom = Math.min(height, y + h);
  if (right <= left || bottom <= top) continue;
  const resized = await sharp(originals.get(leaf.texture)).resize(w, h, { fit: "fill" }).png().toBuffer();
  const input = await sharp(resized).extract({ left: left - x, top: top - y, width: right - left, height: bottom - top }).png().toBuffer();
  overlays.push({ input, left, top });
}
const composed = await sharp(originals.get(source.background)).composite(overlays).png().toBuffer();
const margin = settings.margin;
const posterData = await sharp(composed)
  .extract({ left: margin, top: margin, width: width - margin * 2, height: height - margin * 2 })
  .webp({ quality: settings.posterQuality, effort: 5 }).toBuffer();
const poster = await publish(posterData, "poster");
await writeFile(outputPath, `${JSON.stringify({ ...source, background, leaves, poster, sourceDigest }, null, 2)}\n`);
const before = sizes.reduce((sum, item) => sum + item.before, 0);
const after = sizes.reduce((sum, item) => sum + item.after, 0);
console.log(JSON.stringify({ images: sizes.length, before, after, posterBytes: posterData.length,
  totalWithPoster: after + posterData.length, savedPercent: +((1 - (after + posterData.length) / before) * 100).toFixed(1) }, null, 2));
