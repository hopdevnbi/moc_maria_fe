// Reproduce the app icons from the unchanged official Mộc Maria logo.
// Uses Sharp, already installed with Next.js in this repository.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const logo = path.join(root, "public/brand/moc-maria-official-20261013.png");
const dir = path.join(root, "public/pwa");
const files = [
  ["icon-192.png", 192, 0.86],
  ["icon-512.png", 512, 0.86],
  ["icon-maskable-512.png", 512, 0.58],
  ["apple-touch-icon.png", 180, 0.86],
];

async function main() {
  await mkdir(dir, { recursive: true });
  for (const [file, size, scale] of files) {
    const dimension = Math.round(size * scale);
    const overlay = await sharp(logo)
      .resize(dimension, dimension, { fit: "contain" })
      .png()
      .toBuffer();
    const inset = Math.floor((size - dimension) / 2);
    await sharp({ create: { width: size, height: size, channels: 4, background: "#fbf7ed" } })
      .composite([{ input: overlay, left: inset, top: inset }])
      .png()
      .toFile(path.join(dir, file));
    process.stdout.write(`${file}: ${size}x${size}\n`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
