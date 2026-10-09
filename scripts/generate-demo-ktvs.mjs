import sharp from "sharp";
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirectory = process.argv[2] || process.env.KTV_PHOTO_SOURCE_DIR;
if (!sourceDirectory)
  throw new Error("Provide the owner photo folder as an argument or KTV_PHOTO_SOURCE_DIR.");
const sources = JSON.parse(
  await readFile(path.join(root, "src/features/mobile/ktv-photo-sources.json"), "utf8"),
);
const profiles = JSON.parse(
  await readFile(path.join(root, "src/features/mobile/demo-ktvs.json"), "utf8"),
);
// Validate every input before writing. Preserve identities, schedules and account mappings.
for (const source of sources) {
  if (
    path.basename(source.sourceFile) !== source.sourceFile ||
    !source.avatarUrl.startsWith("/media/ktv/")
  )
    throw new Error("Invalid source manifest");
  if (profiles.find((p) => p.id === source.seedId)?.avatarUrl !== source.avatarUrl)
    throw new Error("Profile photo manifest mismatch");
  await access(path.join(sourceDirectory, source.sourceFile));
}
await mkdir(path.join(root, "public/media/ktv"), { recursive: true });
for (const source of sources) {
  const buffer = await sharp(path.join(sourceDirectory, source.sourceFile))
    .rotate()
    .resize(640, 740, { fit: "cover", position: "attention" })
    .webp({ quality: 85, effort: 5 })
    .toBuffer();
  await writeFile(path.join(root, "public", source.avatarUrl.slice(1)), buffer);
}
console.log("GENERATED_REAL_PROFILE_PHOTOS=" + sources.length);
