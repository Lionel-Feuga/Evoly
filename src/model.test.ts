import { describe, it, expect } from "vitest";
import {
  bmi,
  emptyJournal,
  validateJournal,
  validDate,
  chronological,
  parseNumber,
} from "./model";
describe("Calculs et intégrité du carnet", () => {
  it("calcule l’IMC en convertissant les centimètres", () => {
    expect(bmi(80, 180)).toBeCloseTo(24.691358);
  });
  it("comprend une virgule décimale", () => {
    expect(parseNumber("78,4")).toBe(78.4);
  });
  it("refuse les dates impossibles", () => {
    expect(validDate("2026-02-30")).toBe(false);
    expect(validDate("2024-02-29")).toBe(true);
  });
  it("trie les pesées anciennes sans modifier les données", () => {
    const a = [{ date: "2026-02-01" }, { date: "2026-01-01" }];
    expect(chronological(a)[0].date).toBe("2026-01-01");
    expect(a[0].date).toBe("2026-02-01");
  });
  it("refuse les doublons de pesées au même jour", () => {
    const j = emptyJournal();
    j.weights = [
      { id: "a", date: "2025-01-01", value: 80, note: "" },
      { id: "b", date: "2025-01-01", value: 81, note: "" },
    ];
    expect(() => validateJournal(j)).toThrow("double");
  });
  it("refuse une valeur non finie avant restauration", () => {
    const j = emptyJournal();
    j.weights = [{ id: "a", date: "2025-01-01", value: Infinity, note: "" }];
    expect(() => validateJournal(j)).toThrow();
  });
  it("accepte différentes zones le même jour", () => {
    const j = emptyJournal();
    j.measures = [
      { id: "a", date: "2025-01-01", zone: "waist", value: 84 },
      { id: "b", date: "2025-01-01", zone: "hips", value: 98 },
    ];
    expect(() => validateJournal(j)).not.toThrow();
  });
  it("refuse un profil de sauvegarde invalide", () => {
    const j = {
      ...emptyJournal(),
      profile: { name: "Test", height: 0, silhouette: "man", zones: ["waist"] },
    };
    expect(() => validateJournal(j)).toThrow("Profil");
  });
});
