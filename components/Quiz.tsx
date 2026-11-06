'use client';

import { useState } from 'react';
import { daten, type Frage } from '@/data/daten';
import { mischen } from '@/lib/hilfen';
import QuizLauf from './QuizLauf';

export default function Quiz({ startThema }: { startThema: string }) {
  const [thema, setThema] = useState(startThema);
  const [lauf, setLauf] = useState<Frage[] | null>(null);
  const [runde, setRunde] = useState(0);

  const themen = [...new Set(daten.fragen.map((f) => f.thema))];
  if (thema !== 'alle' && !themen.includes(thema)) themen.push(thema);
  const auswahl = thema === 'alle' ? daten.fragen : daten.fragen.filter((f) => f.thema === thema);

  const starten = () => {
    setLauf(mischen(auswahl));
    setRunde((r) => r + 1);
  };

  return (
    <section>
      <h2>Quiz</h2>
      {lauf ? (
        <>
          <QuizLauf key={runde} fragen={lauf} onNochmal={starten} />
          <button className="knopf zweit" onClick={() => setLauf(null)}>
            Anderes Thema wählen
          </button>
        </>
      ) : (
        <div className="karte">
          <div className="feld">
            <label htmlFor="quiz-thema">Thema</label>
            <select id="quiz-thema" value={thema} onChange={(e) => setThema(e.target.value)}>
              <option value="alle">Alle Themen</option>
              {themen.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          {auswahl.length === 0 ? (
            <p className="leer">
              {daten.fragen.length === 0
                ? 'Noch keine Quizfragen eingetragen.'
                : 'Zu diesem Thema gibt es noch keine Fragen.'}
            </p>
          ) : (
            <p className="leise">{auswahl.length === 1 ? '1 Frage' : `${auswahl.length} Fragen`}</p>
          )}
          <button className="knopf" onClick={starten} disabled={auswahl.length === 0}>
            Quiz starten
          </button>
        </div>
      )}
    </section>
  );
}
