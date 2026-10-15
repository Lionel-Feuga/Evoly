import { openDB } from "idb";
import JSZip from "jszip";
import {
  emptyJournal,
  validateJournal,
  type Journal,
  type Photo,
} from "./model";
const db = () =>
  openDB("evoly", 1, {
    upgrade(db) {
      db.createObjectStore("journal");
    },
  });
export async function loadJournal(): Promise<Journal> {
  const value = await (await db()).get("journal", "current");
  if (!value) return emptyJournal();
  validateJournal(value);
  return value;
}
export async function saveJournal(journal: Journal) {
  validateJournal(journal);
  await (await db()).put("journal", journal, "current");
}
export async function exportBackup(journal: Journal) {
  const zip = new JSZip();
  const photos = journal.photos.map(({ blob, ...p }) => {
    const path = `photos/${p.id}.jpg`;
    zip.file(path, blob);
    return { ...p, path, mime: blob.type };
  });
  zip.file("evoly.json", JSON.stringify({ ...journal, photos }, null, 2));
  return zip.generateAsync({ type: "blob", compression: "STORE" });
}
export async function importBackup(file: File): Promise<Journal> {
  if (file.size > 250 * 1024 * 1024)
    throw Error("Cette sauvegarde dépasse 250 Mo.");
  const zip = await JSZip.loadAsync(file);
  const entry = zip.file("evoly.json");
  if (!entry) throw Error("Le fichier evoly.json est absent de cette archive.");
  const j = JSON.parse(await entry.async("string"));
  if (!Array.isArray(j.photos) || j.photos.length > 2000)
    throw Error("Liste des photos invalide.");
  let total = 0;
  j.photos = await Promise.all(
    j.photos.map(
      async (p: Omit<Photo, "blob"> & { path: string; mime: string }) => {
        if (typeof p.path !== "string" || !p.path.startsWith("photos/"))
          throw Error("Chemin de photo invalide.");
        const image = zip.file(p.path);
        if (!image) throw Error("Une photo manque dans la sauvegarde.");
        const bytes = await image.async("uint8array");
        total += bytes.length;
        if (total > 250 * 1024 * 1024)
          throw Error("Les photos dépassent 250 Mo.");
        const blob = new Blob([bytes], { type: p.mime });
        const bitmap = await createImageBitmap(blob).catch(() => {
          throw Error("Une photo est illisible.");
        });
        bitmap.close();
        return { id: p.id, date: p.date, view: p.view, blob };
      },
    ),
  );
  validateJournal(j);
  return j;
}
export async function compressPhoto(file: File): Promise<Blob> {
  if (file.size > 30 * 1024 * 1024)
    throw Error("Choisissez une photo de moins de 30 Mo.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () =>
        reject(
          Error(
            "Format non pris en charge. Essayez une photo JPEG, PNG ou WebP.",
          ),
        );
      i.src = url;
    });
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("Impossible de préparer la photo.");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) =>
          b ? resolve(b) : reject(Error("Impossible de préparer la photo.")),
        "image/jpeg",
        0.86,
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
