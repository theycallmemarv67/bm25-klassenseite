'use client';

import { useState } from 'react';
import { daten } from '@/data/daten';
import { abstandText, formatDatum, monatsRaster, parseDatum, schluessel, tageBis } from '@/lib/hilfen';
import { onlineAktiv, terminAnlegen, terminLoeschen, type OnlineTermin } from '@/lib/termineOnline';

const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const CODE_SPEICHER = 'bm25-klassencode';

// Ein Termin aus data/daten.ts (testIndex) oder aus der gemeinsamen Online-Liste (onlineId)
type Eintrag = {
  schluessel: string;
  fach: string;
  thema: string;
  datum: string;
  stunde?: number;
  notiz?: string | null;
  testIndex?: number;
  onlineId?: number;
  tage: number;
};

export default function Termine({
  heute,
  zumLernstoff,
  online,
  onlineFehler,
  neuLaden,
}: {
  heute: Date;
  zumLernstoff: (i: number) => void;
  online: OnlineTermin[];
  onlineFehler: string | null;
  neuLaden: () => Promise<void>;
}) {
  const [monat, setMonat] = useState(() => new Date(heute.getFullYear(), heute.getMonth(), 1));
  const [gewaehlt, setGewaehlt] = useState<string | null>(null);
  const [formularOffen, setFormularOffen] = useState(false);
  const [meldung, setMeldung] = useState<{ text: string; gut: boolean } | null>(null);

  const eintraege: Eintrag[] = [
    ...daten.tests.map((t, i) => ({ ...t, schluessel: `lokal-${i}`, testIndex: i, tage: tageBis(parseDatum(t.datum), heute) })),
    ...online.map((t) => ({ ...t, schluessel: `online-${t.id}`, onlineId: t.id, tage: tageBis(parseDatum(t.datum), heute) })),
  ].sort((a, b) => a.datum.localeCompare(b.datum));
  const anstehend = eintraege.filter((t) => t.tage >= 0);
  const vergangen = eintraege.filter((t) => t.tage < 0).reverse();

  // Alle Termine nach Tag gruppiert (Kalender)
  const proTag = new Map<string, { titel: string; eintrag?: Eintrag }[]>();
  const hinzu = (tag: string, t: { titel: string; eintrag?: Eintrag }) => proTag.set(tag, [...(proTag.get(tag) ?? []), t]);
  eintraege.forEach((e) => hinzu(e.datum, { titel: `${e.fach}: ${e.thema}${e.stunde ? `, ${e.stunde}. Stunde` : ''}`, eintrag: e }));
  if (daten.pruefung.datum) {
    const d = parseDatum(daten.pruefung.datum);
    hinzu(schluessel(d), {
      titel: `${daten.pruefung.titel}, ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`,
    });
  }

  const jahr = monat.getFullYear();
  const m = monat.getMonth();
  const monatName = monat.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  const blaettern = (schritt: number) => {
    setMonat(new Date(jahr, m + schritt, 1));
    setGewaehlt(null);
  };
  const termineAmTag = gewaehlt ? proTag.get(gewaehlt) ?? [] : [];

  async function loeschen(e: Eintrag) {
    const code = window.prompt(`Admin-Code zum Löschen von „${e.fach}: ${e.thema}“:`);
    if (!code) return;
    try {
      await terminLoeschen(code.trim(), e.onlineId!);
      setMeldung({ text: 'Termin gelöscht.', gut: true });
      await neuLaden();
    } catch (err) {
      setMeldung({ text: (err as Error).message, gut: false });
    }
  }

  const knoepfe = (e: Eintrag) => (
    <>
      {e.testIndex !== undefined && (
        <button className="knopf zweit" onClick={() => zumLernstoff(e.testIndex!)}>
          Lernstoff
        </button>
      )}
      {e.onlineId !== undefined && (
        <button className="knopf zweit klein" onClick={() => loeschen(e)} aria-label={`Termin ${e.fach}: ${e.thema} löschen`}>
          Löschen
        </button>
      )}
    </>
  );

  const eintragZeile = (e: Eintrag) => (
    <li key={e.schluessel} className="karte termin">
      <div>
        <strong>{e.fach}</strong>: {e.thema}
        <br />
        <span className="leise">
          {formatDatum(parseDatum(e.datum))}
          {e.stunde ? ` · ${e.stunde}. Stunde` : ''}
        </span>
        {e.notiz && <span className="notiz">{e.notiz}</span>}
      </div>
      <div className="knopfreihe" style={{ marginTop: 0, alignItems: 'center' }}>
        {e.tage >= 0 && <span className="badge">{abstandText(e.tage)}</span>}
        {knoepfe(e)}
      </div>
    </li>
  );

  return (
    <section>
      <h2>Kalender</h2>
      <div className="karte kalender">
        <div className="kalender-kopf">
          <button className="monatsknopf" onClick={() => blaettern(-1)} aria-label="Vorheriger Monat">
            ‹
          </button>
          <h3 aria-live="polite">{monatName}</h3>
          <button className="monatsknopf" onClick={() => blaettern(1)} aria-label="Nächster Monat">
            ›
          </button>
        </div>
        <div className="raster">
          {WOCHENTAGE.map((w) => (
            <div key={w} className="wochentag" aria-hidden="true">
              {w}
            </div>
          ))}
          {monatsRaster(jahr, m).map((tag, i) => {
            if (tag === null) return <div key={`leer-${i}`} />;
            const datum = new Date(jahr, m, tag);
            const key = schluessel(datum);
            const anzahl = proTag.get(key)?.length ?? 0;
            const istHeute = key === schluessel(heute);
            return (
              <button
                key={key}
                className={`tag${istHeute ? ' heute' : ''}`}
                aria-pressed={gewaehlt === key}
                aria-label={`${formatDatum(datum)}${istHeute ? ', heute' : ''}${anzahl ? `, ${anzahl} Termin${anzahl > 1 ? 'e' : ''}` : ''}`}
                onClick={() => setGewaehlt(gewaehlt === key ? null : key)}
              >
                {tag}
                {anzahl > 0 && <span className="punkt" />}
              </button>
            );
          })}
        </div>
        <div aria-live="polite">
          {gewaehlt && (
            <div style={{ marginTop: '1rem' }}>
              <strong>{formatDatum(parseDatum(gewaehlt))}</strong>
              {termineAmTag.length === 0 ? (
                <p className="leer">Keine Termine an diesem Tag.</p>
              ) : (
                <ul>
                  {termineAmTag.map((t, i) => (
                    <li key={i}>
                      {t.titel} {t.eintrag && knoepfe(t.eintrag)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {onlineAktiv && (
        <>
          <div className="knopfreihe">
            <button className="knopf" aria-expanded={formularOffen} onClick={() => setFormularOffen(!formularOffen)}>
              {formularOffen ? 'Formular schließen' : 'Termin eintragen'}
            </button>
          </div>
          {formularOffen && (
            <TerminFormular
              onFertig={async () => {
                setMeldung({ text: 'Termin eingetragen. Alle aus der Klasse sehen ihn jetzt.', gut: true });
                setFormularOffen(false);
                await neuLaden();
              }}
            />
          )}
        </>
      )}
      <p aria-live="polite" className={meldung ? `rueckmeldung ${meldung.gut ? 'richtig' : 'falsch'}` : undefined}>
        {meldung?.text}
      </p>
      {onlineFehler && (
        <p className="hinweis" role="status">
          Gemeinsame Termine konnten nicht geladen werden: {onlineFehler} Angezeigt werden nur die festen Termine.
        </p>
      )}

      <h2>Anstehende Tests</h2>
      {anstehend.length === 0 ? (
        <p className="leer">Noch keine Tests eingetragen.</p>
      ) : (
        <ul className="liste">{anstehend.map(eintragZeile)}</ul>
      )}

      {vergangen.length > 0 && (
        <>
          <h2>Vergangene Tests</h2>
          <ul className="liste vorbei">{vergangen.map(eintragZeile)}</ul>
        </>
      )}
    </section>
  );
}

// Formular zum Eintragen; der Klassencode wird nach dem ersten Erfolg im Browser gemerkt.
function TerminFormular({ onFertig }: { onFertig: () => Promise<void> }) {
  const [code, setCode] = useState(() => {
    try {
      return localStorage.getItem(CODE_SPEICHER) ?? '';
    } catch {
      return '';
    }
  });
  const [fehler, setFehler] = useState('');
  const [sendet, setSendet] = useState(false);

  async function absenden(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const wert = (n: string) => String(f.get(n) ?? '').trim();
    const t = { datum: wert('datum'), fach: wert('fach'), thema: wert('thema'), notiz: wert('notiz') };
    if (!t.datum || !t.fach || !t.thema || !code.trim()) {
      setFehler('Bitte Datum, Fach, Thema und Klassencode ausfüllen.');
      return;
    }
    setSendet(true);
    setFehler('');
    try {
      await terminAnlegen(code.trim(), t);
      try {
        localStorage.setItem(CODE_SPEICHER, code.trim());
      } catch {}
      await onFertig();
    } catch (err) {
      setFehler((err as Error).message);
    } finally {
      setSendet(false);
    }
  }

  return (
    <form className="karte formular" onSubmit={absenden} noValidate>
      <div className="feld">
        <label htmlFor="t-datum">Datum</label>
        <input id="t-datum" name="datum" type="date" required />
      </div>
      <div className="feld">
        <label htmlFor="t-fach">Fach</label>
        <input id="t-fach" name="fach" type="text" maxLength={60} required placeholder="z. B. LF6" />
      </div>
      <div className="feld">
        <label htmlFor="t-thema">Thema</label>
        <input id="t-thema" name="thema" type="text" maxLength={200} required />
      </div>
      <div className="feld">
        <label htmlFor="t-notiz">Notiz (optional)</label>
        <textarea id="t-notiz" name="notiz" maxLength={500} rows={2} />
      </div>
      <div className="feld">
        <label htmlFor="t-code">Klassencode</label>
        <input id="t-code" type="text" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} required />
      </div>
      {fehler && (
        <p className="rueckmeldung falsch" role="alert">
          {fehler}
        </p>
      )}
      <button className="knopf" type="submit" disabled={sendet}>
        {sendet ? 'Wird gespeichert …' : 'Eintragen'}
      </button>
    </form>
  );
}
