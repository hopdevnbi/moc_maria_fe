import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

const project = process.cwd();
const desktop = path.join(process.env.USERPROFILE || "", "Desktop");
const sourceFolder =
  process.env.MOC_MARIA_PHOTOS_DIR ||
  path.join(
    desktop,
    (await fs.readdir(desktop)).find((name) => name.toLowerCase().includes("mocmaria")) ||
      "not-found",
  );
const outputFolder = path.join(project, "public", "services", "photography");
const jsonPath = path.join(project, "src", "features", "mobile", "demo-services.json");
const storage = "https://sg.storage.bunnycdn.com/giangxa-media/moc-maria/services/photos-v1";
const cdn = "https://giangxa-media-cdn.b-cdn.net/moc-maria/services/photos-v1";
const useCdn = process.argv.includes("--upload");
const selections = {
  "demo-relaxation": "509439388",
  "demo-hot-stone": "536275033",
  "demo-neck": "553130422",
  "demo-foot": "528621802",
  "demo-herbal": "539930215",
  "demo-pressure": "526185038",
  "demo-aroma": "545702234",
  "demo-thai": "510803302",
  "demo-back": "509442291",
  "demo-hair": "552722889",
};
if (useCdn && !process.env.BUNNY_STORAGE_API_KEY) {
  throw new Error("BUNNY_STORAGE_API_KEY env var is required with --upload");
}
await fs.mkdir(outputFolder, { recursive: true });
const files = await fs.readdir(sourceFolder);
const services = JSON.parse(await fs.readFile(jsonPath, "utf8"));
const selected = [];
for (const item of services) {
  const prefix = selections[item.service.id];
  if (!prefix) continue;
  const file = files.find((name) => name.startsWith(prefix) && /\.jpe?g$/i.test(name));
  if (!file) throw new Error("Photo missing for " + item.service.id + " prefix=" + prefix);
  const buffer = await fs.readFile(path.join(sourceFolder, file));
  const digest = crypto
    .createHash("sha256")
    .update(buffer)
    .update("moc-v1-attention-960x560")
    .digest("hex")
    .slice(0, 12);
  const keyBase = item.service.id.replace(/^demo-/, "") + "-" + digest;
  const variants = [];
  for (const [w, h] of [
    [480, 280],
    [960, 560],
  ]) {
    const name = keyBase + "-" + w + ".webp";
    const output = await sharp(buffer)
      .rotate()
      .resize(w, h, { fit: "cover", position: sharp.strategy.attention, withoutEnlargement: false })
      .webp({ quality: w === 480 ? 73 : 79, effort: 6 })
      .toBuffer();
    if (output.length > 130000) throw Error("Image too large " + name + ": " + output.length);
    await fs.writeFile(path.join(outputFolder, name), output);
    variants.push({ name, width: w, height: h, bytes: output.length, buffer: output });
  }
  selected.push({ item, file, variants });
}
if (selected.length !== 10) throw new Error("Expected 10 demo services, got " + selected.length);
if (useCdn) {
  for (const { item, variants } of selected) {
    for (const v of variants) {
      const response = await fetch(storage + "/" + v.name, {
        method: "PUT",
        headers: { AccessKey: process.env.BUNNY_STORAGE_API_KEY, "Content-Type": "image/webp" },
        body: v.buffer,
        signal: AbortSignal.timeout(25000),
      });
      if (!response.ok)
        throw Error(
          "Bunny upload failed for " + item.service.id + "/" + v.name + " HTTP " + response.status,
        );
      console.log("UPLOADED " + v.name + " " + v.bytes + " bytes");
    }
  }
}
for (const { item, variants, file } of selected) {
  const base = useCdn ? cdn : "/services/photography";
  const small = base + "/" + variants[0].name;
  const large = base + "/" + variants[1].name;
  item.imageUrl = large;
  item.imageSrcSet = small + " 480w, " + large + " 960w";
  item.imageAlt = "Hình ảnh hoạt động massage thực tế tại Mộc Maria";
  item.photoSourceFile = file; // simple traceability, no sensitive user information
}
await fs.writeFile(jsonPath, JSON.stringify(services, null, 2) + "\n", "utf8");
console.log(
  "SERVICE_IMAGES_READY=" +
    selected.length +
    " MODE=" +
    (useCdn ? "CDN" : "LOCAL") +
    " BYTES=" +
    selected.flatMap((x) => x.variants).reduce((sum, v) => sum + v.bytes, 0),
);
