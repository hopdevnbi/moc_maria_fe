export type MenuItem = { slug: string; name: string; description: string; priceVnd: number; imageUrl?: string };
export type DrinkSection = { id: string; title: string; subtitle: string; items: MenuItem[] };
function slugify(name: string): string { return name.toLowerCase().replace(/đ/g,"d").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""); }
function parseDrinks(rows: string): MenuItem[] { return rows.trim().split("\n").map(line => { const [name, price] = line.split("|"); return { name, slug: slugify(name), priceVnd: Number(price) * 1000, description: "Thức uống tươi ngon từ menu Mộc Maria." }; }); }
export const careMenu = [
  ["Chăm sóc cổ vai gáy chuyên sâu",249], ["Chăm sóc cổ vai gáy lưng eo",299],
  ["Massage chân",159], ["Massage body",349], ["Massage bầu",349],
  ["Chăm sóc giải cảm",299], ["Combo giác hơi ngải cứu",159],
  ["Chăm sóc giấc ngủ",299], ["Chăm sóc vùng đầu",299], ["Gội đầu sạch",49],
].map(([name, price]) => ({ name: String(name), priceVnd: Number(price) * 1000,
  description: "Chăm sóc và thư giãn theo bảng giá Mộc Maria.", slug: slugify(String(name)) }));

export const drinkMenu: DrinkSection[] = [
  { id: "tra-thao-moc", title: "Trà thảo mộc", subtitle: "69.000đ / ấm", items: parseDrinks(`
Trà Dưỡng Nhan|69
An Nhiên Trà|69
Kiện Tỳ Trà|69
Hoa Hồng Trà|69
Thanh Can Trà|69
Bổ Khí Huyết Trà|69
Thon Eo Trà|69
Quý Phi Trà|69`) },
  { id: "nuoc-ep-tuoi", title: "Nước ép tươi", subtitle: "Tươi ngon · Nguyên chất", items: parseDrinks(`
Nước ép cà rốt|30
Nước ép ổi|30
Nước cam vắt|30
Nước ép cam cà rốt|30
Nước ép dưa hấu|30
Nước ép dứa|30`) },
  { id: "detox", title: "Detox", subtitle: "Trái cây và thảo mộc tươi mát", items: parseDrinks(`
Detox chanh vàng - dưa leo - bạc hà|35
Detox dứa - chanh leo - bạc hà|35
Detox dưỡng nhan|35
Detox cam quế|35
Detox dâu tằm - đậu biếc|35
Detox táo xanh - cần tây|39
Maria Detox Signature|49`) },
];
