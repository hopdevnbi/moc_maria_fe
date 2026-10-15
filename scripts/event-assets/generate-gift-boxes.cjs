/* P03 original vector gift assets, rendered to two lightweight responsive WebP sizes.
 * node scripts/event-assets/generate-gift-boxes.cjs
 * Requires 'sharp' (already used in Mộc Maria's image toolchain).
 * Deterministic illustration assets, never draws/allocates prizes.
 */
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const palettes = [
  ["rung-xanh", "#287956", "#0a4939", "#f5d596"],
  ["vang-champagne", "#d7b170", "#8e653c", "#fff3cc"],
  ["ngoc-trai", "#fbf4e5", "#b3a99b", "#e7c482"],
  ["sage-am", "#8db29a", "#3a7158", "#ffe3ac"],
  ["dao-nhat", "#efc4ae", "#b37866", "#ffe4ae"],
  ["tram-la", "#9fc6b1", "#497d61", "#fae3b0"],
];

function giftSvg([name, c1, c2, ribbon]) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="720" viewBox="0 0 720 720" role="img" aria-labelledby="title desc">
<title id="title">Hộp quà Mộc Maria — ${name}</title><desc id="desc">Minh họa hộp quà xanh botanical với nơ satin màu vàng, không thể hiện nội dung giải thưởng.</desc>
<defs>
  <radialGradient id="halo"><stop stop-color="#fdf7dd" stop-opacity=".34"/><stop offset="1" stop-color="#fffaf0" stop-opacity="0"/></radialGradient>
  <linearGradient id="body" x1=".04" y1=".06" x2=".94" y2="1"><stop stop-color="${c1}"/><stop offset=".53" stop-color="${c2}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
  <linearGradient id="lid" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
  <linearGradient id="ribbon"><stop stop-color="#b88b44"/><stop offset=".35" stop-color="${ribbon}"/><stop offset=".66" stop-color="#fff4d2"/><stop offset="1" stop-color="#bb904d"/></linearGradient>
  <filter id="shadow"><feGaussianBlur stdDeviation="22"/></filter>
</defs>
<circle cx="360" cy="327" r="307" fill="url(#halo)"/>
<g opacity=".65" fill="none" stroke="#d8bd86" stroke-linecap="round"><path d="M114 245q-32-70-78-84M121 233q-20-26-57-24M608 258q27-65 76-81M605 250q18-24 46-29" stroke-width="5"/><path d="M98 179q-25-18-47-12M619 192q24-24 46-20" stroke-width="3"/></g>
<g fill="#e4ce9f" opacity=".95"><path d="M98 333l7 14 14 7-14 7-7 14-7-14-14-7 14-7z"/><path d="M616 327l8 15 15 8-15 8-8 15-8-15-15-8 15-8z"/><circle cx="148" cy="166" r="5"/><circle cx="573" cy="183" r="6"/></g>
<ellipse cx="362" cy="605" rx="236" ry="35" fill="#0b2e27" opacity=".38" filter="url(#shadow)"/>
<ellipse cx="360" cy="590" rx="235" ry="48" fill="#dfd4ae" opacity=".24"/>
<!-- Gift body front and side -->
<path d="M170 298L492 310L539 343L534 554Q532 574 514 578L213 581Q183 580 179 559Z" fill="url(#body)"/>
<path d="M492 310L539 343L534 554Q531 569 515 576L492 584Z" fill="#092d27" opacity=".32"/>
<path d="M180 325L493 339" stroke="#ffffff" stroke-opacity=".24" stroke-width="5"/>
<!-- Gold crossed ribbons -->
<path d="M320 304L370 307L378 579L330 580Z" fill="url(#ribbon)"/>
<path d="M175 408L536 418L537 460L178 451Z" fill="url(#ribbon)"/>
<!-- Lid body and broad edge -->
<path d="M148 290L480 285L558 314L536 356L167 347Z" fill="url(#lid)"/>
<path d="M148 290Q151 275 171 270L472 273Q491 273 501 290L558 314L536 332L166 325Z" fill="url(#lid)"/>
<path d="M317 272L365 273L412 331L360 329Z" fill="url(#ribbon)"/>
<path d="M167 325L536 332L537 353L167 346Z" fill="#0e382e" opacity=".23"/>
<!-- Bow loops and tails -->
<path d="M355 269Q285 266 274 218Q257 171 291 157Q337 151 361 245Q360 185 406 162Q450 145 454 192Q459 245 372 271Z" fill="url(#ribbon)" stroke="#ab8648" stroke-width="5"/>
<path d="M360 252Q329 222 304 194Q295 184 292 197Q291 220 348 252M367 249Q404 189 430 188Q443 216 376 256" fill="none" stroke="#f9e4b1" stroke-width="8" stroke-linecap="round" opacity=".8"/>
<path d="M348 275L310 362Q311 381 334 375L366 301L396 377Q414 383 425 368L386 269Z" fill="url(#ribbon)"/>
<ellipse cx="367" cy="267" rx="29" ry="24" fill="url(#ribbon)" stroke="#b48a4a" stroke-width="5"/>
<path d="M230 500q48-18 72 7M420 507q26-20 48-10" fill="none" stroke="#ffffff" stroke-opacity=".15" stroke-width="7"/>
</svg>`;
}

async function main() {
  const root = path.resolve(__dirname, "../../public/event/gift-boxes");
  fs.mkdirSync(root, { recursive: true });
  const manifest = [];
  for (const [index, palette] of palettes.entries()) {
    const base = `gift-${index + 1}`;
    const svg = giftSvg(palette);
    fs.writeFileSync(path.join(root, `${base}.svg`), svg, "utf8");
    for (const size of [320, 640]) {
      await sharp(Buffer.from(svg, "utf8")).resize(size, size).webp({ quality: 78, effort: 5 }).toFile(path.join(root, `${base}-${size}.webp`));
    }
    manifest.push({ id: index + 1, label: palette[0], svg: `/event/gift-boxes/${base}.svg`, small: `/event/gift-boxes/${base}-320.webp`, large: `/event/gift-boxes/${base}-640.webp` });
  }
  fs.writeFileSync(path.join(root, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log("Generated " + manifest.length + " original boxes, SVG and 2 responsive WebP each");
}
main().catch((err) => { console.error(err); process.exitCode = 1; });
