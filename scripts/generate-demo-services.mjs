import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const localDir = join(root, "public", "demo", "services");
const destination = join(root, "src", "features", "mobile", "demo-services.json");
const cdn = "https://giangxa-media-cdn.b-cdn.net/moc-maria/demo-services/2026-10";
const storage = "https://sg.storage.bunnycdn.com/giangxa-media/moc-maria/demo-services/2026-10";

// Illustrative previews only. Prices and claimed benefits are examples, not public offers.
const definitions = [
  { id: "demo-relaxation", slug: "massage-thu-gian-toan-than-demo", name: "Massage thư giãn toàn thân", description: "Liệu trình chăm sóc nhẹ nhàng giúp cơ thể có thời gian thư giãn sau những ngày bận rộn.", tag: "Thư giãn", icon: "towel", colors: ["#cfddd0","#f7ebd9","#718d75"], variants: [[60,350000],[90,490000]] },
  { id: "demo-hot-stone", slug: "massage-da-nong-demo", name: "Massage đá nóng", description: "Trải nghiệm hơi ấm từ đá massage kết hợp thao tác êm dịu trong không gian an yên.", tag: "Đá nóng", icon: "stones", colors: ["#d9cbc3","#f5e7d8","#83665b"], variants: [[90,500000],[120,650000]] },
  { id: "demo-neck", slug: "massage-co-vai-gay-demo", name: "Massage cổ vai gáy", description: "Chăm sóc tập trung vùng cổ, vai và lưng trên, phù hợp người làm việc tại bàn nhiều giờ.", tag: "Cổ vai gáy", icon: "towel", colors: ["#bfd2c0","#faf1e4","#5a7c69"], variants: [[45,250000],[60,320000]] },
  { id: "demo-foot", slug: "massage-chan-demo", name: "Massage chân", description: "Thả lỏng đôi chân với các động tác massage và chăm sóc thư giãn.", tag: "Chăm sóc chân", icon: "basin", colors: ["#d8d6be","#f7edda","#8a9871"], variants: [[45,220000],[60,280000]] },
  { id: "demo-herbal", slug: "massage-thao-duoc-demo", name: "Massage thảo dược", description: "Hương thảo mộc dịu nhẹ kết hợp thao tác massage để tạo khoảng nghỉ dưỡng dễ chịu.", tag: "Thảo mộc", icon: "herbs", colors: ["#c3d3b5","#e9e7d0","#6e8d5a"], variants: [[90,480000],[120,600000]] },
  { id: "demo-pressure", slug: "massage-bam-huyet-demo", name: "Massage bấm huyệt", description: "Các thao tác massage theo điểm và vùng cơ, ở mức độ phù hợp theo nhu cầu thư giãn.", tag: "Điểm cơ", icon: "stones", colors: ["#d9d3be","#f3e9d9","#8b805f"], variants: [[60,390000],[90,550000]] },
  { id: "demo-aroma", slug: "massage-tinh-dau-demo", name: "Massage tinh dầu", description: "Chăm sóc bằng tinh dầu tạo hương thơm nhẹ nhàng và trải nghiệm nghỉ ngơi ấm áp.", tag: "Tinh dầu", icon: "oils", colors: ["#e3d3ba","#faf0dc","#9e855a"], variants: [[60,390000],[90,520000]] },
  { id: "demo-thai", slug: "massage-thai-thu-gian-demo", name: "Massage Thái thư giãn", description: "Trải nghiệm thao tác co giãn và thư giãn cơ thể ở mức độ nhẹ nhàng.", tag: "Kiểu Thái", icon: "towel", colors: ["#c8d5c5","#f6e9d3","#738969"], variants: [[60,420000],[90,550000]] },
  { id: "demo-back", slug: "cham-soc-lung-demo", name: "Chăm sóc và thư giãn vùng lưng", description: "Liệu trình chăm sóc riêng vùng lưng, giúp bạn thư thái hơn sau khi vận động hoặc làm việc.", tag: "Chăm sóc lưng", icon: "stones", colors: ["#d5c7b8","#f8e9dc","#806c59"], variants: [[45,260000],[60,330000]] },
  { id: "demo-hair", slug: "goi-dau-duong-sinh-demo", name: "Gội đầu dưỡng sinh", description: "Chăm sóc tóc và da đầu kết hợp massage thư giãn nhẹ nhàng.", tag: "Da đầu", icon: "basin", colors: ["#b9d1ca","#f0efe0","#62877e"], variants: [[45,220000],[60,300000]] },
];

function illustration(kind, [base,cream,accent]) {
  const leaf = (x,y,scale=1) => `<g transform="translate(${x},${y}) scale(${scale})"><path d="M0 100 Q -28 44 0 -6" stroke="#61876c" stroke-width="4" fill="none"/><path d="M-5 80 Q-71 52-24 30 Q2 40-5 80ZM-3 65 Q55 27 30 10 Q3 17-3 65ZM-7 30 Q-45-15-18-29 Q3-10-7 30Z" fill="#648a69" opacity=".63"/></g>`;
  const objects = {
    stones: `<ellipse cx="350" cy="286" rx="202" ry="48" fill="#8b796d" opacity=".21"/>
      <ellipse cx="362" cy="253" rx="104" ry="40" fill="#796e65"/><ellipse cx="377" cy="220" rx="84" ry="34" fill="#595b51"/><ellipse cx="369" cy="191" rx="62" ry="26" fill="#727569"/>
      <ellipse cx="363" cy="181" rx="28" ry="8" fill="#a1a798" opacity=".31"/>${leaf(180,192,1.4)}`,
    towel: `<rect x="172" y="215" rx="30" ry="30" width="330" height="100" fill="#fff6e9" opacity=".94"/>
      <path d="M183 270 Q320 243 485 285" fill="none" stroke="#d1d9ca" stroke-width="7" opacity=".8"/>
      <ellipse cx="335" cy="212" rx="159" ry="25" fill="#fffdf2"/>
      <ellipse cx="335" cy="202" rx="158" ry="23" fill="#e7eadf"/>${leaf(488,182,1.1)}`,
    basin: `<ellipse cx="339" cy="281" rx="161" ry="33" fill="#8c9f85" opacity=".18"/>
      <path d="M191 218 L481 218 Q465 315 345 317 Q217 311 191 218Z" fill="#cec4b4"/>
      <ellipse cx="338" cy="214" rx="149" ry="43" fill="#f8f2e6"/><ellipse cx="338" cy="218" rx="127" ry="29" fill="#adc6be" opacity=".72"/>
      <circle cx="300" cy="218" r="9" fill="#f5efe2"/><circle cx="387" cy="226" r="13" fill="#f5efe2"/>${leaf(189,180,1.2)}`,
    herbs: `<ellipse cx="344" cy="276" rx="160" ry="37" fill="#849e72" opacity=".19"/>
      <path d="M220 216 Q336 250 455 216 L432 282 Q340 318 247 281Z" fill="#c4a781"/>
      <ellipse cx="337" cy="217" rx="120" ry="35" fill="#dcc6a4"/>
      ${leaf(314,155,1.1)}${leaf(382,150,1.2)}${leaf(267,168,.75)}`,
    oils: `<ellipse cx="339" cy="292" rx="174" ry="34" fill="#af976e" opacity=".19"/>
      <rect x="263" y="170" rx="13" width="107" height="126" fill="#b98c54"/>
      <rect x="276" y="184" rx="8" width="81" height="93" fill="#c5a56c"/>
      <rect x="294" y="144" rx="5" width="45" height="29" fill="#645849"/>
      <rect x="289" y="128" rx="3" width="55" height="18" fill="#d8caac"/>
      <rect x="270" y="204" rx="5" width="93" height="49" fill="#f9eed5" opacity=".75"/>${leaf(401,167,1.15)}`,
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 400" width="680" height="400">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2=".95" y2="1"><stop stop-color="${base}"/><stop offset="1" stop-color="${cream}"/></linearGradient>
      <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#faf8ed" stop-opacity=".4"/><stop offset="1" stop-color="#d7cbb4" stop-opacity=".62"/></linearGradient>
      <filter id="blur"><feGaussianBlur stdDeviation="13"/></filter>
    </defs>
    <rect width="680" height="400" fill="url(#bg)"/>
    <circle cx="559" cy="69" r="114" fill="#fff9eb" opacity=".47"/>
    <rect x="0" y="304" width="680" height="96" fill="url(#ground)"/>
    <path d="M0 334 Q340 309 680 343" stroke="#fffff2" opacity=".46" stroke-width="4" fill="none"/>
    <ellipse cx="312" cy="352" rx="230" ry="30" fill="${accent}" opacity=".09" filter="url(#blur)"/>
    ${objects[kind] || objects.stones}
    <circle cx="610" cy="43" r="23" fill="#fffaf0" opacity=".53"/>
    <path d="M46 358 l0 -39 M37 350 l18 -9 M36 331 l16 -13" stroke="${accent}" stroke-width="2" opacity=".33"/>
  </svg>`;
}

await mkdir(localDir, { recursive: true });
let uploaded = 0;
for (const def of definitions) {
  const buffer = await sharp(Buffer.from(illustration(def.icon, def.colors)))
    .webp({ quality: 82, effort: 6 }).toBuffer();
  await writeFile(join(localDir, def.id + ".webp"), buffer);
  if (process.env.BUNNY_STORAGE_API_KEY) {
    const response = await fetch(storage + "/" + def.id + ".webp", {
      method: "PUT", headers: { AccessKey: process.env.BUNNY_STORAGE_API_KEY, "Content-Type": "image/webp" },
      body: buffer, signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error("Upload failed for " + def.id + " (" + response.status + ")");
    uploaded++;
  }
}

const allProviders = JSON.parse(await readFile(join(root,"src","features","mobile","demo-ktvs.json"),"utf8"));
const data = definitions.map((def) => {
  const providers = allProviders.filter((provider) => provider.demoServices.some((item) => item.id === def.id));
  if (!providers.length) throw new Error("No demo KTV offers " + def.id);
  return {
    service: {
      id: def.id, slug: def.slug, name: def.name, description: def.description,
      isPublished: false, categoryId: "demo-category-massage",
    },
    variants: def.variants.map(([minutes,price]) => ({
      id: def.id + "-" + minutes, serviceId: def.id,
      name: minutes + " phút", durationMinutes: minutes,
      priceVnd: String(price), isActive: true,
      bufferBeforeMinutes: 0, bufferAfterMinutes: 0,
    })),
    isDemo: true,
    tag: def.tag,
    imageUrl: uploaded === definitions.length ? cdn + "/" + def.id + ".webp" : "/demo/services/" + def.id + ".webp",
    demoProviderIds: providers.map((provider) => provider.id),
  };
});
await writeFile(destination,JSON.stringify(data,null,2)+"\n","utf8");
console.log("GENERATED_DEMO_SERVICES="+data.length+" CDN_UPLOADED="+uploaded);
