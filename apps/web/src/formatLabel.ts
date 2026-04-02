export type FormatTypeGql =
  | "HARDCOVER"
  | "SOFTCOVER"
  | "AUDIOBOOK"
  | "EREADER";

export function formatLabel(f: FormatTypeGql): string {
  switch (f) {
    case "HARDCOVER":
      return "Hardcover";
    case "SOFTCOVER":
      return "Softcover";
    case "AUDIOBOOK":
      return "Audiobook";
    case "EREADER":
      return "E-reader";
    default:
      return f;
  }
}
