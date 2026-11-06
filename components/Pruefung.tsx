'use client';

import { useEffect, useState } from 'react';
import { daten, type Frage } from '@/data/daten';
import { abstandText, formatDatum, mischen, parseDatum, tageBis } from '@/lib/hilfen';
import QuizLauf from './QuizLauf';
import Karteikarten from './Karteikarten';

const SPEICHER = 'pruefung-checkliste';

export default function Pruefung({ heute }: { heute: Date }) {
  const { pruefung, themen, fragen } = daten;

  // ----- Checkliste (localStorage kann fehlen oder gesperrt sein) -----
  const [erledigt, setErledigt] = useState<string[]>([]);
  useEffect(() => {
    try {
      const gespeichert = JSON.parse(localStorage.getItem(SPEICHER) ?? '[]');
      if (Array.isArray(gespeichert)) setErledigt(gespeichert);
    } catch {}
  }, []);
  const umschalten = (thema: string) => {
    const neu = erledigt.includes(thema) ? erledigt.filter((t) => t !== thema) : [...erledigt, thema];
    setErledigt(neu);
    try {
      localStorage.setItem(SPEICHER, JSON.stringify(neu));
    } catch {}
  };
  const fertigAnzahl = themen.filter((t) => erledigt.includes(t)).length;

  // ----- Prüfungsmodus -----
  const [anzahl, setAnzahl] = useState(Math.min(10, fragen.length));
  const [minuten, setMinuten] = useState(0);
  const [lauf, setLauf] = useState<Frage[] | null>(null);
  const [runde, setRunde] = useState(0);
  const starten = () => {
    const n = Math.max(1, Math.min(anzahl || 1, fragen.length));
    setLauf(mischen(fragen).slice(0, n));
    setRunde((r) => r + 1);
  };

  const termin = pruefung.datum ? parseDatum(pruefung.datum) : null;
  const tage = termin ? tageBis(termin, heute) : 0;

  return (
    <section>
      <h2>Countdown</h2>
      <div className="karte">
        {termin ? (
          <>
            <p className="countdown">
              {tage > 1 ? `Noch ${tage} Tage` : tage < 0 ? 'Vorbei' : abstandText(tage)}
            </p>
            <p style={{ marginBottom: 0 }}>
              <strong>{pruefung.titel}</strong>
              <br />
              {formatDatum(termin, true)} Uhr
              {pruefung.ort && (
                <>
                  <br />
                  Ort: {pruefung.ort}
                </>
              )}
            </p>
          </>
        ) : (
          <p className="leer">Noch kein Prüfungstermin eingetragen.</p>
        )}
      </div>

      <h2>Themen-Checkliste</h2>
      <div className="karte">
        {themen.length === 0 ? (
          <p className="leer">Noch keine Themen eingetragen.</p>
        ) : (
          <>
            <p style={{ marginTop: 0 }}>
              {fertigAnzahl} von {themen.length} erledigt
            </p>
            <progress value={fertigAnzahl} max={themen.length} aria-label="Fortschritt der Checkliste" />
            <div className="checkliste">
              {themen.map((t) => (
                <label key={t}>
                  <input type="checkbox" checked={erledigt.includes(t)} onChange={() => umschalten(t)} />
                  {t}
                </label>
              ))}
            </div>
          </>
        )}
      </div>

      <h2>Prüfungsmodus</h2>
      {fragen.length === 0 ? (
        <div className="karte">
          <p className="leer">Noch keine Quizfragen eingetragen.</p>
        </div>
      ) : lauf ? (
        <>
          <QuizLauf key={runde} fragen={lauf} minuten={minuten} onNochmal={starten} />
          <button className="knopf zweit" onClick={() => setLauf(null)}>
            Einstellungen ändern
          </button>
        </>
      ) : (
        <div className="karte">
          <div className="feld">
            <label htmlFor="pm-anzahl">Anzahl Fragen (max. {fragen.length})</label>
            <input
              id="pm-anzahl"
              type="number"
              min={1}
              max={fragen.length}
              value={anzahl}
              onChange={(e) => setAnzahl(Number(e.target.value))}
            />
          </div>
          <div className="feld">
            <label htmlFor="pm-zeit">Zeitlimit in Minuten (0 = ohne Limit)</label>
            <input
              id="pm-zeit"
              type="number"
              min={0}
              step={1}
              value={minuten}
              onChange={(e) => setMinuten(Math.max(0, Math.floor(Number(e.target.value))))}
            />
          </div>
          <button className="knopf" onClick={starten}>
            Prüfung starten
          </button>
        </div>
      )}

      <h2>Karteikarten</h2>
      {/* key: neu starten, wenn sich die Zahl der Karten in daten.ts ändert */}
      <Karteikarten key={daten.karten.length} />

      <h2>Hinweise</h2>
      <div className="karte">
        {pruefung.hinweise.length === 0 ? (
          <p className="leer">Noch keine Hinweise eingetragen.</p>
        ) : (
          <ul style={{ margin: 0 }}>
            {pruefung.hinweise.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
