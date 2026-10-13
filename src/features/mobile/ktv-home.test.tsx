import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KtvFirstHomepage } from "./ktv-home";
import providers from "./demo-ktvs.json";
import { careMenu } from "./official-menu";
import { officialDemoKtvOffers } from "./official-ktv-offers";
import { formatPrice } from "@/features/marketplace/format";

vi.mock("./experience", () => ({ MobileHeader: () => null, MobileNavigation: () => null }));
vi.mock("./useCatalogRealtime", () => ({ useCatalogRealtime: () => undefined }));
vi.mock("@/features/provider-reviews/reviews", () => ({ ProviderRating: () => null }));
vi.mock("next/image", () => ({ default: () => null }));
afterEach(cleanup);
function mount() {
  return render(
    <KtvFirstHomepage
      providers={providers}
      services={[]}
      providersUnavailable={false}
      catalogUnavailable={false}
    />,
  );
}

describe("KTV cards and service filters", () => {
  it("shows every assigned service and its menu price, including fourth and fifth rows", () => {
    const { container } = mount();
    const cards = container.querySelectorAll(".ktv-card");
    expect(cards).toHaveLength(10);
    providers.forEach((provider, index) => {
      const offers = officialDemoKtvOffers(provider);
      const rows = within(cards[index] as HTMLElement).getAllByRole("listitem");
      expect(rows).toHaveLength(offers.length);
      offers.forEach((offer, row) => {
        expect(within(rows[row]).getByText(offer.name)).toBeInTheDocument();
        expect(rows[row].querySelector(".ktv-offer-end > span")?.textContent).toBe(
          formatPrice(offer.price),
        );
      });
    });
  });

  it.each(careMenu.map((item) => [item.name, item.slug]))(
    "every result for %s visibly lists that service",
    (name, slug) => {
      const { container } = mount();
      fireEvent.click(screen.getByRole("button", { name }));
      const expected = providers.filter((p) => officialDemoKtvOffers(p).some((s) => s.id === slug));
      const cards = [...container.querySelectorAll<HTMLElement>(".ktv-card")];
      expect(cards).toHaveLength(expected.length);
      expected.forEach((provider, index) => {
        expect(within(cards[index]).getByText(provider.publicName)).toBeInTheDocument();
        expect(within(cards[index]).getByText(name)).toBeInTheDocument();
      });
      if (slug === "goi-dau-sach") {
        expect(expected.map((p) => p.publicName)).toEqual(["Mai Anh", "Thanh Trúc", "Minh Châu"]);
      }
      fireEvent.click(screen.getByRole("button", { name: "Tất cả KTV" }));
      expect(container.querySelectorAll(".ktv-card")).toHaveLength(10);
    },
  );
});
