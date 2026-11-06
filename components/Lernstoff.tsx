'use client';

import { useEffect } from 'react';
import { daten } from '@/data/daten';
import { formatDatum, parseDatum } from '@/lib/hilfen';

export default function Lernstoff({
  offenerTest,
  zumQuiz,
}: {
  offenerTest: number | null;
  zumQuiz: (thema: string) => void;
}) {
  useEffect(() => {
    if (offenerTest !== null) document.getElementById(`test-${offenerTest}`)?.scrollIntoView({ block: 'center' });
  }, [offenerTest]);

  const tests = daten.tests.map((t, i) => ({ ...t, i })).sort((a, b) => a.datum.localeCompare(b.datum));

  return (
    <section>
      <h2>Lernstoff</h2>
      {tests.length === 0 && <p className="leer">Noch kein Lernstoff eingetragen.</p>}
      {tests.map((t) => (
        <details key={t.i} id={`test-${t.i}`} className="karte" open={offenerTest === t.i}>
          <summary>
            {t.fach}: {t.thema} <span className="leise">({formatDatum(parseDatum(t.datum))})</span>
          </summary>

          <h3>Das musst du können</h3>
          {t.lernstoff.length === 0 ? (
            <p className="leer">Noch nichts eingetragen.</p>
          ) : (
            <ul>
              {t.lernstoff.map((punkt, j) => (
                <li key={j}>{punkt}</li>
              ))}
            </ul>
          )}

          <h3>Arbeitsmittel</h3>
          {t.material.length === 0 ? (
            <p className="leer">Noch keine Arbeitsmittel eingetragen.</p>
          ) : (
            <ul>
              {t.material.map((mat, j) => (
                <li key={j}>
                  <a href={mat.link} target="_blank" rel="noopener noreferrer">
                    {mat.titel}
                    <span className="leise"> (öffnet in neuem Tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          )}

          <div className="knopfreihe">
            <button className="knopf" onClick={() => zumQuiz(t.thema)}>
              Quiz zu diesem Thema
            </button>
          </div>
        </details>
      ))}
    </section>
  );
}
