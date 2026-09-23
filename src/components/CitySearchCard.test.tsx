// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CitySearchCard } from "@/components/CitySearchCard";

function renderCard() {
  const onSelect = vi.fn();
  render(<CitySearchCard onSelect={onSelect} onLocate={async () => false} locationError={null} />);
  return { onSelect, input: screen.getByRole("searchbox", { name: "Rechercher une ville" }) };
}

function mockFetch(response: () => Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(response));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CitySearchCard", () => {
  it("affiche les villes trouvées et transmet la ville choisie", async () => {
    mockFetch(async () =>
      Response.json({
        results: [{ name: "Nice", admin1: "Provence-Alpes-Côte d'Azur", admin2: "Alpes-Maritimes", country_code: "FR", latitude: 43.7, longitude: 7.27 }],
      }),
    );
    const { onSelect, input } = renderCard();

    fireEvent.change(input, { target: { value: "Nice" } });
    fireEvent.click(await screen.findByText("Nice"));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: "Nice", departmentCode: "06" }));
    expect(input).toHaveProperty("value", "");
  });

  it("indique quand aucune ville ne correspond", async () => {
    mockFetch(async () => Response.json({}));
    const { input } = renderCard();

    fireEvent.change(input, { target: { value: "Xyzzy" } });

    expect(await screen.findByText("Aucune ville trouvée pour « Xyzzy ».")).toBeTruthy();
  });

  it("distingue une panne d'une recherche vide", async () => {
    mockFetch(async () => new Response("", { status: 503 }));
    const { input } = renderCard();

    fireEvent.change(input, { target: { value: "Nice" } });

    expect((await screen.findByRole("alert")).textContent).toContain("indisponible");
    expect(screen.queryByText(/Aucune ville trouvée/)).toBeNull();
  });
});
