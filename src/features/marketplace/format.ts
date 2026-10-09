export function formatPrice(value: string | number): string {
  const amount = Number(value);
  if (!String(value).trim() || !Number.isSafeInteger(amount) || amount < 0) {
    return "Giá đang được cập nhật";
  }
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export const applicationLabels: Record<string, string> = {
  APPLIED: "Đã gửi hồ sơ",
  REVIEWING: "Đang xem xét",
  TRAINING: "Đang đào tạo",
  ASSESSMENT: "Đang đánh giá",
  APPROVED: "Đã được duyệt",
  REJECTED: "Chưa được duyệt",
  SUSPENDED: "Tạm dừng phục vụ",
};

export const enrollmentLabels: Record<string, string> = {
  ENROLLED: "Đã ghi danh",
  IN_PROGRESS: "Đang học",
  COMPLETED: "Đã hoàn thành",
  FAILED: "Cần đào tạo thêm",
};
