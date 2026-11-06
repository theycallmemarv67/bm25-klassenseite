'use client';

import { useState } from 'react';
import { daten } from '@/data/daten';
import { abstandText, formatDatum, monatsRaster, parseDatum, schluessel, tageBis } from '@/lib/hilfen';

const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

type Termin = { titel: string; testIndex?: number };

export default function Termine({ heute, zumLernstoff }: { heute: Date; zumLernstoff: (i: number) => void }) {
  const [monat, setMonat] = useState(() => new Date(heute.getFullYear(), heute.getMonth(), 1));
  const [gewaehlt, setGewaehlt] = useState<string | null>(null);

  // Alle Termine nach Tag gruppiert: { 'JJJJ-MM-TT': [...] }
  const proTag = new Map<string, Termin[]>();
  const hinzu = (tag: string, t: Termin) => proTag.set(tag, [...(proTag.get(tag) ?? []), t]);
  daten.tests.forEach((t, i) =>
    hinzu(t.datum, { titel: `${t.fach}: ${t.thema}${t.stunde ? `, ${t.stunde}. Stunde` : ''}`, testIndex: i }),
  );
  if (daten.pruefung.datum) {
    const d = parseDatum(daten.pruefung.datum);
    hinzu(schluessel(d), {
      titel: `${daten.pruefung.titel}, ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`,
    });
  }

  const sortiert = daten.tests
    .map((t, i) => ({ ...t, i, tage: tageBis(parseDatum(t.datum), heute) }))
    .sort((a, b) => a.datum.localeCompare(b.datum));
  const anstehend = sortiert.filter((t) => t.tage >= 0);
  const vergangen = sortiert.filter((t) => t.tage < 0).reverse();

  const jahr = monat.getFullYear();
  const m = monat.getMonth();
  const monatName = monat.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  const blaettern = (schritt: number) => {
    setMonat(new Date(jahr, m + schritt, 1));
    setGewaehlt(null);
  };

  const termineAmTag = gewaehlt ? proTag.get(gewaehlt) ?? [] : [];

  const testEintrag = (t: (typeof sortiert)[number]) => (
    <li key={t.i} className="karte termin">
      <div>
        <strong>{t.fach}</strong>: {t.thema}
        <br />
        <span className="leise">
          {formatDatum(parseDatum(t.datum))}
          {t.stunde ? ` · ${t.stunde}. Stunde` : ''}
        </span>
      </div>
      <div className="knopfreihe" style={{ marginTop: 0, alignItems: 'center' }}>
        {t.tage >= 0 && <span className="badge">{abstandText(t.tage)}</span>}
        <button className="knopf zweit" onClick={() => zumLernstoff(t.i)}>
          Lernstoff
        </button>
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
                      {t.titel}{' '}
                      {t.testIndex !== undefined && (
                        <button className="knopf zweit" onClick={() => zumLernstoff(t.testIndex!)}>
                          Lernstoff
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      <h2>Anstehende Tests</h2>
      {anstehend.length === 0 ? (
        <p className="leer">Noch keine Tests eingetragen.</p>
      ) : (
        <ul className="liste">{anstehend.map(testEintrag)}</ul>
      )}

      {vergangen.length > 0 && (
        <>
          <h2>Vergangene Tests</h2>
          <ul className="liste vorbei">{vergangen.map(testEintrag)}</ul>
        </>
      )}
    </section>
  );
}
