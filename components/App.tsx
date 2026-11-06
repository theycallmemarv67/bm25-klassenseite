'use client';

import { useEffect, useRef, useState } from 'react';
import { daten } from '@/data/daten';
import { onlineAktiv, termineLaden, type OnlineTermin } from '@/lib/termineOnline';
import Partikel from './Partikel';
import Winter, { type Modus } from './Winter';
import Uhr from './Uhr';
import Kugel, { vorwaermen } from './Kugel';
import Tal from './Tal';
import Frost from './Frost';
import Einstellungen from './Einstellungen';
import Startseite from './Startseite';
import Termine from './Termine';
import Lernstoff from './Lernstoff';
import Quiz from './Quiz';
import Pruefung from './Pruefung';

const REITER = [
  { id: 'start', name: 'Start' },
  { id: 'termine', name: 'Termine' },
  { id: 'lernstoff', name: 'Lernstoff' },
  { id: 'quiz', name: 'Quiz' },
  { id: 'pruefung', name: 'Prüfung' },
  { id: 'einstellungen', name: 'Einstellungen' },
] as const;

// Tageszeit und Schneefall im Browser merken (localStorage kann fehlen oder gesperrt sein)
const SPEICHER = 'bm25-einstellungen';
type Gespeichert = { modus: Modus; schneefall: boolean };
function laden(): Gespeichert {
  const standard: Gespeichert = { modus: 'auto', schneefall: true };
  if (typeof window === 'undefined') return standard;
  try {
    const g = JSON.parse(localStorage.getItem(SPEICHER) ?? 'null');
    return {
      modus: ['auto', 'morgen', 'tag', 'abend', 'nacht'].includes(g?.modus) ? g.modus : 'auto',
      schneefall: typeof g?.schneefall === 'boolean' ? g.schneefall : true,
    };
  } catch {
    return standard;
  }
}
type ReiterId = (typeof REITER)[number]['id'];

// Messraster: Linien in Prozent der Fläche, Kreuze an den Schnittpunkten.
const SENKRECHT = [21, 61, 79];
const WAAGERECHT = [24, 78];

export default function App() {
  const [aktiv, setAktiv] = useState<ReiterId>('start');
  // "Heute" erst im Browser bestimmen, sonst gilt das Datum vom Build.
  const [heute, setHeute] = useState<Date | null>(null);
  const [offenerTest, setOffenerTest] = useState<number | null>(null);
  const [quizThema, setQuizThema] = useState('alle');
  const [wisch, setWisch] = useState<{ name: string; nr: number } | null>(null);
  const [frost, setFrost] = useState(0); // > 0: Frost-Effekt läuft (Wert = Schlüssel)
  const ersterWechsel = useRef(true);
  const [einstellungen, setEinstellungen] = useState<Gespeichert>(laden);
  const aendern = (neu: Partial<Gespeichert>) => {
    const wert = { ...einstellungen, ...neu };
    setEinstellungen(wert);
    try {
      localStorage.setItem(SPEICHER, JSON.stringify(wert));
    } catch {}
  };

  useEffect(() => setHeute(new Date()), []);

  // Gemeinsame Termine (Supabase): beim Start einmal, im Reiter "Termine" alle 30 Sekunden
  const [online, setOnline] = useState<OnlineTermin[]>([]);
  const [onlineFehler, setOnlineFehler] = useState<string | null>(null);
  const onlineNeu = async () => {
    if (!onlineAktiv) return;
    try {
      setOnline(await termineLaden());
      setOnlineFehler(null);
    } catch (err) {
      setOnlineFehler((err as Error).message);
    }
  };
  useEffect(() => {
    onlineNeu();
    if (aktiv !== 'termine') return;
    const id = window.setInterval(onlineNeu, 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aktiv]);

  // Schneekugel-Shader schon vorbereiten, während die Startseite läuft
  useEffect(() => {
    const id = window.setTimeout(vorwaermen, 2500);
    return () => clearTimeout(id);
  }, []);

  // Nach einem Wechsel die Überschrift fokussieren (für Tastatur und Screenreader).
  useEffect(() => {
    if (ersterWechsel.current) {
      ersterWechsel.current = false;
      return;
    }
    document.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: true });
  }, [aktiv]);

  function wechseln(id: ReiterId) {
    if (wisch || id === aktiv) return;
    const name = REITER.find((r) => r.id === id)!.name;
    setFrost(0); // Eis sofort weg, wenn ein anderer Reiter gewählt wird
    // Zurück auf "Start": statt Wisch friert der Bildschirm zu (nicht beim ersten Laden, nicht bei reduzierter Bewegung)
    if (id === 'start' && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setAktiv(id);
      scrollTo(0, 0);
      setFrost(Date.now());
      return;
    }
    // "Termine" und "Quiz": statt Wisch übernehmen Schneekugel bzw. Winter-Tal (bei reduzierter Bewegung direkt)
    if (id === 'termine' || id === 'quiz' || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setAktiv(id);
      scrollTo(0, 0);
      return;
    }
    // Fläche wischt rein (≈0,35 s), Reiter wird getauscht, Fläche wischt raus (bis 0,85 s).
    setWisch({ name, nr: Date.now() });
    setTimeout(() => {
      setAktiv(id);
      scrollTo(0, 0);
    }, 420);
    setTimeout(() => setWisch(null), 850);
  }

  const titel = REITER.find((r) => r.id === aktiv)!.name;

  return (
    <>
      <Winter gedimmt={aktiv !== 'start'} modus={einstellungen.modus} schneefall={einstellungen.schneefall} />
      <Uhr modus={einstellungen.modus} />
      <Partikel laeuft={aktiv === 'start'} />
      {aktiv === 'termine' && <Kugel />}
      {aktiv === 'quiz' && <Tal />}
      {aktiv === 'start' && frost > 0 && <Frost key={frost} onEnde={() => setFrost(0)} />}
      <div className="messraster" aria-hidden="true">
        {SENKRECHT.map((x) => (
          <i key={`v${x}`} className="v" style={{ left: `${x}%` }} />
        ))}
        {WAAGERECHT.map((y) => (
          <i key={`h${y}`} className="h" style={{ top: `${y}%` }} />
        ))}
        {SENKRECHT.flatMap((x) =>
          WAAGERECHT.map((y) => <i key={`k${x}-${y}`} className="kreuz" style={{ left: `${x}%`, top: `${y}%` }} />),
        )}
      </div>

      <aside className="leiste">
        <div className="logo">
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
            <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="38 12" />
            <circle cx="10" cy="10" r="3" fill="currentColor" />
          </svg>
          {daten.klasse}
        </div>
        <nav aria-label="Bereiche">
          {REITER.map((r) => (
            <button key={r.id} aria-current={aktiv === r.id ? 'page' : undefined} onClick={() => wechseln(r.id)}>
              <span className="marker" aria-hidden="true" />
              {r.name}
            </button>
          ))}
        </nav>
      </aside>

      <main className="hauptbereich">
        {aktiv === 'start' ? (
          <Startseite heute={heute} online={online} onLos={() => wechseln('termine')} />
        ) : (
          <div className={`inhalt${aktiv === 'termine' ? ' inhalt-termine' : aktiv === 'quiz' ? ' inhalt-quiz' : ''}`} key={aktiv}>
            <h1 className="seitentitel" tabIndex={-1}>
              {titel}
            </h1>
            {aktiv === 'termine' &&
              (heute ? (
                <Termine
                  heute={heute}
                  online={online}
                  onlineFehler={onlineFehler}
                  neuLaden={onlineNeu}
                  zumLernstoff={(i) => {
                    setOffenerTest(i);
                    wechseln('lernstoff');
                  }}
                />
              ) : (
                <p className="leise">Lädt …</p>
              ))}
            {aktiv === 'lernstoff' && (
              <Lernstoff
                offenerTest={offenerTest}
                zumQuiz={(thema) => {
                  setQuizThema(thema);
                  wechseln('quiz');
                }}
              />
            )}
            {aktiv === 'quiz' && <Quiz startThema={quizThema} />}
            {aktiv === 'einstellungen' && (
              <Einstellungen
                modus={einstellungen.modus}
                setModus={(modus) => aendern({ modus })}
                schneefall={einstellungen.schneefall}
                setSchneefall={(schneefall) => aendern({ schneefall })}
              />
            )}
            {aktiv === 'pruefung' && (heute ? <Pruefung heute={heute} /> : <p className="leise">Lädt …</p>)}
          </div>
        )}
      </main>

      {wisch && (
        <div className="wisch" key={wisch.nr} aria-hidden="true">
          <div className="wisch-name">
            {[...wisch.name].map((b, i) => (
              <span key={i} style={{ '--i': i } as React.CSSProperties}>
                {b}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
