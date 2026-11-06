'use client';

import { useEffect, useRef, useState } from 'react';
import type { Frage } from '@/data/daten';
import { mischen } from '@/lib/hilfen';

// Ein Quiz-Durchlauf: wird vom Quiz-Reiter und vom Prüfungsmodus benutzt.
export default function QuizLauf({
  fragen,
  minuten = 0,
  onNochmal,
}: {
  fragen: Frage[];
  minuten?: number; // 0 = ohne Zeitlimit
  onNochmal: () => void;
}) {
  const [reihenfolgen] = useState(() => fragen.map((f) => mischen(f.antworten.map((_, i) => i))));
  const [nr, setNr] = useState(0);
  const [antworten, setAntworten] = useState<(number | null)[]>(() => fragen.map(() => null));
  const [fertig, setFertig] = useState(false);
  const [rest, setRest] = useState(minuten * 60);
  const ueberschrift = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!minuten || fertig) return;
    const uhr = setInterval(() => setRest((r) => r - 1), 1000);
    return () => clearInterval(uhr);
  }, [minuten, fertig]);

  useEffect(() => {
    if (minuten && rest <= 0) setFertig(true);
  }, [minuten, rest]);

  useEffect(() => ueberschrift.current?.focus(), [nr, fertig]);

  if (fertig) {
    const punkte = antworten.filter((a, i) => a === fragen[i].richtig).length;
    const proThema = new Map<string, { richtig: number; gesamt: number }>();
    fragen.forEach((f, i) => {
      const s = proThema.get(f.thema) ?? { richtig: 0, gesamt: 0 };
      s.gesamt++;
      if (antworten[i] === f.richtig) s.richtig++;
      proThema.set(f.thema, s);
    });
    const offen = antworten.filter((a) => a === null).length;
    return (
      <div className="karte">
        <h3 ref={ueberschrift} tabIndex={-1}>
          Auswertung
        </h3>
        {minuten > 0 && rest <= 0 && <p className="rueckmeldung falsch">Die Zeit ist abgelaufen.</p>}
        <p className="countdown">
          {punkte} / {fragen.length}
        </p>
        <p>
          {Math.round((punkte / fragen.length) * 100)} % richtig
          {offen > 0 && ` · ${offen} unbeantwortet`}
        </p>
        <table>
          <thead>
            <tr>
              <th>Thema</th>
              <th>Richtig</th>
            </tr>
          </thead>
          <tbody>
            {[...proThema].map(([thema, s]) => (
              <tr key={thema}>
                <td>{thema}</td>
                <td>
                  {s.richtig} von {s.gesamt}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="knopfreihe">
          <button className="knopf" onClick={onNochmal}>
            Nochmal
          </button>
        </div>
      </div>
    );
  }

  const frage = fragen[nr];
  const gewaehlt = antworten[nr];
  const beantwortet = gewaehlt !== null;
  const letzte = nr + 1 === fragen.length;

  return (
    <div className="karte">
      <p className="leise" style={{ display: 'flex', justifyContent: 'space-between', margin: 0 }}>
        <span>
          Frage {nr + 1} von {fragen.length} · {frage.thema}
        </span>
        {minuten > 0 && (
          <span className="timer" role="timer" aria-label="Restzeit">
            {Math.floor(rest / 60)}:{String(rest % 60).padStart(2, '0')}
          </span>
        )}
      </p>
      <h3 ref={ueberschrift} tabIndex={-1} style={{ marginTop: '0.75rem' }}>
        {frage.frage}
      </h3>
      <div className="antworten">
        {reihenfolgen[nr].map((i) => {
          const art = !beantwortet ? '' : i === frage.richtig ? 'richtig' : i === gewaehlt ? 'falsch' : '';
          return (
            <button
              key={i}
              className={`antwort ${art}`}
              disabled={beantwortet}
              onClick={() => setAntworten(antworten.map((a, j) => (j === nr ? i : a)))}
            >
              {art === 'richtig' && '✓ '}
              {art === 'falsch' && '✗ '}
              {frage.antworten[i]}
            </button>
          );
        })}
      </div>
      <div aria-live="polite">
        {beantwortet && (
          <>
            <p className={`rueckmeldung ${gewaehlt === frage.richtig ? 'richtig' : 'falsch'}`}>
              {gewaehlt === frage.richtig ? 'Richtig!' : 'Leider falsch.'}
            </p>
            {frage.erklaerung && <p>{frage.erklaerung}</p>}
          </>
        )}
      </div>
      {beantwortet && (
        <button className="knopf" onClick={() => (letzte ? setFertig(true) : setNr(nr + 1))}>
          {letzte ? 'Zur Auswertung' : 'Weiter'}
        </button>
      )}
    </div>
  );
}
