import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StaffSelfiePreview } from "./staff-selfie-preview";

const url =
  "https://giangxa-media-cdn.b-cdn.net/moc-maria/staff-attendance/2026-11-05/id/photo.webp";

describe("mobile selfie preview CDN failover", () => {
  it("uses the direct CDN and falls back to the same-origin optimizer when the mobile image fails", () => {
    render(<StaffSelfiePreview url={url} date="05/11/2026" />);
    const img = screen.getByRole("img", { name: "Ảnh selfie điểm danh ngày 05/11/2026" });
    expect(img).toHaveAttribute("src", url);
    expect(img).toHaveAttribute("loading", "eager");
    expect(img).not.toHaveAttribute("referrerpolicy", "no-referrer");
    fireEvent.error(img);
    expect(img).toHaveAttribute("src", `/_next/image?url=${encodeURIComponent(url)}&w=750&q=75`);
    fireEvent.error(img);
    expect(screen.getByRole("alert")).toHaveTextContent("Chưa tải được ảnh trên thiết bị này");
    fireEvent.click(screen.getByRole("button", { name: "Thử tải lại" }));
    expect(screen.getByRole("img", { name: /Ảnh selfie điểm danh ngày/ })).toHaveAttribute(
      "src",
      `${url}?retry=1`,
    );
  });
});
