import { useEffect, useRef, useState, useId, type ReactNode } from "react";
import { X, Leaf } from "lucide-react";
import { dateLabel, number, zones, type Zone, type Photo } from "./model";
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      d.close();
      document.body.style.overflow = prev;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet-inner">
        <div className="sheet-handle" />
        <header className="row">
          <h2 id={id}>{title}</h2>
          <button className="icon-button" aria-label="Fermer" onClick={onClose}>
            <X />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Leaf size={28} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function PhotoImage({
  photo,
  className = "",
  style,
}: {
  photo: Photo;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const u = URL.createObjectURL(photo.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [photo.blob]);
  return (
    <img
      className={className}
      style={style}
      src={url || undefined}
      alt={`Photo de progression du ${dateLabel(photo.date)}`}
    />
  );
}
export function Chart({
  points,
  unit,
}: {
  points: { date: string; value: number }[];
  unit: string;
}) {
  const id = useId().replace(/:/g, "");
  if (!points.length)
    return (
      <Empty title="Aucune mesure">
        Ajoutez une mesure pour afficher la courbe.
      </Empty>
    );
  const values = points.map((p) => p.value);
  const low = Math.min(...values) - 1,
    high = Math.max(...values) + 1;
  const dates = points.map((p) => Date.parse(p.date));
  const min = dates[0],
    max = dates.at(-1)!;
  const coords = points.map((p, i) => ({
    x: max === min ? 180 : 48 + ((dates[i] - min) / (max - min)) * 286,
    y: 154 - ((p.value - low) / (high - low)) * 118,
  }));
  const path = coords.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");
  const last = coords.at(-1)!;
  return (
    <div className="chart">
      <svg
        viewBox="0 0 360 205"
        role="img"
        aria-label={`Évolution : ${points.map((p) => `${dateLabel(p.date, true)} : ${number(p.value)} ${unit}`).join(", ")}`}
      >
        <defs>
          <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
            <stop stopColor="#b69bcc" stopOpacity=".35" />
            <stop offset="1" stopColor="#b69bcc" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2].map((i) => {
          const y = 36 + i * 59;
          return (
            <g key={i}>
              <line x1="42" x2="340" y1={y} y2={y} stroke="#eee4e8" />
              <text x="0" y={y + 4} fill="#89748a" fontSize="11">
                {number(high - (i * (high - low)) / 2, 1)}
              </text>
            </g>
          );
        })}
        {points.length > 1 && (
          <path
            d={`${path} L${last.x},160 L${coords[0].x},160 Z`}
            fill={`url(#${id})`}
          />
        )}
        <path
          d={path}
          fill="none"
          stroke="#9974b3"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {coords.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === coords.length - 1 ? 5 : 3}
            fill="#9974b3"
            stroke="#fff"
            strokeWidth="2"
          />
        ))}
        <text x="48" y="188" fill="#89748a" fontSize="11">
          {dateLabel(points[0].date, true)}
        </text>
        {points.length > 1 && (
          <text x="334" y="188" textAnchor="end" fill="#89748a" fontSize="11">
            {dateLabel(points.at(-1)!.date, true)}
          </text>
        )}
      </svg>
    </div>
  );
}
const male =
  "M138 69 L137 85 C124 90 105 92 99 106 C91 128 86 155 80 184 L70 230 Q68 242 77 244 Q85 244 87 234 L100 191 L111 143 L116 182 L113 217 C111 247 116 277 119 305 L123 374 L120 402 Q122 412 141 407 L143 374 L147 307 L150 254 L153 307 L157 374 L159 407 Q178 412 180 402 L177 374 L181 305 C184 277 189 247 187 217 L184 182 L189 143 L200 191 L213 234 Q215 244 223 244 Q232 242 230 230 L220 184 C214 155 209 128 201 106 C195 92 176 90 163 85 L162 69 C172 64 176 50 175 35 C175 9 125 9 125 35 C124 50 128 64 138 69 Z";
const female =
  "M138 69 L137 87 C123 93 110 94 104 108 C96 130 91 158 85 185 L74 230 Q71 242 79 244 Q87 244 90 234 L104 190 L115 145 C119 162 124 175 122 186 C118 201 106 218 108 242 C110 267 117 289 120 310 L124 374 L121 402 Q123 412 141 407 L144 374 L147 310 L150 268 L153 310 L156 374 L159 407 Q177 412 179 402 L176 374 L180 310 C183 289 190 267 192 242 C194 218 182 201 178 186 C176 175 181 162 185 145 L196 190 L210 234 Q213 244 221 244 Q229 242 226 230 L215 185 C209 158 204 130 196 108 C190 94 177 93 163 87 L162 69 C172 64 176 50 175 35 C175 9 125 9 125 35 C124 50 128 64 138 69 Z";

export function Silhouette({
  sex,
  selected,
  onSelect,
  enabled,
  completed = [],
}: {
  sex: "man" | "woman";
  selected: Zone;
  onSelect: (z: Zone) => void;
  enabled: Zone[];
  completed?: Zone[];
}) {
  const lines: {
    zone: Zone;
    y: number;
    segments: [number, number][];
    side: "left" | "right";
  }[] = [
    { zone: "chest", y: 126, segments: [[112, 188]], side: "left" },
    {
      zone: "arm",
      y: 149,
      segments: sex === "man" ? [[87, 111], [189, 213]] : [[92, 115], [185, 208]],
      side: "right",
    },
    { zone: "waist", y: 177, segments: [[119, 181]], side: "left" },
    { zone: "abdomen", y: 201, segments: [[116, 184]], side: "right" },
    { zone: "hips", y: 235, segments: [[110, 190]], side: "left" },
    {
      zone: "thigh",
      y: 284,
      segments: [
        [115, 148],
        [152, 185],
      ],
      side: "right",
    },
  ];
  return (
    <div className="silhouette">
      <div className="silhouette-canvas">
        <svg
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const y = ((e.clientY - r.top) / r.height) * 430;
            const x = ((e.clientX - r.left) / r.width) * 300;
            const hit = lines
              .filter(
                (l) =>
                  enabled.includes(l.zone) &&
                  l.segments.some(([a, b]) => x >= a - 10 && x <= b + 10),
              )
              .sort((a, b) => Math.abs(a.y - y) - Math.abs(b.y - y))[0];
            if (hit && Math.abs(hit.y - y) < 14) onSelect(hit.zone);
          }}
          style={{ cursor: "pointer" }}
          viewBox="0 0 300 430"
          role="img"
          aria-label={`Silhouette ${sex === "man" ? "masculine" : "féminine"}. Sélectionnez une zone avec les boutons autour du corps.`}
        >
          <defs>
            <clipPath id="silhouette-outline">
              <path d={sex === "man" ? male : female} />
            </clipPath>
            <linearGradient id="body" x1="0" x2="1" y1="0" y2="1">
              <stop stopColor="#dacada" />
              <stop offset="1" stopColor="#b8a5c0" />
            </linearGradient>
          </defs>
          <ellipse cx="150" cy="414" rx="50" ry="5" fill="#eee4eb" />
          <path d={sex === "man" ? male : female} fill="url(#body)" />
          {lines
            .filter((l) => enabled.includes(l.zone))
            .map((l) => {
              const done = completed.includes(l.zone);
              const active = selected === l.zone;
              const color = done ? "#39815b" : active ? "#dc714d" : "#fff";
              const anchor =
                l.side === "left" ? l.segments[0][0] : l.segments.at(-1)![1];
              return (
                <g key={l.zone} data-zone={l.zone} data-completed={done}>
                  {l.segments.map(([a, b], i) => (
                    <g key={i}>
                      <line
                        x1={a}
                        x2={b}
                        y1={l.y}
                        y2={l.y}
                        stroke={color}
                        strokeWidth={done || active ? 3 : 2}
                        clipPath="url(#silhouette-outline)"
                      />
                      {done && (
                        <g
                          transform={`translate(${(a + b) / 2},${l.y})`}
                          aria-hidden="true"
                        >
                          <circle r="7" fill="#39815b" />
                          <path
                            d="M-3.3 0 L-1 2.3 L3.5 -2.5"
                            fill="none"
                            stroke="white"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </g>
                      )}
                    </g>
                  ))}
                  <line
                    x1={l.side === "left" ? 65 : anchor}
                    x2={l.side === "left" ? anchor : 235}
                    y1={l.y}
                    y2={l.y}
                    stroke={done ? "#39815b" : active ? "#dc714d" : "#947b99"}
                    strokeDasharray="3 3"
                  />
                  {!done && (
                    <circle
                      cx={anchor}
                      cy={l.y}
                      r={active ? 4 : 2.5}
                      fill={color}
                      clipPath="url(#silhouette-outline)"
                    />
                  )}
                </g>
              );
            })}
        </svg>
        {lines
          .filter((l) => enabled.includes(l.zone))
          .map((l) => (
            <button
              key={l.zone}
              className={`body-point ${l.side} ${selected === l.zone ? "selected" : ""} ${completed.includes(l.zone) ? "completed" : ""}`}
              style={{ top: `${(l.y / 430) * 100}%` }}
              onClick={() => onSelect(l.zone)}
              aria-pressed={selected === l.zone}
              aria-label={`Mesurer : ${zones[l.zone].label}`}
              aria-description={
                completed.includes(l.zone)
                  ? "Mesure renseignée pour la date sélectionnée"
                  : "Mesure non renseignée pour la date sélectionnée"
              }
            >
              {zones[l.zone].label}
            </button>
          ))}
      </div>
      <p className="caption">Touchez un repère pour saisir une mesure.</p>
    </div>
  );
}
