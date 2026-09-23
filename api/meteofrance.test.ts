import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "./meteofrance";

const UPSTREAM = "https://public-api.meteofrance.fr/public/DPVigilance/v1";

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  process.env.METEOFRANCE_API_KEY = "cle-de-test";
  fetchMock = vi.fn(async () => new Response('{"product":{}}', { status: 200, headers: { "content-type": "application/json" } }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.METEOFRANCE_API_KEY;
});

describe("proxy Météo-France", () => {
  it("lit l'endpoint dans ?path= (réécriture de vercel.json)", async () => {
    const response = await handler(new Request("https://site.test/api/meteofrance?path=cartevigilance/encours"));

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(`${UPSTREAM}/cartevigilance/encours`, expect.anything());
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).get("ApiKey")).toBe("cle-de-test");
    expect(response.headers.get("cache-control")).toContain("s-maxage=300");
  });

  it("accepte aussi le chemin brut", async () => {
    const response = await handler(new Request("https://site.test/api/meteofrance/textesvigilance/encours"));
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(`${UPSTREAM}/textesvigilance/encours`, expect.anything());
  });

  it("refuse un endpoint hors liste blanche", async () => {
    const response = await handler(new Request("https://site.test/api/meteofrance?path=../autre/api"));
    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("explique une clé absente", async () => {
    delete process.env.METEOFRANCE_API_KEY;
    const response = await handler(new Request("https://site.test/api/meteofrance?path=cartevigilance/encours"));
    expect(response.status).toBe(500);
    expect(((await response.json()) as { error: string }).error).toMatch(/METEOFRANCE_API_KEY/);
  });

  it("ne met pas une erreur de Météo-France en cache", async () => {
    fetchMock.mockResolvedValueOnce(new Response('{"detail":"no matching blob"}', { status: 404 }));
    const response = await handler(new Request("https://site.test/api/meteofrance?path=cartevigilance/encours"));
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
