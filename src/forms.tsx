import { useState, type FormEvent } from "react";
import { ArrowRight, Check, Camera, ImagePlus, Info } from "lucide-react";
import {
  zones,
  views,
  today,
  parseNumber,
  number,
  type Profile,
  type Weight,
  type Measure,
  type Zone,
  type Photo,
  type View,
} from "./model";
import { compressPhoto } from "./storage";
import { PhotoImage } from "./components";
export function ProfileForm({
  profile,
  onSave,
  busy,
  onboarding = false,
}: {
  profile: Profile | null;
  onSave: (p: Profile, w?: Weight) => Promise<void>;
  busy: boolean;
  onboarding?: boolean;
}) {
  const [name, setName] = useState(profile?.name || "");
  const [sex, setSex] = useState<"man" | "woman">(
    profile?.silhouette || "woman",
  );
  const [height, setHeight] = useState(profile?.height.toString() || "");
  const [target, setTarget] = useState(profile?.target?.toString() || "");
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(today());
  const [selected, setSelected] = useState<Zone[]>(
    profile?.zones || ["waist", "hips", "thigh"],
  );
  async function submit(e: FormEvent) {
    e.preventDefault();
    await onSave(
      {
        name: name.trim(),
        silhouette: sex,
        height: parseNumber(height),
        target: target ? parseNumber(target) : undefined,
        zones: selected,
      },
      weight
        ? {
            id: crypto.randomUUID(),
            date,
            value: parseNumber(weight),
            note: "",
          }
        : undefined,
    );
  }
  return (
    <form onSubmit={submit} className="form-stack">
      <label>
        Votre prénom <span className="optional">facultatif</span>
        <input
          autoComplete="given-name"
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Comment vous appeler ?"
        />
      </label>
      <fieldset>
        <legend>Votre silhouette</legend>
        <div className="segments">
          <button
            type="button"
            className={sex === "woman" ? "active" : ""}
            aria-pressed={sex === "woman"}
            onClick={() => setSex("woman")}
          >
            Femme
          </button>
          <button
            type="button"
            className={sex === "man" ? "active" : ""}
            aria-pressed={sex === "man"}
            onClick={() => setSex("man")}
          >
            Homme
          </button>
        </div>
      </fieldset>
      <div className="form-grid">
        <label>
          Taille <span className="optional">cm</span>
          <input
            required
            type="number"
            inputMode="decimal"
            min="100"
            max="250"
            step="0.1"
            value={height}
            placeholder="170"
            onChange={(e) => setHeight(e.target.value)}
          />
        </label>
        <label>
          Objectif <span className="optional">kg · facultatif</span>
          <input
            type="number"
            inputMode="decimal"
            min="25"
            max="400"
            step="0.1"
            value={target}
            placeholder="Sans objectif"
            onChange={(e) => setTarget(e.target.value)}
          />
        </label>
      </div>
      {onboarding && (
        <div className="form-grid">
          <label>
            Premier poids <span className="optional">kg · facultatif</span>
            <input
              type="number"
              inputMode="decimal"
              min="25"
              max="400"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="Votre point de départ"
            />
          </label>
          <label>
            Date de la pesée
            <input
              type="date"
              required={!!weight}
              max={today()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
        </div>
      )}
      <fieldset>
        <legend>Les zones que vous souhaitez suivre</legend>
        <div className="zone-options">
          {(Object.keys(zones) as Zone[]).map((z) => (
            <label key={z} className={selected.includes(z) ? "checked" : ""}>
              <input
                type="checkbox"
                checked={selected.includes(z)}
                onChange={() =>
                  setSelected(
                    selected.includes(z)
                      ? selected.filter((x) => x !== z)
                      : [...selected, z],
                  )
                }
              />
              {zones[z].label}
            </label>
          ))}
        </div>
      </fieldset>
      {!selected.length && (
        <p className="error">Choisissez au moins une zone.</p>
      )}
      <button disabled={busy || !selected.length} className="primary">
        {onboarding ? "Commencer mon carnet" : "Enregistrer mon profil"}
        {onboarding ? <ArrowRight size={19} /> : <Check size={19} />}
      </button>
    </form>
  );
}
export function EntryForm({
  kind,
  entry,
  zone = "waist",
  last,
  onSave,
  onDelete,
  busy,
  initialDate,
}: {
  kind: "weight" | "measure";
  entry?: Weight | Measure;
  zone?: Zone;
  last?: number;
  onSave: (v: number, date: string, note: string) => Promise<void>;
  onDelete?: () => void;
  busy: boolean;
  initialDate?: string;
}) {
  const [value, setValue] = useState(entry?.value.toString() || "");
  const [date, setDate] = useState(entry?.date || initialDate || today());
  const [note, setNote] = useState(entry && "note" in entry ? entry.note : "");
  return (
    <form
      className="form-stack"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSave(parseNumber(value), date, note);
      }}
    >
      {kind === "measure" && (
        <p className="help">
          <Info size={20} />
          {zones[zone].hint}
        </p>
      )}
      <label>
        {kind === "weight" ? "Poids" : zones[zone].label}
        <div className="value-input">
          <input
            aria-label={kind === "weight" ? "Poids" : zones[zone].label}
            autoFocus
            required
            type="number"
            inputMode="decimal"
            min={kind === "weight" ? 25 : 5}
            max={kind === "weight" ? 400 : 300}
            step="0.1"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0,0"
          />
          <span>{kind === "weight" ? "kg" : "cm"}</span>
        </div>
      </label>
      {last !== undefined && (
        <p className="caption">
          Dernière valeur : {number(last)} {kind === "weight" ? "kg" : "cm"}
        </p>
      )}
      <label>
        Date
        <input
          required
          type="date"
          max={today()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      {kind === "weight" && (
        <label>
          Note <span className="optional">facultatif</span>
          <textarea
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Énergie, humeur, contexte…"
            rows={3}
          />
        </label>
      )}
      <p className="caption">
        Une entrée par jour{kind === "measure" ? " et par zone" : ""}. Une
        valeur existante à cette date sera remplacée après confirmation.
      </p>
      <button className="primary" disabled={busy}>
        <Check size={18} />
        Enregistrer
      </button>
      {onDelete && (
        <button
          type="button"
          className="danger-button"
          disabled={busy}
          onClick={onDelete}
        >
          Supprimer cette entrée
        </button>
      )}
    </form>
  );
}
export function PhotoForm({
  entry,
  onSave,
  onDelete,
  busy,
  onError,
}: {
  entry?: Photo;
  onSave: (p: Photo) => Promise<void>;
  onDelete?: () => void;
  busy: boolean;
  onError: (s: string) => void;
}) {
  const [blob, setBlob] = useState<Blob | undefined>(entry?.blob);
  const [date, setDate] = useState(entry?.date || today());
  const [view, setView] = useState<View>(entry?.view || "front");
  const [loading, setLoading] = useState(false);
  async function pick(file?: File) {
    if (!file) return;
    setLoading(true);
    try {
      setBlob(await compressPhoto(file));
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  const preview = blob
    ? { id: entry?.id || "preview", date, view, blob }
    : undefined;
  return (
    <form
      className="form-stack"
      onSubmit={async (e) => {
        e.preventDefault();
        if (blob)
          await onSave({
            id: entry?.id || crypto.randomUUID(),
            date,
            view,
            blob,
          });
      }}
    >
      {preview && <PhotoImage photo={preview} className="photo-preview" />}
      <div className="form-grid">
        <label className="upload-button">
          <Camera />
          Prendre une photo
          <input
            aria-label="Prendre une photo"
            type="file"
            accept="image/*"
            capture="user"
            disabled={loading}
            onChange={(e) => void pick(e.target.files?.[0])}
          />
        </label>
        <label className="upload-button">
          <ImagePlus />
          Depuis la galerie
          <input
            aria-label="Importer une photo"
            type="file"
            accept="image/*"
            disabled={loading}
            onChange={(e) => void pick(e.target.files?.[0])}
          />
        </label>
      </div>
      {loading && <p role="status">Préparation de votre photo…</p>}
      <label>
        Date de la photo
        <input
          type="date"
          required
          max={today()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      <fieldset>
        <legend>Point de vue</legend>
        <div className="segments">
          {(Object.keys(views) as View[]).map((v) => (
            <button
              type="button"
              key={v}
              className={view === v ? "active" : ""}
              onClick={() => setView(v)}
              aria-pressed={view === v}
            >
              {views[v]}
            </button>
          ))}
        </div>
      </fieldset>
      <p className="help">
        <Info size={20} />
        Même posture, même tenue, même lumière. Gardez le corps entier dans le
        cadre, à une distance similaire.
      </p>
      <button disabled={busy || loading || !blob} className="primary">
        <Check size={18} />
        Enregistrer la photo
      </button>
      {onDelete && (
        <button type="button" className="danger-button" onClick={onDelete}>
          Supprimer cette photo
        </button>
      )}
    </form>
  );
}
