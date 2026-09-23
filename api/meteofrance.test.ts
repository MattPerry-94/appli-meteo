import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as handler } from "./meteofrance";

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

  it("retire les guillemets recopiés autour de la clé", async () => {
    process.env.METEOFRANCE_API_KEY = ' "cle-de-test" ';
    await handler(new Request("https://site.test/api/meteofrance?path=cartevigilance/encours"));
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).get("ApiKey")).toBe("cle-de-test");
  });

  it("dit quand la passerelle d'API refuse, avec son code", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('{"code":"900908","message":"Resource forbidden"}', { status: 403, headers: { "content-type": "application/json" } }),
    );
    const response = await handler(new Request("https://site.test/api/meteofrance?path=cartevigilance/encours"));
    expect(response.status).toBe(403);
    const { error } = (await response.json()) as { error: string };
    expect(error).toContain("clé de 11 caractères");
    expect(error).toContain("passerelle d'API : 900908 — Resource forbidden");
    expect(error).not.toContain("cle-de-test");
  });

  it("dit quand un pare-feu refuse (page HTML)", async () => {
    fetchMock.mockResolvedValueOnce(new Response("<html><body><h1>Access Denied</h1></body></html>", { status: 403 }));
    const response = await handler(new Request("https://site.test/api/meteofrance?path=cartevigilance/encours"));
    const { error } = (await response.json()) as { error: string };
    expect(error).toContain("pare-feu");
    expect(error).toContain("Access Denied");
  });

  it("ne met pas une erreur de Météo-France en cache", async () => {
    fetchMock.mockResolvedValueOnce(new Response('{"detail":"no matching blob"}', { status: 404 }));
    const response = await handler(new Request("https://site.test/api/meteofrance?path=cartevigilance/encours"));
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
