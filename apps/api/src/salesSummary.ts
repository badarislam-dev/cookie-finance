/** Pure aggregation for reporting and unit tests. */

export type OrderLineForReport = {
  quantity: number;
  genreIds: string[];
  genreNames: Record<string, string>;
};

export function aggregateSalesByGenre(lines: OrderLineForReport[]): {
  totalUnitsSold: number;
  unitsByGenre: { genreId: string; genreName: string; unitsSold: number }[];
} {
  let totalUnitsSold = 0;
  const byGenre = new Map<string, { genreName: string; unitsSold: number }>();

  for (const line of lines) {
    totalUnitsSold += line.quantity;
    for (const gid of line.genreIds) {
      const name = line.genreNames[gid] ?? "Unknown";
      const prev = byGenre.get(gid) ?? { genreName: name, unitsSold: 0 };
      prev.unitsSold += line.quantity;
      byGenre.set(gid, prev);
    }
  }

  const unitsByGenre = [...byGenre.entries()]
    .map(([genreId, v]) => ({
      genreId,
      genreName: v.genreName,
      unitsSold: v.unitsSold,
    }))
    .sort((a, b) => a.genreName.localeCompare(b.genreName));

  return { totalUnitsSold, unitsByGenre };
}
