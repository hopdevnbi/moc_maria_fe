import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { eventBookingHref, GiftBookingNextStep } from "./gift-booking-next-step";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <GiftBookingNextStep rewardName="Quà đã xác nhận" />
    </QueryClientProvider>,
  );
}
describe("post-gift KTV booking", () => {
  it("uses directory portraits and carries the explicitly selected provider to the main booking site", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          providers: [
            {
              id: "p1",
              publicName: "Nguyệt Nguyễn",
              serviceArea: "Hà Nội",
              avatarUrl: "https://media.example/nguyet.webp",
              services: ["Massage chân"],
              bookingHref: "/dat-lich?provider=nguyet-nguyen",
            },
            {
              id: "p2",
              publicName: "Huyền Lành",
              serviceArea: "Hà Nội",
              avatarUrl: null,
              services: ["Gội đầu sạch"],
              bookingHref: "/dat-lich?provider=huyen-lanh",
            },
          ],
        }),
        { headers: { "Content-Type": "application/json" } },
      ),
    );
    mount();
    const first = await screen.findByRole("button", { name: "Chọn KTV Nguyệt Nguyễn" });
    expect(screen.getByRole("img", { name: "Nguyệt Nguyễn" })).toHaveAttribute(
      "src",
      "https://media.example/nguyet.webp",
    );
    expect(screen.getByRole("button", { name: "Chọn KTV để đặt lịch" })).toBeDisabled();
    fireEvent.click(first);
    expect(first).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Chọn KTV Huyền Lành" }));
    expect(first).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("link", { name: "Đặt lịch với Huyền Lành" })).toHaveAttribute(
      "href",
      "https://mocmaria.com/dat-lich?provider=huyen-lanh",
    );
  });
  it("keeps a real booking fallback when the directory response is unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("unavailable", { status: 503 }));
    mount();
    expect(await screen.findByRole("alert")).toHaveTextContent("Quà của bạn vẫn được giữ trong ví");
    expect(screen.getByRole("link", { name: "Đến trang đặt lịch" })).toHaveAttribute(
      "href",
      "https://mocmaria.com/dat-lich",
    );
    expect(screen.getByRole("button", { name: "Tải lại danh sách" })).toBeEnabled();
  });
  it("restricts directory navigation to the official booking entry", () => {
    expect(eventBookingHref("https://other.example/dat-lich?provider=p1")).toBe(
      "https://mocmaria.com/dat-lich",
    );
    expect(eventBookingHref("javascript:alert(1)")).toBe("https://mocmaria.com/dat-lich");
    expect(eventBookingHref("/dang-nhap")).toBe("https://mocmaria.com/dat-lich");
    expect(eventBookingHref("/dat-lich?provider=nguyet-nguyen")).toBe(
      "https://mocmaria.com/dat-lich?provider=nguyet-nguyen",
    );
  });
});
