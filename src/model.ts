export type Zone = "waist" | "abdomen" | "hips" | "chest" | "thigh" | "arm";
export type View = "front" | "side" | "back";
export type Profile = {
  name: string;
  silhouette: "woman" | "man";
  height: number;
  target?: number;
  zones: Zone[];
};
export type Weight = { id: string; date: string; value: number; note: string };
export type Measure = { id: string; date: string; zone: Zone; value: number };
export type Photo = { id: string; date: string; view: View; blob: Blob };
export type Journal = {
  version: 1;
  profile: Profile | null;
  weights: Weight[];
  measures: Measure[];
  photos: Photo[];
  lastBackup?: string;
};
export const emptyJournal = (): Journal => ({
  version: 1,
  profile: null,
  weights: [],
  measures: [],
  photos: [],
});
export const zones: Record<Zone, { label: string; hint: string }> = {
  waist: {
    label: "Taille",
    hint: "Entre le bas des côtes et le haut des hanches. Gardez le ruban horizontal, sans serrer, après une expiration normale.",
  },
  abdomen: {
    label: "Abdomen",
    hint: "Au niveau du nombril, ruban horizontal, ventre relâché. Ce repère est distinct du tour de taille.",
  },
  hips: {
    label: "Hanches",
    hint: "À l’endroit le plus large des fesses, pieds rapprochés. Le ruban fait le tour du bassin.",
  },
  chest: {
    label: "Poitrine",
    hint: "À l’endroit le plus large de la poitrine, bras relâchés. Conservez les mêmes conditions à chaque mesure.",
  },
  thigh: {
    label: "Cuisse",
    hint: "Sur la cuisse droite, à mi-distance entre le pli de l’aine et le haut du genou. Gardez toujours le même repère.",
  },
  arm: {
    label: "Bras",
    hint: "Sur le bras droit relâché, à mi-distance entre l’épaule et le coude. Ne contractez pas le muscle.",
  },
};
export const views: Record<View, string> = {
  front: "Face",
  side: "Profil",
  back: "Dos",
};
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const number = (n: number, digits = 1) =>
  n.toLocaleString("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
export const dateLabel = (date: string, short = false) =>
  new Date(date + "T12:00:00").toLocaleDateString("fr-FR", {
    day: "numeric",
    month: short ? "short" : "long",
    ...(short ? {} : { year: "numeric" }),
  });
export const bmi = (weight: number, height: number) =>
  weight / (height / 100) ** 2;
export const chronological = <T extends { date: string }>(items: T[]) =>
  [...items].sort((a, b) => a.date.localeCompare(b.date));
export const parseNumber = (value: string) => Number(value.replace(",", "."));
export function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const d = new Date(value + "T12:00:00Z");
  return !isNaN(+d) && d.toISOString().slice(0, 10) === value;
}
export function validateJournal(input: unknown): asserts input is Journal {
  const j = input as Journal;
  const finite = (v: unknown, min: number, max: number) =>
    typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
  if (
    !j ||
    j.version !== 1 ||
    !Array.isArray(j.weights) ||
    !Array.isArray(j.measures) ||
    !Array.isArray(j.photos)
  )
    throw Error("Format de sauvegarde non reconnu.");
  const p = j.profile;
  if (
    p !== null &&
    (!p ||
      typeof p.name !== "string" ||
      p.name.length > 60 ||
      !["woman", "man"].includes(p.silhouette) ||
      !finite(p.height, 100, 250) ||
      (p.target !== undefined && !finite(p.target, 25, 400)) ||
      !Array.isArray(p.zones) ||
      p.zones.length === 0 ||
      p.zones.some((z) => !Object.hasOwn(zones, z)) ||
      new Set(p.zones).size !== p.zones.length)
  )
    throw Error("Profil invalide dans la sauvegarde.");
  const ids = new Set<string>();
  const keys = new Set<string>();
  for (const [type, items] of [
    ["weight", j.weights],
    ["measure", j.measures],
    ["photo", j.photos],
  ] as const)
    for (const item of items) {
      if (
        !item ||
        typeof item.id !== "string" ||
        !item.id ||
        ids.has(item.id) ||
        !validDate(item.date) ||
        item.date > today()
      )
        throw Error("Une entrée contient une date ou un identifiant invalide.");
      ids.add(item.id);
      if (type === "weight") {
        const w = item as Weight;
        if (
          !finite(w.value, 25, 400) ||
          typeof w.note !== "string" ||
          w.note.length > 500
        )
          throw Error("Pesée invalide.");
        const k = "w" + w.date;
        if (keys.has(k)) throw Error("Pesées en double.");
        keys.add(k);
      }
      if (type === "measure") {
        const m = item as Measure;
        if (!Object.hasOwn(zones, m.zone) || !finite(m.value, 5, 300))
          throw Error("Mensuration invalide.");
        const k = m.zone + m.date;
        if (keys.has(k)) throw Error("Mensurations en double.");
        keys.add(k);
      }
      if (type === "photo") {
        const p = item as Photo;
        if (
          !Object.hasOwn(views, p.view) ||
          !(p.blob instanceof Blob) ||
          !["image/jpeg", "image/png", "image/webp"].includes(p.blob.type) ||
          p.blob.size > 15 * 1024 * 1024
        )
          throw Error("Photo invalide.");
      }
    }
}
