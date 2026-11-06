'use client';

import { useEffect, useState } from 'react';
import { ZWISCHENPRUEFUNG, type ZpAufgabe } from '@/data/zwischenpruefung';
import { mischen } from '@/lib/hilfen';
import QuizLauf from './QuizLauf';

type StufeId = keyof typeof ZWISCHENPRUEFUNG.stufen;
const SPEICHER = 'bm25-zp-stufe';
const { info, stufen, fragen } = ZWISCHENPRUEFUNG;
const pool = (s: StufeId) => (s === 'gemischt' ? fragen : fragen.filter((f) => f.stufe === s));

// Übungs-Simulation für Teil 1 der Abschlussprüfung (Zwischenprüfung) mit drei Stufen und Simulation
export default function Zwischenpruefung() {
  const [stufe, setStufe] = useState<StufeId>('leicht');
  const [anzahl, setAnzahl] = useState(stufen.leicht.anzahl);
  const [minuten, setMinuten] = useState(stufen.leicht.minuten);
  const [lauf, setLauf] = useState<ZpAufgabe[] | null>(null);
  const [runde, setRunde] = useState(0);

  const waehlen = (s: StufeId) => {
    setStufe(s);
    setAnzahl(stufen[s].anzahl);
    setMinuten(stufen[s].minuten);
    try {
      localStorage.setItem(SPEICHER, s);
    } catch {}
  };
  useEffect(() => {
    try {
      const s = localStorage.getItem(SPEICHER);
      if (s && s in stufen) waehlen(s as StufeId);
    } catch {}
  }, []);

  const verfuegbar = pool(stufe).length;
  const starten = () => {
    setLauf(mischen(pool(stufe)).slice(0, Math.max(1, Math.min(anzahl || 1, verfuegbar))));
    setRunde((r) => r + 1);
  };

  return (
    <>
      <h2>Zwischenprüfung</h2>
      <div className="karte">
        <p style={{ marginTop: 0 }}>
          <strong>{info.teil}</strong>
        </p>
        <ul>
          <li>Dauer: {info.dauer}</li>
          <li>Gewicht: {info.gewicht}</li>
          <li>Zeitpunkt: {info.zeitpunkt}</li>
          <li>Inhalt: {info.inhalt}</li>
        </ul>
        <p className="hinweis" style={{ marginBottom: 0 }}>
          Die echte Prüfung ist ein Arbeitsauftrag am Computer mit Textverarbeitung und Tabellenkalkulation. Hier übst du das
          nötige Wissen. Alle Aufgaben sind <strong>eigene Übungsfragen</strong>, keine Original-Aufgaben der IHK oder AkA.
        </p>
      </div>

      {lauf ? (
        <>
          <QuizLauf key={runde} fragen={lauf} minuten={minuten} note onNochmal={starten} />
          <button className="knopf zweit" onClick={() => setLauf(null)}>
            Stufe ändern
          </button>
        </>
      ) : (
        <>
          <h2 id="zp-stufe-titel">Stufe</h2>
          <div className="kacheln" role="radiogroup" aria-labelledby="zp-stufe-titel">
            {(Object.keys(stufen) as StufeId[]).map((s) => (
              <label key={s} className={`kachel${stufe === s ? ' gewaehlt' : ''}`}>
                <input
                  type="radio"
                  name="zp-stufe"
                  value={s}
                  aria-label={`${stufen[s].name}, ${stufen[s].text}, ${pool(s).length} Aufgaben`}
                  checked={stufe === s}
                  onChange={() => waehlen(s)}
                />
                <span className="marker" aria-hidden="true" />
                <strong>{stufen[s].name}</strong>
                <small>{stufen[s].text}</small>
                <small>{pool(s).length} Aufgaben im Pool</small>
              </label>
            ))}
          </div>
          <div className="karte" style={{ marginTop: 12 }}>
            <div className="feld">
              <label htmlFor="zp-anzahl">Aufgaben (max. {verfuegbar})</label>
              <input
                id="zp-anzahl"
                type="number"
                min={1}
                max={verfuegbar}
                value={anzahl}
                onChange={(e) => setAnzahl(Math.floor(Number(e.target.value)))}
              />
            </div>
            <div className="feld">
              <label htmlFor="zp-zeit">Minuten (0 = ohne Limit)</label>
              <input
                id="zp-zeit"
                type="number"
                min={0}
                step={1}
                value={minuten}
                onChange={(e) => setMinuten(Math.max(0, Math.floor(Number(e.target.value))))}
              />
            </div>
            <button className="knopf" onClick={starten}>
              Zwischenprüfung starten
            </button>
          </div>
        </>
      )}
    </>
  );
}
