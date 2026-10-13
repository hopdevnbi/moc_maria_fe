import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { BrandLogo } from "./brand-logo";
import { MOC_MARIA_LOGO_URL, MOC_MARIA_LOGO_FALLBACK_URL } from "./brand";
vi.mock("next/image", () => ({
  default: ({ src, alt, onError }: { src: string; alt: string; onError: () => void }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} onError={onError} />
  ),
}));
afterEach(cleanup);
it("recovers a failed CDN logo with same-site PNG and stops retrying the failed CDN", () => {
  render(<BrandLogo alt="Mộc Maria" width={65} height={65} />);
  const image = screen.getByRole("img", { name: "Mộc Maria" });
  expect(image).toHaveAttribute("src", MOC_MARIA_LOGO_URL);
  fireEvent.error(image);
  expect(image).toHaveAttribute("src", MOC_MARIA_LOGO_FALLBACK_URL);
  fireEvent.error(image);
  expect(image).toHaveAttribute("src", MOC_MARIA_LOGO_FALLBACK_URL);
});
