// Selbsttest der Datumshilfen. Ausführen mit: node lib/hilfen.selbsttest.mts
import assert from 'node:assert/strict';
import { parseDatum, schluessel, tageBis, abstandText, monatsRaster, mischen } from './hilfen.ts';

assert.equal(schluessel(parseDatum('2027-03-05')), '2027-03-05');
assert.equal(parseDatum('2027-05-12T08:30').getHours(), 8);
// Über die Zeitumstellung hinweg (Ende März)
assert.equal(tageBis(parseDatum('2027-04-01'), parseDatum('2027-03-25T23:00')), 7);
assert.equal(abstandText(0), 'Heute');
assert.equal(abstandText(1), 'Morgen');
assert.equal(abstandText(5), 'in 5 Tagen');
// November 2026 beginnt an einem Sonntag: 6 leere Felder, dann 30 Tage
const raster = monatsRaster(2026, 10);
assert.equal(raster.filter((x) => x === null).length, 6);
assert.equal(raster.at(-1), 30);
assert.deepEqual(mischen([1, 2, 3, 4]).sort(), [1, 2, 3, 4]);
console.log('Selbsttest ok');

// Büste per Code: alle Punkte erzeugt, alle Werte endlich, Normalen normiert
const { buesteAusCode, WERTE_PRO_PUNKT } = await import('./bueste.ts');
const wolke = buesteAusCode(5000);
assert.equal(wolke.length, 5000 * WERTE_PRO_PUNKT);
assert.ok(wolke.every(Number.isFinite));
assert.ok(Math.abs(Math.hypot(wolke[3], wolke[4], wolke[5]) - 1) < 1e-5);
console.log('Büste ok');

// Zahleneingabe und Notenschlüssel
const { zahlLesen, ihkNote } = await import('./hilfen.ts');
assert.equal(zahlLesen('1.259,50'), 1259.5);
assert.equal(zahlLesen('416,50'), 416.5);
assert.equal(zahlLesen('416.5'), 416.5);
assert.equal(zahlLesen(' 784 € '), 784);
assert.equal(zahlLesen('15 %'), 15);
assert.equal(zahlLesen('1,259.50'), 1259.5);
assert.equal(zahlLesen('1.200'), 1200);
assert.equal(zahlLesen('0,8'), 0.8);
assert.equal(zahlLesen(''), null);
assert.equal(zahlLesen('abc'), null);
assert.equal(zahlLesen('12a'), null);
assert.deepEqual([92, 91, 81, 80, 67, 66, 50, 49, 30, 29].map(ihkNote), [1, 2, 2, 3, 3, 4, 4, 5, 5, 6]);

// Zwischenprüfung: genug Fragen je Stufe, Aufbau stimmt, Rechenergebnisse nachgerechnet
const { ZWISCHENPRUEFUNG, THEMEN } = await import('../data/zwischenpruefung.ts');
const zp = ZWISCHENPRUEFUNG.fragen;
for (const st of ['leicht', 'mittel', 'schwer']) assert.ok(zp.filter((f) => f.stufe === st).length >= 20, st);
for (const f of zp) {
  assert.ok((THEMEN as readonly string[]).includes(f.thema), f.frage);
  if ('antworten' in f) assert.ok(f.antworten.length === 4 && new Set(f.antworten).size === 4 && f.richtig === 0, f.frage);
  else assert.ok(Number.isFinite(f.zahl) && f.toleranz > 0, f.frage);
}
const r2 = (x: number) => Math.round(x * 100) / 100;
const ergebnis = (anfang: string) => (zp.find((f) => f.frage.startsWith(anfang)) as { zahl: number }).zahl;
assert.equal(ergebnis('Listeneinkaufspreis 1.200'), r2(1200 * 0.9 * 0.98 + 45));
assert.equal(ergebnis('Ein Bruttobetrag von 595'), r2(595 - 595 / 1.19));
assert.equal(ergebnis('Sie bestellen 250 Ordner'), r2((250 * 8.4 * 0.85 * 0.97 + 60) / 250));
assert.equal(ergebnis('Angebot A'), r2(1900 * 0.95 + 40 - 2000 * 0.9 * 0.98));
assert.equal(ergebnis('Ein Geschäftskunde zahlt'), r2((12400 * 10.27 * 60) / 36000));
assert.equal(ergebnis('Rechnung 15.000'), r2(450 - (14550 * 9 * 30) / 36000 + 1e-9));
assert.equal(ergebnis('Ein Kunde hat 1.499,40'), r2(1499.4 / 1.19));
assert.equal(ergebnis('Eine Forderung über 6.000'), (6000 * 12 * 45) / 36000);
assert.equal(ergebnis('Jahresanfangsbestand 300'), (300 + 4900) / 13);
assert.equal(ergebnis('Marktzinssatz 6 %'), r2((6 * 48) / 360));
assert.equal(ergebnis('Nach Abzug von 20 %'), 640 / 0.8);
console.log('Zwischenprüfung ok:', zp.length, 'Fragen');
