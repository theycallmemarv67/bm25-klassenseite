'use client';

import { useState } from 'react';
import { daten } from '@/data/daten';
import { mischen } from '@/lib/hilfen';

export default function Karteikarten() {
  const [reihe, setReihe] = useState(() => daten.karten.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [hinten, setHinten] = useState(false);

  if (daten.karten.length === 0) {
    return (
      <div className="karte">
        <p className="leer">Noch keine Karteikarten eingetragen.</p>
      </div>
    );
  }

  const karte = daten.karten[reihe[pos]];
  const gehe = (p: number) => {
    setPos(p);
    setHinten(false);
  };

  return (
    <div className="karte">
      <p className="leise" style={{ marginTop: 0 }}>
        Karte {pos + 1} von {reihe.length} · Klicken oder Enter/Leertaste zum Umdrehen
      </p>
      {/* Ein Button reagiert von selbst auf Klick, Enter und Leertaste. */}
      <button
        className={`lernkarte${hinten ? ' umgedreht' : ''}`}
        onClick={() => setHinten(!hinten)}
        aria-label={hinten ? `Rückseite: ${karte.hinten}. Umdrehen` : `Vorderseite: ${karte.vorne}. Umdrehen`}
      >
        <span className="lernkarte-innen">
          <span className="seite" aria-hidden="true">
            <small>Vorderseite</small>
            {karte.vorne}
          </span>
          <span className="seite hinten" aria-hidden="true">
            <small>Rückseite</small>
            {karte.hinten}
          </span>
        </span>
      </button>
      <div className="knopfreihe">
        <button className="knopf zweit" onClick={() => gehe(pos - 1)} disabled={pos === 0}>
          Zurück
        </button>
        <button className="knopf zweit" onClick={() => gehe(pos + 1)} disabled={pos === reihe.length - 1}>
          Weiter
        </button>
        <button
          className="knopf zweit"
          onClick={() => {
            setReihe(mischen(reihe));
            gehe(0);
          }}
        >
          Mischen
        </button>
      </div>
    </div>
  );
}
