import { describe, it, expect } from "vitest";
import { aggregateSalesByGenre } from "./salesSummary";

describe("aggregateSalesByGenre", () => {
  it("sums total units and splits by genre", () => {
    const { totalUnitsSold, unitsByGenre } = aggregateSalesByGenre([
      {
        quantity: 2,
        genreIds: ["g1", "g2"],
        genreNames: { g1: "A", g2: "B" },
      },
      {
        quantity: 1,
        genreIds: ["g1"],
        genreNames: { g1: "A" },
      },
    ]);
    expect(totalUnitsSold).toBe(3);
    expect(unitsByGenre).toEqual(
      expect.arrayContaining([
        { genreId: "g1", genreName: "A", unitsSold: 3 },
        { genreId: "g2", genreName: "B", unitsSold: 2 },
      ])
    );
  });
});
