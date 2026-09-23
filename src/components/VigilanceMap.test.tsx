// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { VigilanceMap } from "@/components/VigilanceMap";
import type { VigilanceSnapshot } from "@/services/meteoFranceVigilance";

const snapshot: VigilanceSnapshot = {
  updatedAtISO: "2026-09-23T04:00:06Z",
  sourceUrl: "https://vigilance.meteofrance.fr/fr",
  periods: [
    {
      id: "J",
      label: "Aujourd'hui",
      summaryText: "",
      departments: [
        { code: "06", overallLevel: 3, risks: { 3: 3, 1: 2 } },
        { code: "83", overallLevel: 2, risks: { 3: 2 } },
        { code: "59", overallLevel: 1, risks: { 1: 1 } },
      ],
    },
    { id: "J1", label: "Demain", summaryText: "", departments: [{ code: "06", overallLevel: 1, risks: {} }] },
  ],
};

afterEach(cleanup);

describe("VigilanceMap", () => {
  it("liste les départements en vigilance, du plus grave au moins grave", () => {
    render(<VigilanceMap snapshot={snapshot} highlightCode="06" />);
    const list = screen.getByText("Départements en vigilance").parentElement!;
    const items = within(list).getAllByRole("button").map((button) => button.textContent);
    expect(items).toEqual(["Alpes-Maritimes06", "Var83"]);
  });

  it("détaille les risques du département de la ville active", () => {
    render(<VigilanceMap snapshot={snapshot} highlightCode="06" />);
    expect(screen.getByText("Vigilance orange")).toBeTruthy();
    expect(screen.getByText("Orages · orange")).toBeTruthy();
    expect(screen.getByText("Vent · jaune")).toBeTruthy();
  });

  it("filtre par risque et change d'échéance", () => {
    render(<VigilanceMap snapshot={snapshot} highlightCode="06" />);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "1" } });
    const list = screen.getByText(/Départements en vigilance/).parentElement!;
    expect(within(list).getAllByRole("button").map((button) => button.textContent)).toEqual(["Alpes-Maritimes06"]);

    fireEvent.click(screen.getByRole("tab", { name: "Demain" }));
    expect(screen.getByText("Aucun département en vigilance jaune ou plus.")).toBeTruthy();
  });
});
