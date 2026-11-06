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
