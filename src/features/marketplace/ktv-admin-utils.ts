import type { Application } from "./types";

export const ktvStatusGroups = [
  { id: "ALL", label: "Tất cả" },
  { id: "PENDING", label: "Cần xử lý" },
  { id: "TRAINING", label: "Đào tạo" },
  { id: "APPROVED", label: "Đã duyệt" },
  { id: "SUSPENDED", label: "Tạm ngưng" },
  { id: "REJECTED", label: "Từ chối" },
] as const;
export type KtvStatusFilter = (typeof ktvStatusGroups)[number]["id"];
export type KtvSortOrder = "NEWEST" | "OLDEST" | "NAME";
export const KTV_PAGE_SIZE = 10;

export function foldVietnamese(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLocaleLowerCase("vi");
}

export function matchesKtvStatus(status: string, filter: KtvStatusFilter): boolean {
  switch (filter) {
    case "ALL":
      return true;
    case "PENDING":
      return status === "APPLIED" || status === "REVIEWING";
    case "TRAINING":
      return status === "TRAINING" || status === "ASSESSMENT";
    default:
      return status === filter;
  }
}

export function filterKtvApplications(
  applications: Application[],
  search: string,
  filter: KtvStatusFilter,
  order: KtvSortOrder,
): Application[] {
  const needle = foldVietnamese(search.trim());
  return applications
    .filter(
      (item) =>
        matchesKtvStatus(item.status, filter) &&
        (!needle ||
          foldVietnamese([item.publicName, item.serviceArea ?? "", item.id].join(" ")).includes(
            needle,
          )),
    )
    .sort((a, b) => {
      if (order === "NAME") return a.publicName.localeCompare(b.publicName, "vi");
      const aTime = Date.parse(a.createdAt || "") || 0;
      const bTime = Date.parse(b.createdAt || "") || 0;
      return (order === "OLDEST" ? 1 : -1) * (aTime - bTime);
    });
}
export function countKtvStatus(applications: Application[], filter: KtvStatusFilter): number {
  return applications.filter((item) => matchesKtvStatus(item.status, filter)).length;
}
export function pageCount(total: number, pageSize = KTV_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
export function initialsForName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (
    parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] || "?").slice(0, 2)
  ).toUpperCase();
}
