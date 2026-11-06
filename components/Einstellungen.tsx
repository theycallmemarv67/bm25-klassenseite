'use client';

import { MODUS_NAMEN, type Modus } from './Winter';

const BESCHREIBUNG: Record<Modus, string> = {
  auto: 'folgt der Uhrzeit',
  morgen: 'kurz nach Sonnenaufgang',
  tag: 'Mittag, Sonne oben',
  abend: 'Sonnenuntergang',
  nacht: 'Mond und Sterne',
};

export default function Einstellungen({
  modus,
  setModus,
  schneefall,
  setSchneefall,
}: {
  modus: Modus;
  setModus: (m: Modus) => void;
  schneefall: boolean;
  setSchneefall: (s: boolean) => void;
}) {
  return (
    <section>
      <h2 id="tageszeit-titel">Tageszeit</h2>
      <div className="kacheln" role="radiogroup" aria-labelledby="tageszeit-titel">
        {(Object.keys(MODUS_NAMEN) as Modus[]).map((m) => (
          <label key={m} className={`kachel${modus === m ? ' gewaehlt' : ''}`}>
            <input
              type="radio"
              name="tageszeit"
              value={m}
              aria-label={`${MODUS_NAMEN[m]}, ${BESCHREIBUNG[m]}`}
              checked={modus === m}
              onChange={() => setModus(m)}
            />
            <span className="marker" aria-hidden="true" />
            <strong>{MODUS_NAMEN[m]}</strong>
            <small>{BESCHREIBUNG[m]}</small>
          </label>
        ))}
      </div>

      <h2>Effekte</h2>
      <div className="karte schalter-zeile">
        <span id="schneefall-text">Schneefall</span>
        <button
          className="schalter"
          role="switch"
          aria-checked={schneefall}
          aria-labelledby="schneefall-text"
          onClick={() => setSchneefall(!schneefall)}
        >
          <span aria-hidden="true" />
        </button>
      </div>
      <p className="leise">Die Auswahl wird in diesem Browser gespeichert.</p>
    </section>
  );
}
