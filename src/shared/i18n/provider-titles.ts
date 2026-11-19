import type { Locale } from "./locale";

/** Exact observed source titles: do not infer qualifications or silently reuse a stale title. */
const rows = [
  [
    "Kỹ thuật viên massage body chuyên sâu",
    "Deep-tissue body massage therapist",
    "전신 심부 마사지 테라피스트",
    "深層ボディマッサージセラピスト",
    "深层全身按摩理疗师",
    "Специалист по глубокому массажу тела",
  ],
  [
    "Kỹ thuật viên giải cơ",
    "Muscle relaxation therapist",
    "근육 이완 테라피스트",
    "筋肉リラクゼーションセラピスト",
    "肌肉放松理疗师",
    "Специалист по расслаблению мышц",
  ],
  [
    "Kỹ thuật viên, chuyên môn điều dưỡng",
    "Therapist with nursing training",
    "간호 분야 전문 지식을 갖춘 테라피스트",
    "看護の専門知識を持つセラピスト",
    "具备护理专业背景的理疗师",
    "Специалист с подготовкой в области сестринского дела",
  ],
  [
    "Kỹ thuật viên giải cơ sâu và bấm huyệt",
    "Deep muscle release and acupressure therapist",
    "심부 근육 이완 및 지압 테라피스트",
    "深層筋リリース・指圧セラピスト",
    "深层肌肉放松与穴位按压理疗师",
    "Специалист по глубокому расслаблению мышц и точечному массажу",
  ],
  [
    "Bác sĩ Y học cổ truyền · Phục hồi chức năng",
    "Traditional medicine doctor · Rehabilitation",
    "전통의학 의사 · 재활",
    "伝統医学の医師・リハビリテーション",
    "传统医学医生 · 康复",
    "Врач традиционной медицины · Реабилитация",
  ],
  [
    "Quản lý · Kỹ thuật viên phục hồi chức năng",
    "Manager · Rehabilitation technician",
    "매니저 · 재활 전문가",
    "マネージャー・リハビリテーション技術者",
    "管理人员 · 康复技术人员",
    "Управляющая · Специалист по реабилитации",
  ],
  [
    "Quản lý · Chăm sóc thư giãn",
    "Manager · Relaxation care",
    "매니저 · 릴랙세이션 케어",
    "マネージャー・リラクゼーションケア",
    "管理人员 · 放松护理",
    "Управляющая · Расслабляющий уход",
  ],
  [
    "Kỹ thuật viên giải cơ sâu",
    "Deep muscle release therapist",
    "심부 근육 이완 테라피스트",
    "深層筋リリースセラピスト",
    "深层肌肉放松理疗师",
    "Специалист по глубокому расслаблению мышц",
  ],
] as const;
const index: Record<Locale, 0 | 1 | 2 | 3 | 4 | 5> = {
  vi: 0,
  en: 1,
  ko: 2,
  ja: 3,
  "zh-CN": 4,
  ru: 5,
};
const titles = new Map<string, (typeof rows)[number]>(rows.map((row) => [row[0], row]));
export function providerTitle(locale: Locale, title?: string | null): string {
  if (!title) return "";
  return titles.get(title.trim().normalize("NFC"))?.[index[locale]] ?? title;
}
export const providerTitleSources = rows.map((row) => row[0]);
