import type { Provider } from "@/features/marketplace/types";

// Owner-supplied KTV.txt, 2026-11-01. Preserve historical demo IDs and aliases.
// Birth years do not establish exact ages or years of experience.
const cdn = "https://giangxa-media-cdn.b-cdn.net/moc-maria/ktv/roster-20261101/";
const roster: Record<
  string,
  Pick<Provider, "publicName" | "title" | "introduction" | "avatarUrl"> & { birthYear: number }
> = {
  "demo-ktv-01": {
    publicName: "Nguyệt Nguyễn", birthYear: 1985,
    title: "Kỹ thuật viên massage body chuyên sâu",
    introduction: "Nhiệt tình, tận tâm, đôi tay mềm dẻo và khéo léo. Thế mạnh là massage body chuyên sâu. Ca thường lệ 14:00–22:00, đôi khi có điều chỉnh.",
    avatarUrl: cdn + "nguyet-nguyen-a39108e3dbf4.jpg",
  },
  "demo-ktv-02": {
    publicName: "Huyền Lành", birthYear: 1994,
    title: "Kỹ thuật viên giải cơ",
    introduction: "Nhiệt tình, tận tâm, lực tay khỏe và đều. Nổi bật với kỹ thuật giải cơ. Ca thường lệ 08:00–15:00.",
    avatarUrl: cdn + "huyen-lanh-7b769c516db5.jpg",
  },
  "demo-ktv-03": {
    publicName: "Hoàng Anh", birthYear: 2006,
    title: "Kỹ thuật viên, chuyên môn điều dưỡng",
    introduction: "Kỹ thuật viên nam có chuyên môn điều dưỡng, chăm chỉ, chịu khó và cần cù. Thế mạnh là giải cơ sâu.",
    avatarUrl: cdn + "hoang-anh-d5c54c85aed5.jpg",
  },
  "demo-ktv-04": {
    publicName: "Sơn Tùng Thảo Y", birthYear: 1992,
    title: "Kỹ thuật viên giải cơ sâu và bấm huyệt",
    introduction: "Nhiệt tình, ít nói, có thế mạnh giải cơ sâu và bấm huyệt. Theo thông tin cơ sở, đang học năm thứ 4 ngành Y học cổ truyền.",
    avatarUrl: cdn + "son-tung-thao-y-7e43bee9234f.jpg",
  },
  "demo-ktv-05": {
    publicName: "Bác sĩ Tiến Mạnh", birthYear: 1986,
    title: "Bác sĩ Y học cổ truyền · Phục hồi chức năng",
    introduction: "Định hướng chuyên môn, hỗ trợ đánh giá sức khỏe và tư vấn hướng chăm sóc phù hợp. Chuyên môn về phục hồi chức năng, cơ xương khớp và thần kinh.",
    avatarUrl: cdn + "bac-si-tien-manh-8122113ebff0.jpg",
  },
  "demo-ktv-06": {
    publicName: "Nguyễn Hoàn", birthYear: 1992,
    title: "Quản lý · Kỹ thuật viên phục hồi chức năng",
    introduction: "Quản lý nữ, chuyên ngành kỹ thuật viên phục hồi chức năng. Kỹ năng nổi bật: diện chẩn, chăm sóc vùng đầu và giải cơ chuyên sâu.",
    avatarUrl: null,
  },
  "demo-ktv-07": {
    publicName: "Linh Đan", birthYear: 1995,
    title: "Quản lý · Chăm sóc thư giãn",
    introduction: "Quản lý nữ nhiệt tình, chu đáo; có thế mạnh chăm sóc nhẹ nhàng, phù hợp khách hàng cần thư giãn.",
    avatarUrl: null,
  },
};

export function officialKtvProfiles<T extends Provider>(profiles: T[]): T[] {
  return profiles.flatMap((profile) => {
    const item = roster[profile.id];
    if (!item) return [];
    return [{
      ...profile, ...item,
      introduction: item.introduction + " Sinh năm " + item.birthYear + ".",
      age: undefined, yearsExperience: null, serviceArea: "Hà Nội",
      avatarAlt: "Ảnh thực tế của " + item.publicName,
      scheduleOpen: false, weeklySchedule: null,
    }];
  });
}
