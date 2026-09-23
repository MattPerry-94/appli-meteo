// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FavoritesBar } from "@/components/FavoritesBar";
import type { FavoriteCity } from "@/stores/appStore";

const nice: FavoriteCity = { id: "nice", name: "Nice", lat: 43.7, lon: 7.27 };
const lille: FavoriteCity = { id: "lille", name: "Lille", lat: 50.63, lon: 3.06 };

afterEach(cleanup);

describe("FavoritesBar", () => {
  it("invite à ajouter des favoris quand il n'y en a aucun", () => {
    render(<FavoritesBar favorites={[]} briefs={{}} activeCity={nice} onSelect={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByText(/Ajoutez des villes en favori/)).toBeTruthy();
  });

  it("affiche l'aperçu, marque la ville active et transmet les clics", () => {
    const onSelect = vi.fn();
    const onRemove = vi.fn();
    render(
      <FavoritesBar
        favorites={[nice, lille]}
        briefs={{ lille: { cityId: "lille", tempC: 14.4, tempMinC: 9, tempMaxC: 16, weatherCode: 61 } }}
        activeCity={nice}
        onSelect={onSelect}
        onRemove={onRemove}
      />,
    );

    expect(screen.getByRole("button", { name: /^Nice/ }).getAttribute("aria-current")).toBe("true");
    expect(screen.getByText("14°")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /^Lille/ }));
    expect(onSelect).toHaveBeenCalledWith(lille);

    fireEvent.click(screen.getByRole("button", { name: "Retirer Lille des favoris" }));
    expect(onRemove).toHaveBeenCalledWith(lille);
  });
});
