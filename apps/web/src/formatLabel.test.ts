import { describe, it, expect } from "vitest";
import { formatLabel } from "./formatLabel";

describe("formatLabel", () => {
  it("maps GraphQL enum values to readable labels", () => {
    expect(formatLabel("HARDCOVER")).toBe("Hardcover");
    expect(formatLabel("EREADER")).toBe("E-reader");
  });
});
