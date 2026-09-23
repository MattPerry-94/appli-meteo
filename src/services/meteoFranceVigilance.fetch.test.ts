// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchMeteoFranceVigilance } from "@/services/meteoFranceVigilance";

const carte = { product: { update_time: "2026-09-23T04:00:06Z", periods: [] } };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function mockResponses(...responses: Array<() => Response>) {
  const fetchMock = vi.fn(async () => (responses.shift() ?? responses[responses.length - 1])());
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("fetchMeteoFranceVigilance", () => {
  it("retente quand Météo-France est en pleine publication (404 no matching blob)", async () => {
    const fetchMock = mockResponses(
      () => json({ detail: "no matching blob" }, 404),
      () => json(carte),
    );

    const promise = fetchMeteoFranceVigilance();
    await vi.runAllTimersAsync();
    const snapshot = await promise;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(snapshot.updatedAtISO).toBe("2026-09-23T04:00:06Z");
  });

  it("explique la publication en cours si elle persiste", async () => {
    const gap = () => json({ detail: "no matching blob" }, 404);
    mockResponses(gap, gap, gap);

    const promise = fetchMeteoFranceVigilance();
    const assertion = expect(promise).rejects.toThrow(/en train de publier/);
    await vi.runAllTimersAsync();
    await assertion;
  });

  it("signale un relais absent quand le 404 ne vient pas de Météo-France", async () => {
    const fetchMock = mockResponses(() => new Response("The page could not be found", { status: 404 }));

    const promise = fetchMeteoFranceVigilance();
    const assertion = expect(promise).rejects.toThrow(/relais Météo-France/);
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("remonte le message du proxy tel quel", async () => {
    mockResponses(() => json({ error: "Clé Météo-France absente côté serveur." }, 500));

    const promise = fetchMeteoFranceVigilance();
    const assertion = expect(promise).rejects.toThrow("Clé Météo-France absente côté serveur.");
    await vi.runAllTimersAsync();
    await assertion;
  });
});
