import { PublicPageLoading } from "@/shared/loading/public-page-loading";

export default function Loading() {
  return (
    <PublicPageLoading
      page="providers"
      title="Đang mở hồ sơ kỹ thuật viên"
      description="Chuẩn bị thông tin và dịch vụ của KTV bạn đã chọn."
    />
  );
}
