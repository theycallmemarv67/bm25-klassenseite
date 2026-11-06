// Kleine Hilfsfunktionen für Datum und Zufall.

// 'JJJJ-MM-TT' oder 'JJJJ-MM-TTTHH:MM' als lokale Zeit lesen (new Date('JJJJ-MM-TT') wäre UTC).
export function parseDatum(text: string): Date {
  const [tag, zeit = '00:00'] = text.split('T');
  const [j, m, t] = tag.split('-').map(Number);
  const [h, min] = zeit.split(':').map(Number);
  return new Date(j, m - 1, t, h || 0, min || 0);
}

export function schluessel(d: Date): string {
  const zwei = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;
}

// Kalendertage von "heute" bis "ziel" (Uhrzeit egal). Negativ = Vergangenheit.
export function tageBis(ziel: Date, heute: Date): number {
  const a = new Date(ziel.getFullYear(), ziel.getMonth(), ziel.getDate());
  const b = new Date(heute.getFullYear(), heute.getMonth(), heute.getDate());
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

export function abstandText(tage: number): string {
  if (tage === 0) return 'Heute';
  if (tage === 1) return 'Morgen';
  if (tage > 1) return `in ${tage} Tagen`;
  return tage === -1 ? 'Gestern' : `vor ${-tage} Tagen`;
}

// Tage eines Monats als Raster mit Wochenstart Montag; null = leeres Feld davor.
export function monatsRaster(jahr: number, monat: number): (number | null)[] {
  const versatz = (new Date(jahr, monat, 1).getDay() + 6) % 7;
  const anzahl = new Date(jahr, monat + 1, 0).getDate();
  return [...Array(versatz).fill(null), ...Array.from({ length: anzahl }, (_, i) => i + 1)];
}

export function mischen<T>(liste: T[]): T[] {
  const kopie = [...liste];
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
  }
  return kopie;
}

export function formatDatum(d: Date, mitZeit = false): string {
  return d.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(mitZeit ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

// Zahl aus einer Eingabe lesen: "1.259,50", "416,50", "416.5", "15 %", "784 €". Ungültig (z. B. Buchstaben) = null.
export function zahlLesen(text: string): number | null {
  let s = text.replace(/[\s€%]/g, '').replace(/−/g, '-');
  if (!/^-?[\d.,]+$/.test(s) || !/\d/.test(s)) return null;
  const komma = s.lastIndexOf(',');
  const punkt = s.lastIndexOf('.');
  if (komma >= 0 && punkt >= 0) {
    // das letzte Trennzeichen ist das Dezimalzeichen, das andere trennt Tausender
    s = komma > punkt ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (komma >= 0) {
    s = (s.match(/,/g)!.length > 1 ? s.replace(/,/g, '') : s.replace(',', '.'));
  } else if (punkt >= 0 && (s.match(/\./g)!.length > 1 || /^-?\d{1,3}\.\d{3}$/.test(s))) {
    s = s.replace(/\./g, ''); // "1.259" oder "1.200.000" = deutsche Tausenderpunkte
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// Notenschätzung nach IHK-Punkteschlüssel (Prozent der Punkte)
export function ihkNote(prozent: number): number {
  return prozent >= 92 ? 1 : prozent >= 81 ? 2 : prozent >= 67 ? 3 : prozent >= 50 ? 4 : prozent >= 30 ? 5 : 6;
}
