'use client';

import { Fragment, useEffect, useState } from 'react';
import { daten } from '@/data/daten';
import { parseDatum, tageBis } from '@/lib/hilfen';
import Titel from './Titel';
import type { OnlineTermin } from '@/lib/termineOnline';

const ruhig = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// Zahl, die beim Anzeigen von 0 hochzählt.
function Zaehler({ wert }: { wert: number | null }) {
  const [z, setZ] = useState(0);
  useEffect(() => {
    if (wert === null) return;
    if (ruhig() || wert === 0) return setZ(wert);
    let bild = 0;
    const start = performance.now();
    const schritt = (jetzt: number) => {
      const t = Math.min(1, (jetzt - start) / 1200);
      setZ(Math.round(wert * (1 - (1 - t) ** 3)));
      if (t < 1) bild = requestAnimationFrame(schritt);
    };
    bild = requestAnimationFrame(schritt);
    return () => cancelAnimationFrame(bild);
  }, [wert]);
  return <>{wert === null ? '–' : z}</>;
}

// Wechselnde Aussage: Buchstaben blenden einzeln mit Unschärfe ein.
function Aussagen() {
  const saetze = daten.startseite.aussagen;
  const [nr, setNr] = useState(0);
  const [weg, setWeg] = useState(false);
  useEffect(() => {
    if (saetze.length < 2) return;
    const t1 = setTimeout(() => setWeg(true), 3300);
    const t2 = setTimeout(() => {
      setNr((n) => (n + 1) % saetze.length);
      setWeg(false);
    }, 3900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [nr, saetze.length]);
  if (saetze.length === 0) return null;

  let i = 0;
  return (
    <p className={`aussage${weg ? ' weg' : ''}`} aria-live="polite">
      <span className="nur-sr">{saetze[nr]}</span>
      <span key={nr} aria-hidden="true">
        {saetze[nr].split(' ').map((wort, w) => (
          <Fragment key={w}>
            {w > 0 && ' '}
            <span className="wort">
              {[...wort].map((b) => (
                <span key={i} className="b" style={{ '--i': i++ } as React.CSSProperties}>
                  {b}
                </span>
              ))}
            </span>
          </Fragment>
        ))}
      </span>
    </p>
  );
}

export default function Startseite({ heute, online, onLos }: { heute: Date | null; online: OnlineTermin[]; onLos: () => void }) {
  const { klasse, startseite, tests, pruefung, fragen } = daten;
  const anstehend = heute ? [...tests, ...online].filter((t) => tageBis(parseDatum(t.datum), heute) >= 0).length : null;
  const tage = heute && pruefung.datum ? Math.max(0, tageBis(parseDatum(pruefung.datum), heute)) : null;

  return (
    <section className="start">
      <div className="titel">
        <Titel text={klasse} />
        <p className="headline">{startseite.headline}</p>
      </div>

      <button className="los" onClick={onLos}>
        {startseite.knopf}
        <span className="pfeile" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} style={{ '--i': i } as React.CSSProperties}>
              ›
            </span>
          ))}
        </span>
      </button>

      <div className="zahlen">
        <p className="zahl z1">
          <b>
            <Zaehler wert={anstehend} />
          </b>
          <small>Anstehende Tests</small>
        </p>
        <p className="zahl z2">
          <b>
            <Zaehler wert={tage} />
          </b>
          <small>Tage bis zur Prüfung</small>
        </p>
        <p className="zahl z3">
          <b>
            <Zaehler wert={fragen.length} />
          </b>
          <small>Quizfragen</small>
        </p>
      </div>

      <p className="starttext">{startseite.text}</p>
      <Aussagen />
    </section>
  );
}
