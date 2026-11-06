'use client';

import { useEffect, useRef, useState } from 'react';
import { ihkNote, mischen, zahlLesen } from '@/lib/hilfen';

// Eine Aufgabe: Mehrfachauswahl (antworten/richtig) oder Rechenaufgabe (zahl/einheit/toleranz)
export type QuizAufgabe = { thema: string; frage: string; erklaerung: string } & (
  | { antworten: string[]; richtig: number }
  | { zahl: number; einheit: string; toleranz: number }
);
type Ergebnis = { gut: boolean; wahl?: number; eingabe?: number } | null;

const zahlText = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 2 });

// Ein Quiz-Durchlauf: wird vom Quiz-Reiter, vom Prüfungsmodus und von der Zwischenprüfung benutzt.
export default function QuizLauf({
  fragen,
  minuten = 0,
  note = false,
  onNochmal,
}: {
  fragen: QuizAufgabe[];
  minuten?: number; // 0 = ohne Zeitlimit
  note?: boolean; // Notenschätzung nach IHK-Schlüssel anzeigen
  onNochmal: () => void;
}) {
  const [reihenfolgen] = useState(() => fragen.map((f) => ('antworten' in f ? mischen(f.antworten.map((_, i) => i)) : [])));
  const [nr, setNr] = useState(0);
  const [antworten, setAntworten] = useState<Ergebnis[]>(() => fragen.map(() => null));
  const [eingabe, setEingabe] = useState('');
  const [eingabeFehler, setEingabeFehler] = useState('');
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
    const punkte = antworten.filter((a) => a?.gut).length;
    const prozent = Math.round((punkte / fragen.length) * 100);
    const proThema = new Map<string, { richtig: number; gesamt: number }>();
    fragen.forEach((f, i) => {
      const s = proThema.get(f.thema) ?? { richtig: 0, gesamt: 0 };
      s.gesamt++;
      if (antworten[i]?.gut) s.richtig++;
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
          {prozent} % richtig
          {offen > 0 && ` · ${offen} unbeantwortet`}
        </p>
        {note && (
          <p>
            <strong>Notenschätzung: Note {ihkNote(prozent)}</strong>
            <br />
            <span className="leise">
              Nach dem IHK-Schlüssel (ab 92 % = 1, 81 % = 2, 67 % = 3, 50 % = 4, 30 % = 5). Nur eine Schätzung für diese Übung.
            </span>
          </p>
        )}
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
  const ergebnis = antworten[nr];
  const beantwortet = ergebnis !== null;
  const letzte = nr + 1 === fragen.length;
  const merken = (e: Ergebnis) => setAntworten(antworten.map((a, j) => (j === nr ? e : a)));
  const weiter = () => {
    setEingabe('');
    setEingabeFehler('');
    if (letzte) setFertig(true);
    else setNr(nr + 1);
  };
  const pruefen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!('zahl' in frage) || beantwortet) return;
    const n = zahlLesen(eingabe);
    if (n === null) {
      setEingabeFehler('Bitte eine Zahl eingeben, z. B. 416,50.');
      return;
    }
    setEingabeFehler('');
    merken({ gut: Math.abs(n - frage.zahl) <= frage.toleranz + 1e-9, eingabe: n });
  };

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
      {'antworten' in frage ? (
        <div className="antworten">
          {reihenfolgen[nr].map((i) => {
            const art = !beantwortet ? '' : i === frage.richtig ? 'richtig' : i === ergebnis.wahl ? 'falsch' : '';
            return (
              <button
                key={i}
                className={`antwort ${art}`}
                disabled={beantwortet}
                onClick={() => merken({ gut: i === frage.richtig, wahl: i })}
              >
                {art === 'richtig' && '✓ '}
                {art === 'falsch' && '✗ '}
                {frage.antworten[i]}
              </button>
            );
          })}
        </div>
      ) : (
        <form className="rechnen" onSubmit={pruefen} noValidate>
          <label htmlFor="rechen-eingabe">Ergebnis{frage.einheit && ` in ${frage.einheit}`}</label>
          <div className="knopfreihe" style={{ marginTop: 6, alignItems: 'center' }}>
            <input
              id="rechen-eingabe"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={eingabe}
              disabled={beantwortet}
              aria-invalid={!!eingabeFehler}
              aria-describedby={eingabeFehler ? 'rechen-fehler' : undefined}
              onChange={(e) => setEingabe(e.target.value)}
            />
            {frage.einheit && <span>{frage.einheit}</span>}
            <button className="knopf zweit" type="submit" disabled={beantwortet}>
              Prüfen
            </button>
          </div>
          {eingabeFehler && (
            <p id="rechen-fehler" className="rueckmeldung falsch" role="alert">
              {eingabeFehler}
            </p>
          )}
        </form>
      )}
      <div aria-live="polite">
        {beantwortet && (
          <>
            <p className={`rueckmeldung ${ergebnis.gut ? 'richtig' : 'falsch'}`}>
              {ergebnis.gut ? 'Richtig!' : 'Leider falsch.'}
              {'zahl' in frage && !ergebnis.gut && ` Richtig ist ${zahlText(frage.zahl)}${frage.einheit ? ` ${frage.einheit}` : ''}.`}
            </p>
            {frage.erklaerung && <p>{frage.erklaerung}</p>}
          </>
        )}
      </div>
      {beantwortet && (
        <button className="knopf" onClick={weiter}>
          {letzte ? 'Zur Auswertung' : 'Weiter'}
        </button>
      )}
    </div>
  );
}
