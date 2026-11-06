// Erzeugt die Punktwolke der Büste.
// Je Punkt 8 Zahlen: Position (x, y, z), Normale (x, y, z), Helligkeit (0–1), Zufallswert (0–1).
// Koordinaten: y nach oben, z zum Betrachter, Kopf etwa bei y = 0.4, Schultern bei y = -0.45.

export const WERTE_PRO_PUNKT = 8;

// Kleiner, wiederholbarer Zufallsgenerator (gleiche Wolke bei jedem Laden).
function zufallsquelle(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const glatt = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// ---------------------------------------------------------------------
// Variante 1: aus den zwei Foto-PNGs (siehe scripts/foto-zu-kopf.swift).
// tiefe:    R = Tiefe (hell = vorne), G = Maske (Person), B = Helligkeit
// normalen: RGB = Normale (x, y, z) von 0–255 auf -1…1
// ---------------------------------------------------------------------
export type Bild = { breite: number; hoehe: number; pixel: Uint8ClampedArray };

export function buesteAusFoto(tiefe: Bild, normalen: Bild, anzahl: number, seed = 7): Float32Array {
  const zufall = zufallsquelle(seed);
  const aus = new Float32Array(anzahl * WERTE_PRO_PUNKT);
  const { breite: b, hoehe: h } = tiefe;
  const skala = 2.1 / h; // Bildhöhe ≈ 2.1 Einheiten
  let n = 0;
  for (let versuche = 0; n < anzahl && versuche < anzahl * 60; versuche++) {
    const fx = zufall() * b;
    const fy = zufall() * h;
    const i = (Math.floor(fy) * b + Math.floor(fx)) * 4;
    if (tiefe.pixel[i + 1] < 128) continue; // nicht Teil der Person
    const hell = tiefe.pixel[i + 2] / 255;
    // Hellere Stellen bekommen mehr Partikel (Augen, Brauen, Nase, Mund, Haare bleiben erkennbar).
    if (zufall() > 0.1 + 0.9 * hell ** 1.6) continue;
    const z = (tiefe.pixel[i] / 255) * 0.55 - 0.2 + (zufall() - 0.5) * 0.012;
    const o = n * WERTE_PRO_PUNKT;
    aus[o] = (fx - b / 2) * skala;
    aus[o + 1] = (h * 0.62 - fy) * skala;
    aus[o + 2] = z;
    aus[o + 3] = normalen.pixel[i] / 127.5 - 1;
    aus[o + 4] = normalen.pixel[i + 1] / 127.5 - 1;
    aus[o + 5] = normalen.pixel[i + 2] / 127.5 - 1;
    aus[o + 6] = hell;
    aus[o + 7] = zufall();
    n++;
  }
  return aus.subarray(0, n * WERTE_PRO_PUNKT);
}

// ---------------------------------------------------------------------
// Variante 2: Büste per Code (wenn keine Foto-PNGs vorhanden sind).
// ---------------------------------------------------------------------
export function buesteAusCode(anzahl: number, seed = 1): Float32Array {
  const zufall = zufallsquelle(seed);
  const aus = new Float32Array(anzahl * WERTE_PRO_PUNKT);
  let n = 0;

  const ablegen = (x: number, y: number, z: number, nx: number, ny: number, nz: number, hell: number) => {
    // Hellere Stellen bekommen mehr Partikel.
    if (n >= anzahl || zufall() > 0.3 + 0.7 * hell) return;
    const l = Math.hypot(nx, ny, nz) || 1;
    const o = n * WERTE_PRO_PUNKT;
    aus[o] = x;
    aus[o + 1] = y;
    aus[o + 2] = z;
    aus[o + 3] = nx / l;
    aus[o + 4] = ny / l;
    aus[o + 5] = nz / l;
    aus[o + 6] = hell;
    aus[o + 7] = zufall();
    n++;
  };

  const neigung = -0.16; // Kopf leicht nach oben geneigt
  const cn = Math.cos(neigung);
  const sn = Math.sin(neigung);

  function kopf() {
    const u = zufall() * 2 - 1;
    const phi = zufall() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const [rx, ry, rz] = [0.33, 0.43, 0.39];
    let x = s * Math.cos(phi) * rx;
    let y = u * ry;
    let z = s * Math.sin(phi) * rz;
    let [nx, ny, nz] = [x / (rx * rx), y / (ry * ry), z / (rz * rz)];
    let hell = 0.6;

    if (y < 0) {
      // Kiefer und Kinn schmaler
      const k = glatt(0, -ry, y);
      x *= 1 - 0.35 * k;
      z *= 1 - 0.12 * k;
    }
    const g = (cx: number, cy: number, sx: number, sy: number) =>
      Math.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2));
    if (z > 0.08) {
      const vorne = glatt(0.08, 0.3, z);
      const nase = 0.11 * g(0, -0.03, 0.04 + 0.04 * glatt(0.08, -0.12, y), 0.12);
      const augen = -0.055 * (g(-0.12, 0.07, 0.065, 0.045) + g(0.12, 0.07, 0.065, 0.045));
      const stirn = 0.025 * g(0, 0.15, 0.22, 0.04);
      const lippen = 0.025 * g(0, -0.21, 0.08, 0.03);
      const kinn = 0.03 * g(0, -0.33, 0.09, 0.06);
      z += (nase + augen + stirn + lippen + kinn) * vorne;
      hell += (0.35 * Math.min(1, nase * 12) + 0.25 * stirn * 20 - 0.4 * Math.min(1, -augen * 14)) * vorne;
      nx += (x / 0.04) * nase * 2 * vorne; // Nasenflanken zur Seite
    }
    // Ohren
    if (Math.abs(x) > 0.25) x += Math.sign(x) * 0.05 * Math.exp(-((y / 0.08) ** 2 + ((z + 0.02) / 0.06) ** 2));
    // Haare: oben und hinten etwas Volumen und Strähnen
    if (y > 0.16 || (z < -0.05 && y > -0.12)) {
      const dicke = 0.03 + 0.03 * zufall();
      x += (nx / 3) * dicke;
      y += (ny / 3) * dicke * 0.6;
      z += (nz / 3) * dicke;
      hell = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(phi * 38 + u * 9));
    }
    // Neigen und an die richtige Stelle setzen
    [y, z] = [y * cn - z * sn, y * sn + z * cn];
    [ny, nz] = [ny * cn - nz * sn, ny * sn + nz * cn];
    ablegen(x, y + 0.4, z + 0.02, nx, ny, nz, Math.min(1, Math.max(0, hell)));
  }

  function hals() {
    const t = zufall() * Math.PI * 2;
    const y = -0.2 + zufall() * 0.33;
    ablegen(0.14 * Math.cos(t), y, 0.13 * Math.sin(t) + 0.02, Math.cos(t), 0, Math.sin(t), 0.5);
  }

  function schultern() {
    const y = -0.08 - zufall() * 1.05;
    const s = Math.sqrt(glatt(-0.08, -0.44, y));
    const w = (0.15 + 0.62 * s) * (1 - 0.08 * glatt(-0.45, -1.1, y));
    const d = 0.13 + 0.15 * s;
    if (zufall() > w / 0.8) return; // breite Stellen brauchen mehr Punkte
    const t = zufall() * Math.PI * 2;
    const c = Math.cos(t);
    const sn2 = Math.sin(t);
    const x = Math.sign(c) * Math.abs(c) ** 0.6 * w;
    const z = Math.sign(sn2) * Math.abs(sn2) ** 0.8 * d;
    ablegen(x, y, z, c, 0.8 * (1 - s), sn2, 0.45 + 0.2 * (1 - s));
  }

  for (let versuche = 0; n < anzahl && versuche < anzahl * 10; versuche++) {
    const wahl = zufall();
    if (wahl < 0.56) kopf();
    else if (wahl < 0.64) hals();
    else schultern();
  }
  return aus.subarray(0, n * WERTE_PRO_PUNKT);
}
