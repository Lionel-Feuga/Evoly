import { useEffect, useRef, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import {
  Home,
  ChartNoAxesCombined,
  Camera,
  UserRound,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Heart,
  Leaf,
  Sun,
  Scale,
  Ruler,
  Download,
  Upload,
  ShieldCheck,
  WifiOff,
  Eye,
  EyeOff,
  Info,
  Check,
  X,
  RefreshCw,
  Smartphone,
  SlidersHorizontal,
} from "lucide-react";
import {
  bmi,
  chronological,
  dateLabel,
  emptyJournal,
  number,
  today,
  zones,
  views,
  type Journal,
  type Weight,
  type Measure,
  type Zone,
  type Photo,
  type View,
  type Profile,
} from "./model";
import {
  download,
  exportBackup,
  importBackup,
  loadJournal,
  saveJournal,
} from "./storage";
import { Chart, Empty, Modal, PhotoImage, Silhouette } from "./components";
import { EntryForm, PhotoForm, ProfileForm } from "./forms";
type Page = "home" | "progress" | "photos" | "profile";
type Editor =
  | { type: "weight"; entry?: Weight }
  | { type: "measure"; zone: Zone; entry?: Measure }
  | { type: "photo"; entry?: Photo }
  | { type: "profile" };
export default function App() {
  const [journal, setJournal] = useState<Journal>(emptyJournal);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [page, setPage] = useState<Page>("home");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [tab, setTab] = useState<"weight" | "bmi" | "measure">("weight");
  const [zone, setZone] = useState<Zone>("waist");
  const [measureDate, setMeasureDate] = useState(today);
  const [period, setPeriod] = useState(90);
  const [offline, setOffline] = useState(!navigator.onLine);
  const {
    needRefresh: [refresh, setRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  useEffect(() => {
    loadJournal()
      .then((j) => {
        setJournal(j);
        if (j.profile) setZone(j.profile.zones[0]);
        setReady(true);
      })
      .catch((e) =>
        setLoadError(
          "Impossible de lire votre carnet. Vos données n’ont pas été modifiées. " +
            e.message,
        ),
      );
    const on = () => setOffline(!navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  async function commit(
    next: Journal,
    message = "Enregistré dans votre carnet",
  ) {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await saveJournal(next);
      setJournal(next);
      setToast(message);
      return true;
    } catch (e) {
      setError(
        (e as Error).name === "QuotaExceededError"
          ? "Le stockage du téléphone est plein. Exportez une sauvegarde puis libérez de la place."
          : `Enregistrement impossible. ${(e as Error).message}`,
      );
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function navigate(p: Page) {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const p = journal.profile;
  const weights = chronological(journal.weights);
  const latest = weights.at(-1);
  const first = weights[0];
  const delta = latest && first ? latest.value - first.value : 0;
  async function saveProfile(profile: Profile, w?: Weight) {
    if (
      await commit({
        ...journal,
        profile,
        weights: w ? [...journal.weights, w] : journal.weights,
      })
    ) {
      setEditor(null);
      setZone(profile.zones[0]);
      if (!p) navigator.storage?.persist?.().catch(() => {});
    }
  }
  function openMeasure(selectedZone: Zone) {
    setZone(selectedZone);
    setEditor({
      type: "measure",
      zone: selectedZone,
      entry: journal.measures.find(
        (m) => m.zone === selectedZone && m.date === measureDate,
      ),
    });
  }
  async function saveEntry(value: number, date: string, note: string) {
    if (!editor || !["weight", "measure"].includes(editor.type)) return;
    if (editor.type === "weight") {
      const collision = journal.weights.find(
        (w) => w.date === date && w.id !== editor.entry?.id,
      );
      if (
        collision &&
        !confirm(
          `Une pesée de ${number(collision.value)} kg existe à cette date. La remplacer ?`,
        )
      )
        return;
      const entry: Weight = {
        id: editor.entry?.id || crypto.randomUUID(),
        date,
        value,
        note,
      };
      if (
        await commit({
          ...journal,
          weights: [
            ...journal.weights.filter(
              (w) => w.id !== entry.id && w.date !== date,
            ),
            entry,
          ],
        })
      )
        setEditor(null);
    }
    if (editor.type === "measure") {
      const collision = journal.measures.find(
        (m) =>
          m.zone === editor.zone &&
          m.date === date &&
          m.id !== editor.entry?.id,
      );
      if (
        collision &&
        !confirm(
          `Une mesure de ${number(collision.value)} cm existe à cette date. La remplacer ?`,
        )
      )
        return;
      const entry: Measure = {
        id: editor.entry?.id || crypto.randomUUID(),
        zone: editor.zone,
        date,
        value,
      };
      if (
        await commit({
          ...journal,
          measures: [
            ...journal.measures.filter(
              (m) =>
                m.id !== entry.id &&
                !(m.zone === entry.zone && m.date === date),
            ),
            entry,
          ],
        })
      ) {
        setMeasureDate(date);
        setEditor(null);
      }
    }
  }
  async function deleteEntry() {
    if (
      !editor ||
      !("entry" in editor) ||
      !editor.entry ||
      !confirm(
        "Supprimer cette entrée du carnet ? Cette action est définitive.",
      )
    )
      return;
    const id = editor.entry.id;
    const next = {
      ...journal,
      weights: journal.weights.filter((x) => x.id !== id),
      measures: journal.measures.filter((x) => x.id !== id),
      photos: journal.photos.filter((x) => x.id !== id),
    };
    if (await commit(next, "Entrée supprimée")) setEditor(null);
  }
  async function backup() {
    if (busy) return;
    setBusy(true);
    try {
      const blob = await exportBackup(journal);
      download(blob, `evoly-sauvegarde-${today()}.zip`);
      setBusy(false);
      await commit(
        { ...journal, lastBackup: today() },
        "Sauvegarde préparée. Vérifiez le fichier dans vos téléchargements.",
      );
    } catch (e) {
      setError("Sauvegarde impossible : " + (e as Error).message);
      setBusy(false);
    }
  }
  async function restore(file?: File) {
    if (!file || busy) return;
    setBusy(true);
    try {
      const candidate = await importBackup(file);
      setBusy(false);
      if (
        confirm(
          `Sauvegarde vérifiée : ${candidate.weights.length} pesées, ${candidate.measures.length} mensurations et ${candidate.photos.length} photos. Elle remplacera tout le carnet actuel. Continuer ?`,
        )
      ) {
        if (await commit(candidate, "Carnet restauré")) {
          setZone(candidate.profile?.zones[0] || "waist");
          navigate("home");
        }
      }
    } catch (e) {
      setError("Restauration annulée : " + (e as Error).message);
      setBusy(false);
    }
  }
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - period);
  const filtered = weights.filter(
    (w) => !period || new Date(w.date + "T12:00:00") >= cutoff,
  );
  const measures = chronological(
    journal.measures.filter((m) => m.zone === zone),
  );
  if (loadError)
    return (
      <main className="onboarding">
        <img className="brand-mark" src="/ev-icon-192.png" alt="" />
        <h1>Votre carnet est indisponible</h1>
        <p role="alert">{loadError}</p>
        <button className="primary" onClick={() => location.reload()}>
          Réessayer
        </button>
        <p className="caption">
          Vérifiez que le stockage du navigateur est autorisé. N’effacez pas les
          données du site.
        </p>
      </main>
    );
  if (!ready)
    return (
      <main className="loading">
        <img src="/ev-icon-192.png" alt="" />
        <p>Ouverture de votre carnet…</p>
      </main>
    );
  return (
    <>
      <div className="app-shell">
        <header className="brand-bar">
          <a
            href="#"
            className="brand"
            onClick={(e) => {
              e.preventDefault();
              navigate("home");
            }}
          >
            Evoly<span className="brand-dot">.</span>
          </a>
          {offline && (
            <span className="local-tag">
              <WifiOff size={13} />
              Hors connexion
            </span>
          )}
        </header>
        {error && (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            <button
              className="icon-button"
              aria-label="Fermer le message"
              onClick={() => setError("")}
            >
              <X size={18} />
            </button>
          </div>
        )}
        {refresh && (
          <div className="update-banner">
            <span>Une nouvelle version d’Evoly est prête.</span>
            <button
              disabled={busy}
              onClick={() => void updateServiceWorker(true)}
            >
              Actualiser
            </button>
            <button aria-label="Plus tard" onClick={() => setRefresh(false)}>
              <X size={16} />
            </button>
          </div>
        )}
        {!p ? (
          <main className="onboarding">
            <h1>
              Mon profil<span className="coral">.</span>
            </h1>
            <div className="card">
              <ProfileForm
                profile={null}
                onSave={saveProfile}
                busy={busy}
                onboarding
              />
            </div>
            <label className="text-button restore-link">
              <Upload size={17} />
              J’ai déjà une sauvegarde Evoly
              <input
                type="file"
                accept=".zip"
                disabled={busy}
                onChange={(e) => {
                  void restore(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          </main>
        ) : (
          <>
            <main className="content">
              {page === "home" && (
                <>
                  <div className="page-heading">
                    <div>
                      <p className="eyebrow">{dateLabel(today())}</p>
                      <h1>
                        Bonjour{p.name ? `, ${p.name}` : ""}
                        <span className="coral">.</span>
                      </h1>
                    </div>
                    <Sun className="sun-doodle" strokeWidth={1} />
                  </div>
                  <div className="dashboard-grid">
                    <section className="card weight-card">
                      <div className="row">
                        <span className="section-label">
                          <Scale size={20} />
                          Mon dernier poids
                        </span>
                        <span className="pill">
                          {latest
                            ? dateLabel(latest.date, true)
                            : "À vous de jouer"}
                        </span>
                      </div>
                      <div className="weight-number">
                        {latest ? number(latest.value) : "—"}
                        <span>kg</span>
                      </div>
                      <div className="row">
                        <span className="muted">
                          {weights.length > 1 ? (
                            <>
                              {delta <= 0 ? (
                                <ArrowDownRight size={17} />
                              ) : (
                                <ArrowUpRight size={17} />
                              )}{" "}
                              {delta > 0 ? "+" : ""}
                              {number(delta)} kg depuis le{" "}
                              {dateLabel(first.date, true)}
                            </>
                          ) : latest ? (
                            "Première pesée"
                          ) : (
                            "Aucune pesée"
                          )}
                        </span>
                        <button
                          className="round-button"
                          aria-label="Ajouter une pesée"
                          onClick={() => setEditor({ type: "weight" })}
                        >
                          <Plus />
                        </button>
                      </div>
                      {latest && (
                        <div className="weight-footer">
                          <span>
                            IMC{" "}
                            <strong>
                              {number(bmi(latest.value, p.height))}
                            </strong>
                          </span>
                          {p.target && (
                            <span>
                              Objectif <strong>{number(p.target)} kg</strong>
                            </span>
                          )}
                          <button
                            className="text-button"
                            onClick={() => {
                              setTab("bmi");
                              navigate("progress");
                            }}
                          >
                            Voir le suivi <ChevronRight size={15} />
                          </button>
                        </div>
                      )}
                    </section>
                    <section className="card trend-card">
                      <div className="row">
                        <h2>Évolution du poids</h2>
                        <span className="pill">3 mois</span>
                      </div>
                      <Chart
                        points={weights.filter(
                          (w) =>
                            new Date(w.date + "T12:00:00") >=
                            new Date(Date.now() - 90 * 86400000),
                        )}
                        unit="kg"
                      />
                      <button
                        className="text-button"
                        onClick={() => {
                          setTab("weight");
                          navigate("progress");
                        }}
                      >
                        Explorer ma progression <ArrowUpRight size={16} />
                      </button>
                    </section>
                  </div>
                  <section className="quick-section">
                    <div className="row">
                      <h2>Ajouter une entrée</h2>
                    </div>
                    <div className="quick-actions">
                      <button
                        className="quick peach"
                        onClick={() => setEditor({ type: "weight" })}
                      >
                        <Scale />
                        <span>Mon poids</span>
                        <small>Ajouter une pesée</small>
                        <Plus className="quick-plus" size={18} />
                      </button>
                      <button
                        className="quick lavender"
                        onClick={() => {
                          setTab("measure");
                          navigate("progress");
                        }}
                      >
                        <Ruler />
                        <span>Mes mesures</span>
                        <small>Ajouter une mesure</small>
                        <ChevronRight className="quick-plus" size={18} />
                      </button>
                      <button
                        className="quick cream"
                        onClick={() => setEditor({ type: "photo" })}
                      >
                        <Camera />
                        <span>Mes photos</span>
                        <small>Ajouter une photo</small>
                        <Plus className="quick-plus" size={18} />
                      </button>
                    </div>
                  </section>
                  <div className="home-bottom">
                    <button
                      className="card summary-link"
                      onClick={() => {
                        setTab("measure");
                        navigate("progress");
                      }}
                    >
                      <span className="circle lavender">
                        <Ruler size={21} />
                      </span>
                      <div>
                        <h3>Historique</h3>
                        <p>
                          {journal.weights.length} pesée
                          {journal.weights.length > 1 ? "s" : ""} ·{" "}
                          {journal.measures.length} mesure
                          {journal.measures.length > 1 ? "s" : ""} ·{" "}
                          {journal.photos.length} photo
                          {journal.photos.length > 1 ? "s" : ""}
                        </p>
                      </div>
                      <ChevronRight size={19} />
                    </button>
                    <button
                      className="card summary-link"
                      onClick={() => navigate("profile")}
                    >
                      <span className="circle peach">
                        <ShieldCheck size={21} />
                      </span>
                      <div>
                        <h3>Sauvegardes</h3>
                        <p>
                          {journal.lastBackup
                            ? `Dernier export : ${dateLabel(journal.lastBackup, true)}`
                            : "Exporter ou restaurer"}
                        </p>
                      </div>
                      <ChevronRight size={19} />
                    </button>
                  </div>
                </>
              )}
              {page === "progress" && (
                <>
                  <div className="page-heading">
                    <div>
                      <h1>
                        Ma progression<span className="coral">.</span>
                      </h1>
                    </div>
                    <button
                      className="round-button"
                      aria-label={
                        tab === "measure"
                          ? "Ajouter une mensuration"
                          : "Ajouter une pesée"
                      }
                      onClick={() =>
                        tab === "measure"
                          ? openMeasure(zone)
                          : setEditor({ type: "weight" })
                      }
                    >
                      <Plus />
                    </button>
                  </div>
                  <div className="segments main-segments">
                    {(["weight", "bmi", "measure"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={tab === t ? "active" : ""}
                        aria-pressed={tab === t}
                      >
                        {t === "weight"
                          ? "Poids"
                          : t === "bmi"
                            ? "IMC"
                            : "Mensurations"}
                      </button>
                    ))}
                  </div>
                  {tab === "measure" ? (
                    <div className="measure-layout">
                      <section className="card body-card">
                        <div className="row">
                          <h2>Mensurations</h2>
                          <button
                            className="icon-button"
                            aria-label="Choisir les zones suivies"
                            onClick={() => setEditor({ type: "profile" })}
                          >
                            <SlidersHorizontal size={19} />
                          </button>
                        </div>
                        <label className="measure-session">
                          Date des mesures
                          <input
                            type="date"
                            required
                            max={today()}
                            value={measureDate}
                            onChange={(e) => {
                              if (e.target.value && e.target.value <= today())
                                setMeasureDate(e.target.value);
                            }}
                          />
                        </label>
                        <Silhouette
                          sex={p.silhouette}
                          selected={zone}
                          enabled={p.zones}
                          completed={journal.measures
                            .filter((m) => m.date === measureDate)
                            .map((m) => m.zone)}
                          onSelect={openMeasure}
                        />
                        <p className="caption center">
                          Les traits sont des repères illustratifs. Consultez
                          les indications de chaque zone.
                        </p>
                      </section>
                      <div>
                        <section className="card">
                          <div className="row">
                            <h2>{zones[zone].label}</h2>
                            <select
                              aria-label="Zone à consulter"
                              value={zone}
                              onChange={(e) => setZone(e.target.value as Zone)}
                            >
                              {p.zones.map((z) => (
                                <option value={z} key={z}>
                                  {zones[z].label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="metric-number">
                            {measures.length
                              ? number(measures.at(-1)!.value)
                              : "—"}
                            <span>cm</span>
                          </div>
                          <p className="caption">{zones[zone].hint}</p>
                          <Chart points={measures} unit="cm" />
                          <button
                            className="primary"
                            onClick={() => openMeasure(zone)}
                          >
                            <Plus size={18} />
                            Ajouter une mesure
                          </button>
                        </section>
                        <section className="card history">
                          <h2>Historique · {zones[zone].label}</h2>
                          {measures.length ? (
                            [...measures].reverse().map((m) => (
                              <button
                                key={m.id}
                                className="history-row"
                                onClick={() =>
                                  setEditor({
                                    type: "measure",
                                    zone: m.zone,
                                    entry: m,
                                  })
                                }
                              >
                                <span>{dateLabel(m.date, true)}</span>
                                <strong>{number(m.value)} cm</strong>
                                <ChevronRight size={16} />
                              </button>
                            ))
                          ) : (
                            <p className="caption">
                              Vos mesures apparaîtront ici.
                            </p>
                          )}
                        </section>
                      </div>
                    </div>
                  ) : (
                    <>
                      <section className="card">
                        <div className="row">
                          <h2>
                            {tab === "weight"
                              ? "Évolution du poids"
                              : "Évolution de l’IMC"}
                          </h2>
                          <select
                            aria-label="Période"
                            value={period}
                            onChange={(e) => setPeriod(+e.target.value)}
                          >
                            <option value={30}>30 jours</option>
                            <option value={90}>3 mois</option>
                            <option value={365}>1 an</option>
                            <option value={0}>Tout</option>
                          </select>
                        </div>
                        <div className="metric-number">
                          {latest
                            ? number(
                                tab === "weight"
                                  ? latest.value
                                  : bmi(latest.value, p.height),
                              )
                            : "—"}
                          <span>{tab === "weight" ? "kg" : "IMC"}</span>
                        </div>
                        <Chart
                          points={filtered.map((w) => ({
                            date: w.date,
                            value:
                              tab === "bmi" ? bmi(w.value, p.height) : w.value,
                          }))}
                          unit={tab === "weight" ? "kg" : "IMC"}
                        />
                        {p.target && tab === "weight" && (
                          <div className="target-line">
                            <Heart size={18} />
                            <span>
                              Mon objectif :{" "}
                              <strong>{number(p.target)} kg</strong>
                            </span>
                          </div>
                        )}
                      </section>
                      <section className="card history">
                        <div className="row">
                          <h2>Mes pesées</h2>
                          <button
                            className="text-button"
                            onClick={() => setEditor({ type: "weight" })}
                          >
                            <Plus size={17} />
                            Ajouter
                          </button>
                        </div>
                        {weights.length ? (
                          [...weights].reverse().map((w) => (
                            <button
                              key={w.id}
                              className="history-row"
                              onClick={() =>
                                setEditor({ type: "weight", entry: w })
                              }
                            >
                              <div>
                                <span>{dateLabel(w.date)}</span>
                                {w.note && <small>{w.note}</small>}
                              </div>
                              <strong>
                                {number(
                                  tab === "bmi"
                                    ? bmi(w.value, p.height)
                                    : w.value,
                                )}{" "}
                                {tab === "weight" ? "kg" : ""}
                              </strong>
                              <ChevronRight size={16} />
                            </button>
                          ))
                        ) : (
                          <Empty title="Une première page à écrire">
                            Vous pouvez aussi ajouter vos anciennes pesées avec
                            leur date.
                          </Empty>
                        )}
                      </section>
                    </>
                  )}
                </>
              )}
              {page === "photos" && (
                <Gallery
                  photos={journal.photos}
                  onAdd={() => setEditor({ type: "photo" })}
                  onEdit={(entry) => setEditor({ type: "photo", entry })}
                />
              )}
              {page === "profile" && (
                <>
                  <div className="page-heading">
                    <div>
                      <h1>
                        Mon carnet<span className="coral">.</span>
                      </h1>
                    </div>
                    <span className="avatar">
                      {p.name ? p.name[0].toUpperCase() : <UserRound />}
                    </span>
                  </div>
                  <section className="card">
                    <div className="row">
                      <h2>{p.name || "Mon profil"}</h2>
                      <button
                        className="text-button"
                        onClick={() => setEditor({ type: "profile" })}
                      >
                        Modifier <ChevronRight size={16} />
                      </button>
                    </div>
                    <div className="profile-stats">
                      <div>
                        <span>Taille</span>
                        <strong>
                          {number(p.height, 0)} <small>cm</small>
                        </strong>
                      </div>
                      <div>
                        <span>Objectif</span>
                        <strong>
                          {p.target ? number(p.target) : "Libre"}{" "}
                          <small>{p.target ? "kg" : ""}</small>
                        </strong>
                      </div>
                      <div>
                        <span>Zones suivies</span>
                        <strong>{p.zones.length}</strong>
                      </div>
                    </div>
                  </section>
                  <section className="card">
                    <div className="section-label">
                      <ShieldCheck size={22} />
                      <h2>Sauvegardes</h2>
                    </div>
                    <div className="button-row">
                      <button
                        className="primary"
                        disabled={busy}
                        onClick={() => void backup()}
                      >
                        <Download size={18} />
                        {busy ? "Patientez…" : "Sauvegarder tout"}
                      </button>
                      <label
                        className={`secondary upload-inline ${busy ? "disabled" : ""}`}
                      >
                        <Upload size={18} />
                        Restaurer un carnet
                        <input
                          type="file"
                          accept=".zip"
                          disabled={busy}
                          onChange={(e) => {
                            void restore(e.target.files?.[0]);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </section>
                </>
              )}
            </main>
            <nav className="bottom-nav" aria-label="Navigation principale">
              {(
                [
                  { id: "home", label: "Aujourd’hui", icon: Home },
                  {
                    id: "progress",
                    label: "Progression",
                    icon: ChartNoAxesCombined,
                  },
                  { id: "photos", label: "Photos", icon: Camera },
                  { id: "profile", label: "Mon carnet", icon: UserRound },
                ] as const
              ).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  aria-current={page === id ? "page" : undefined}
                  className={page === id ? "active" : ""}
                  onClick={() => navigate(id)}
                >
                  <Icon size={23} />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </>
        )}
      </div>
      {editor && p && (
        <Modal
          title={
            editor.type === "profile"
              ? "Mon profil"
              : editor.type === "photo"
                ? editor.entry
                  ? "Ma photo"
                  : "Ajouter une photo"
                : editor.type === "weight"
                  ? editor.entry
                    ? "Modifier la pesée"
                    : "Une nouvelle pesée"
                  : zones[editor.zone].label
          }
          onClose={() => {
            if (!busy) setEditor(null);
          }}
        >
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {editor.type === "profile" ? (
            <ProfileForm profile={p} onSave={saveProfile} busy={busy} />
          ) : editor.type === "photo" ? (
            <PhotoForm
              entry={editor.entry}
              busy={busy}
              onError={setError}
              onDelete={editor.entry ? () => void deleteEntry() : undefined}
              onSave={async (photo) => {
                if (
                  await commit({
                    ...journal,
                    photos: [
                      ...journal.photos.filter((x) => x.id !== photo.id),
                      photo,
                    ],
                  })
                )
                  setEditor(null);
              }}
            />
          ) : (
            <EntryForm
              kind={editor.type}
              initialDate={editor.type === "measure" ? measureDate : undefined}
              entry={editor.entry}
              zone={editor.type === "measure" ? editor.zone : undefined}
              last={
                editor.type === "weight"
                  ? latest?.value
                  : chronological(
                      journal.measures.filter((m) => m.zone === editor.zone),
                    ).at(-1)?.value
              }
              busy={busy}
              onSave={saveEntry}
              onDelete={editor.entry ? () => void deleteEntry() : undefined}
            />
          )}
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={19} />
          {toast}
        </div>
      )}
    </>
  );
}
function Gallery({
  photos,
  onAdd,
  onEdit,
}: {
  photos: Photo[];
  onAdd: () => void;
  onEdit: (p: Photo) => void;
}) {
  const [view, setView] = useState<View>("front");
  const [hidden, setHidden] = useState(false);
  const [compare, setCompare] = useState(false);
  const [slider, setSlider] = useState(false);
  const [position, setPosition] = useState(50);
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const list = chronological(photos.filter((p) => p.view === view));
  const a = list.find((p) => p.id === left) || list[0];
  const b = list.find((p) => p.id === right) || list.at(-1);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>
            Mes photos<span className="coral">.</span>
          </h1>
        </div>
        <button
          className="round-button"
          onClick={onAdd}
          aria-label="Ajouter une photo"
        >
          <Plus />
        </button>
      </div>
      <div className="row gallery-toolbar">
        <div className="segments">
          {(Object.keys(views) as View[]).map((v) => (
            <button
              key={v}
              aria-pressed={view === v}
              className={view === v ? "active" : ""}
              onClick={() => {
                setView(v);
                setLeft("");
                setRight("");
              }}
            >
              {views[v]}
            </button>
          ))}
        </div>
        <button
          className="icon-button"
          aria-label={hidden ? "Afficher les photos" : "Masquer les photos"}
          onClick={() => setHidden(!hidden)}
        >
          {hidden ? <EyeOff /> : <Eye />}
        </button>
      </div>
      <div className="gallery-mode">
        <button
          className={!compare ? "selected" : ""}
          onClick={() => setCompare(false)}
        >
          Galerie <span>{list.length}</span>
        </button>
        <button
          className={compare ? "selected" : ""}
          onClick={() => setCompare(true)}
        >
          Comparer
        </button>
      </div>
      {hidden ? (
        <Empty title="Photos masquées">
          Vos photos sont masquées sur cet écran.
          <button className="text-button" onClick={() => setHidden(false)}>
            Afficher mes photos
          </button>
        </Empty>
      ) : !list.length ? (
        <section className="card">
          <Empty title="Aucune photo">
            Ajoutez une photo de {views[view].toLowerCase()}.
            <button className="primary" onClick={onAdd}>
              <Camera size={18} />
              Ajouter une photo
            </button>
          </Empty>
        </section>
      ) : compare ? (
        list.length < 2 ? (
          <section className="card">
            <Empty title="Deux photos nécessaires">
              Ajoutez une seconde photo de {views[view].toLowerCase()} pour
              comparer deux moments.
            </Empty>
          </section>
        ) : (
          <section className="card compare-card">
            <div className="form-grid">
              <label>
                Premier moment
                <select value={a.id} onChange={(e) => setLeft(e.target.value)}>
                  {list.map((p, i) => (
                    <option key={p.id} value={p.id}>
                      {dateLabel(p.date, true)} · {i + 1}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Second moment
                <select
                  value={b!.id}
                  onChange={(e) => setRight(e.target.value)}
                >
                  {list.map((p, i) => (
                    <option key={p.id} value={p.id}>
                      {dateLabel(p.date, true)} · {i + 1}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {a.id === b!.id ? (
              <p className="help">
                Choisissez deux photos différentes pour les comparer.
              </p>
            ) : (
              <>
                <div className="segments compare-switch">
                  <button
                    className={!slider ? "active" : ""}
                    onClick={() => setSlider(false)}
                  >
                    Côte à côte
                  </button>
                  <button
                    className={slider ? "active" : ""}
                    onClick={() => setSlider(true)}
                  >
                    Superposition
                  </button>
                </div>
                {slider ? (
                  <>
                    <div className="slider-photos">
                      <PhotoImage photo={b!} />
                      <PhotoImage
                        photo={a}
                        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
                      />
                      <div
                        className="slider-line"
                        style={{ left: `${position}%` }}
                      >
                        <span>↔</span>
                      </div>
                    </div>
                    <label className="slider-label">
                      Déplacer le comparateur
                      <input
                        aria-label="Position du comparateur"
                        type="range"
                        min="0"
                        max="100"
                        value={position}
                        onChange={(e) => setPosition(+e.target.value)}
                      />
                    </label>
                  </>
                ) : (
                  <div className="comparison">
                    <figure>
                      <PhotoImage photo={a} />
                      <figcaption>{dateLabel(a.date, true)}</figcaption>
                    </figure>
                    <figure>
                      <PhotoImage photo={b!} />
                      <figcaption>{dateLabel(b!.date, true)}</figcaption>
                    </figure>
                  </div>
                )}
              </>
            )}
          </section>
        )
      ) : (
        <div className="photo-grid">
          {[...list].reverse().map((p) => (
            <button
              className="photo-tile"
              key={p.id}
              onClick={() => onEdit(p)}
              aria-label={`Modifier la photo du ${dateLabel(p.date)}`}
            >
              <PhotoImage photo={p} />
              <span>
                {dateLabel(p.date, true)}
                <ChevronRight size={15} />
              </span>
            </button>
          ))}
          <button className="photo-add" onClick={onAdd}>
            <Plus size={30} />
            <span>Ajouter une photo</span>
          </button>
        </div>
      )}
      <div className="encouragement photo-tip">
        <Camera size={25} />
        <div>
          <h3>Retrouvez vos repères</h3>
          <p>
            Même posture, même tenue, même lumière. Placez l’appareil à la même
            hauteur et gardez le corps entier dans le cadre.
          </p>
        </div>
      </div>
    </>
  );
}
