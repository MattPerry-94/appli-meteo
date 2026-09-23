// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

// Node 25 expose un localStorage global incomplet qui masque celui de jsdom :
// le store persiste dans un stockage en memoire, installe avant son import.
vi.hoisted(() => {
  const data = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    clear: () => data.clear(),
    key: (index: number) => [...data.keys()][index] ?? null,
    get length() {
      return data.size;
    },
  } as Storage;
});

import { MAX_FAVORITES, useAppStore, type FavoriteCity } from "@/stores/appStore";

const city = (id: string, lat: number, lon = 7): FavoriteCity => ({ id, name: id, lat, lon });

beforeEach(() => {
  useAppStore.setState({ favorites: [] });
});

describe("favoris", () => {
  it("ajoute puis retire une ville", () => {
    const nice = city("nice", 43.7);
    useAppStore.getState().toggleFavorite(nice);
    expect(useAppStore.getState().favorites).toEqual([nice]);
    useAppStore.getState().toggleFavorite(nice);
    expect(useAppStore.getState().favorites).toEqual([]);
  });

  it("reconnaît la même commune sous un autre identifiant (géolocalisation / recherche)", () => {
    useAppStore.getState().toggleFavorite(city("nice-recherche", 43.7034, 7.2663));
    useAppStore.getState().toggleFavorite(city("nice-gps", 43.7001, 7.2688));
    expect(useAppStore.getState().favorites).toEqual([]);
  });

  it("plafonne le nombre de favoris", () => {
    for (let index = 0; index < MAX_FAVORITES + 2; index += 1) useAppStore.getState().toggleFavorite(city(`v${index}`, 40 + index));
    expect(useAppStore.getState().favorites).toHaveLength(MAX_FAVORITES);
  });
});
