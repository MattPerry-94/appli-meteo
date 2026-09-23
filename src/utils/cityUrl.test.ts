import { describe, expect, it } from "vitest";
import { cityFromParams, cityToParams, shareUrlFor, withoutCityParams } from "@/utils/cityUrl";
import type { FavoriteCity } from "@/stores/appStore";

const nice: FavoriteCity = {
  id: "nice",
  name: "Nice",
  lat: 43.70344,
  lon: 7.26627,
  postalCode: "06000",
  departmentCode: "06",
  countryCode: "FR",
};

describe("ville dans l'URL", () => {
  it("fait l'aller-retour ville → paramètres → ville", () => {
    const city = cityFromParams(new URLSearchParams(cityToParams(nice)));
    expect(city).toMatchObject({ name: "Nice", lat: 43.7034, lon: 7.2663, postalCode: "06000", departmentCode: "06", countryCode: "FR" });
  });

  it("refuse des coordonnées absentes ou impossibles", () => {
    expect(cityFromParams(new URLSearchParams("ville=Nice"))).toBeNull();
    expect(cityFromParams(new URLSearchParams("ville=Nice&lat=120&lon=7"))).toBeNull();
    expect(cityFromParams(new URLSearchParams("lat=43&lon=7"))).toBeNull();
  });

  it("garde les autres paramètres de la page", () => {
    const params = withoutCityParams(new URLSearchParams("vue=vigilances&ville=Nice&lat=43&lon=7"));
    expect(params.toString()).toBe("vue=vigilances");
  });

  it("construit un lien de partage absolu", () => {
    expect(shareUrlFor(nice, "https://meteo.test")).toBe(
      "https://meteo.test/?ville=Nice&lat=43.7034&lon=7.2663&cp=06000&dep=06&pays=FR",
    );
  });
});
