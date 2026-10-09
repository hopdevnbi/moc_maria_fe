import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cdn = "https://giangxa-media-cdn.b-cdn.net/moc-maria/demo-ktv/2026-10";
const storageBase = "https://sg.storage.bunnycdn.com/giangxa-media/moc-maria/demo-ktv/2026-10";
const services = {
  relaxation: { id: "demo-relaxation", name: "Massage thư giãn toàn thân", durationMinutes: 60, priceVnd: 350000 },
  hotStone: { id: "demo-hot-stone", name: "Massage đá nóng", durationMinutes: 90, priceVnd: 500000 },
  neck: { id: "demo-neck", name: "Massage cổ vai gáy", durationMinutes: 45, priceVnd: 250000 },
  foot: { id: "demo-foot", name: "Massage chân", durationMinutes: 45, priceVnd: 220000 },
  herbal: { id: "demo-herbal", name: "Massage thảo dược", durationMinutes: 90, priceVnd: 480000 },
  pressure: { id: "demo-pressure", name: "Massage bấm huyệt", durationMinutes: 60, priceVnd: 390000 },
  aroma: { id: "demo-aroma", name: "Massage tinh dầu", durationMinutes: 60, priceVnd: 390000 },
  thai: { id: "demo-thai", name: "Massage Thái thư giãn", durationMinutes: 60, priceVnd: 420000 },
  back: { id: "demo-back", name: "Chăm sóc và thư giãn vùng lưng", durationMinutes: 45, priceVnd: 260000 },
  hair: { id: "demo-hair", name: "Gội đầu dưỡng sinh", durationMinutes: 45, priceVnd: 220000 },
};
const entries = [
  ["Linh Anh", 26, 3, "Cầu Giấy · Hà Nội", ["relaxation","hotStone","neck","aroma"], "#d3c6ad", "#3e4c38"],
  ["Mai Anh", 25, 2, "Nam Từ Liêm · Hà Nội", ["relaxation","neck","foot","hair"], "#d2bfad", "#465d48"],
  ["Thu Hà", 28, 5, "Đống Đa · Hà Nội", ["hotStone","herbal","relaxation","thai"], "#b9cbb5", "#4e654f"],
  ["Bảo Ngọc", 27, 4, "Hà Đông · Hà Nội", ["neck","pressure","herbal","back"], "#c4d1c5", "#445d48"],
  ["Hương Ly", 26, 3, "Tây Hồ · Hà Nội", ["relaxation","hotStone","foot","aroma"], "#e2c8ad", "#31593d"],
  ["Ngọc Anh", 29, 6, "Thanh Xuân · Hà Nội", ["pressure","neck","hotStone","thai","back"], "#c3cbab", "#49624c"],
  ["Thanh Trúc", 24, 2, "Hoài Đức · Hà Nội", ["foot","relaxation","herbal","hair"], "#d7c9ae", "#596849"],
  ["Phương Thảo", 30, 7, "Ba Đình · Hà Nội", ["herbal","pressure","hotStone","aroma","thai"], "#c5d1c2", "#365b48"],
  ["Minh Châu", 27, 4, "Long Biên · Hà Nội", ["relaxation","foot","neck","hair","back"], "#ddc9b4", "#4b6854"],
  ["Khánh Linh", 25, 3, "Bắc Từ Liêm · Hà Nội", ["hotStone","relaxation","herbal","aroma","back"], "#c6d1bd", "#5c735c"],
];
const palettes = [
  ["#e6c9b7", "#362521", "#d2a787"], ["#eed1b9", "#302d2b", "#ca8c77"],
  ["#e9c8ae", "#432e27", "#ca9481"], ["#f0d4b9", "#231f1d", "#d9a68c"],
  ["#e3baa6", "#41312a", "#cc9380"], ["#eec9b5", "#25211f", "#cca38c"],
  ["#ebc7b4", "#342520", "#d19f88"], ["#e6b9a4", "#332a2a", "#cc9780"],
  ["#f0d0b8", "#332a25", "#c99d8b"], ["#e3c2ac", "#292528", "#c9957f"],
];

function portrait(index, background, uniform) {
  const [skin,hair,shade] = palettes[index];
  const hairstyle = index % 4;
  const leaf = (x,y,r) => `<path d="M ${x} ${y} Q ${x+r} ${y-r*2} ${x+r*2} ${y} Q ${x+r} ${y+r*1.4} ${x} ${y}" fill="#e4efe2" opacity=".45" transform="rotate(-24 ${x} ${y})"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="384" viewBox="0 0 320 384">
    <defs>
      <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1"><stop stop-color="${background}"/><stop offset="1" stop-color="#fbf7ec"/></linearGradient>
      <linearGradient id="skin" x1="0" x2=".7" y1="0" y2="1"><stop stop-color="${skin}"/><stop offset="1" stop-color="${shade}"/></linearGradient>
      <linearGradient id="cloth" x1=".1" y1="0" x2="1" y2="1"><stop stop-color="${uniform}"/><stop offset="1" stop-color="#283e34"/></linearGradient>
      <filter id="blur"><feGaussianBlur stdDeviation="14"/></filter>
    </defs>
    <rect width="320" height="384" rx="12" fill="url(#bg)"/>
    <circle cx="280" cy="34" r="75" fill="#f8eee0" opacity=".65"/>
    <circle cx="18" cy="338" r="76" fill="#a6b9a3" opacity=".16" filter="url(#blur)"/>
    <g transform="translate(250 55) rotate(-20)"><path d="M 0 140 Q -33 40 8 -20" stroke="#6b9073" stroke-width="4" fill="none" opacity=".36"/>${Array.from({length:6},(_,i)=>leaf(i%2?0:8,i*24,10)).join("")}</g>
    <g transform="translate(-65 150) rotate(16)"><path d="M 0 140 Q -33 40 8 -20" stroke="#6b9073" stroke-width="4" fill="none" opacity=".26"/>${Array.from({length:5},(_,i)=>leaf(0,i*24,12)).join("")}</g>
    <ellipse cx="160" cy="385" rx="159" ry="90" fill="url(#cloth)"/>
    <path d="M 64 384 Q 72 278 139 270 L 183 270 Q 257 285 270 384" fill="url(#cloth)"/>
    <path d="M 129 270 L 158 323 L 194 270 Q 176 259 164 258 Q 144 258 129 270Z" fill="#fcf6e9" opacity=".91"/>
    <rect x="144" y="243" width="33" height="57" rx="15" fill="url(#skin)"/>
    <path d="M 98 148 Q 91 73 151 62 Q 213 54 231 125 Q 238 173 228 270 Q 212 291 190 274 L 187 191 L 122 194 L 129 276 Q 100 284 95 259Z" fill="${hair}"/>
    <ellipse cx="160" cy="168" rx="63" ry="88" fill="url(#skin)"/>
    <path d="M 92 152 Q 102 66 160 65 Q 222 67 228 145 Q 211 116 205 115 Q 167 110 146 90 Q 128 119 92 152Z" fill="${hair}"/>
    ${hairstyle===0 ? `<path d="M 104 113 Q 101 181 111 242" stroke="${hair}" stroke-width="19" fill="none" stroke-linecap="round"/><path d="M 211 111 Q 233 171 213 250" stroke="${hair}" stroke-width="22" fill="none" stroke-linecap="round"/>` :
    hairstyle===1 ? `<path d="M 116 95 Q 105 141 113 190" stroke="${hair}" stroke-width="13" fill="none" stroke-linecap="round"/><path d="M 210 85 Q 247 103 235 155" stroke="${hair}" stroke-width="24" fill="none" stroke-linecap="round"/>`:
    hairstyle===2 ? `<ellipse cx="215" cy="82" rx="29" ry="23" fill="${hair}"/><path d="M 203 120 Q 213 153 213 210" stroke="${hair}" stroke-width="15" fill="none" stroke-linecap="round"/>`:
    `<path d="M 124 87 Q 93 123 110 215" stroke="${hair}" stroke-width="23" fill="none" stroke-linecap="round"/><path d="M 212 124 Q 232 201 205 235" stroke="${hair}" stroke-width="20" fill="none" stroke-linecap="round"/>`}
    <path d="M 119 154 Q 131 148 144 155" fill="none" stroke="#694b41" stroke-width="3" stroke-linecap="round"/>
    <path d="M 176 155 Q 187 148 201 152" fill="none" stroke="#694b41" stroke-width="3" stroke-linecap="round"/>
    <path d="M 123 165 Q 134 169 143 164 M 178 165 Q 187 169 198 163" fill="none" stroke="#493b3b" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="137" cy="165" r="2.7" fill="#392d2e"/><circle cx="185" cy="164" r="2.7" fill="#392d2e"/>
    <path d="M 160 166 L 153 195 Q 160 198 167 195" fill="none" stroke="#aa7969" stroke-width="2" opacity=".65"/>
    <path d="M 144 220 Q 160 229 178 217" fill="none" stroke="#aa5d60" stroke-width="3.3" stroke-linecap="round"/>
    <ellipse cx="118" cy="196" rx="14" ry="8" fill="#d8877e" opacity=".18"/><ellipse cx="201" cy="195" rx="14" ry="8" fill="#d8877e" opacity=".18"/>
    <circle cx="98" cy="194" r="4" fill="#c0a67d" opacity=".9"/><circle cx="225" cy="194" r="4" fill="#c0a67d" opacity=".9"/>
    <path d="M 100 150 Q 103 113 120 98" fill="none" stroke="#ffffff" stroke-width="4" opacity=".09"/>
    <circle cx="273" cy="28" r="28" fill="#fff" opacity=".47"/>
  </svg>`;
}

const outputDir = path.join(root, "public", "demo", "ktv");
await mkdir(outputDir, { recursive: true });
let uploaded = 0;
for (let i=0; i<entries.length; i++) {
  const [, , , , , background, uniform] = entries[i];
  const id = "demo-ktv-" + String(i+1).padStart(2,"0");
  const buffer = await sharp(Buffer.from(portrait(i,background,uniform))).webp({ quality: 85, effort: 5 }).toBuffer();
  await writeFile(path.join(outputDir,id+".webp"),buffer);
  if (process.env.BUNNY_STORAGE_API_KEY) {
    const response = await fetch(storageBase + "/" + id + ".webp", {
      method: "PUT", headers: { AccessKey: process.env.BUNNY_STORAGE_API_KEY, "Content-Type": "image/webp" }, body: buffer,
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error("CDN_UPLOAD_FAILED avatar="+id+" http="+response.status);
    uploaded++;
  }
}
const useCdn = uploaded === 10;
const data = entries.map(([publicName,age,yearsExperience,serviceArea,skills],i)=>{
  const id = "demo-ktv-" + String(i+1).padStart(2,"0");
  return {
    id, publicName, age, yearsExperience, serviceArea,
    title: "Kỹ thuật viên massage",
    introduction: `Tập trung vào ${services[skills[0]].name.toLocaleLowerCase("vi-VN")} và ${services[skills[1]].name.toLocaleLowerCase("vi-VN")}. Phong cách chăm sóc nhẹ nhàng, chú trọng sự thoải mái của khách hàng.`,
    avatarUrl: useCdn ? cdn+"/"+id+".webp" : "/demo/ktv/"+id+".webp",
    isDemo: true, bookable: false, eligibleServices: [],
    demoServices: skills.map((key)=>services[key]),
  };
});
const jsonPath = path.join(root,"src","features","mobile","demo-ktvs.json");
await writeFile(jsonPath,JSON.stringify(data,null,2)+"\n","utf8");
console.log("GENERATED="+data.length+" CDN_UPLOADED="+uploaded+" TOTAL_LOCAL_AVATARS="+entries.length);
