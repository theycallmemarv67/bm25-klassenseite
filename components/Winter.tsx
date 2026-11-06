'use client';

import { useEffect, useRef } from 'react';

// Winterwunderland (ohne Weihnachtsbaum) als Vektorgrafik in Canvas 2D, das der Tageszeit folgt.
// Einmal pro Fenstergröße vorgezeichnet: Sterne, Wolken, Landschaft in Nacht- und Tag-Palette, leuchtende Fenster.
// Pro Bild nur: Himmel (Nacht / Dämmerung / Tag), Sonne und Mond auf ihrem Bogen, Überblenden der Ebenen.
// Canvas "schnee" darüber: Schneefall und flackernde Lichterketten.

export type Modus = 'auto' | 'morgen' | 'tag' | 'abend' | 'nacht';
export const MODUS_NAMEN: Record<Modus, string> = {
  auto: 'Automatisch',
  morgen: 'Morgen',
  tag: 'Tag',
  abend: 'Abend',
  nacht: 'Nacht',
};

// ---------- Sonnenzeiten aus der Jahreszeit schätzen ----------
const MITTAG = 12 * 60 + 36; // 12:36
export function sonnenzeiten(datum = new Date()) {
  const tag = Math.floor((datum.getTime() - new Date(datum.getFullYear(), 0, 0).getTime()) / 86_400_000);
  const laenge = (12.1 + 4.2 * Math.sin((2 * Math.PI * (tag - 80)) / 365)) * 60; // Minuten
  return { aufgang: MITTAG - laenge / 2, untergang: MITTAG + laenge / 2 };
}
export function zielMinuten(modus: Modus): number {
  const { aufgang, untergang } = sonnenzeiten();
  const jetzt = new Date();
  if (modus === 'morgen') return aufgang + 40;
  if (modus === 'tag') return MITTAG;
  if (modus === 'abend') return untergang + 5;
  if (modus === 'nacht') return 23 * 60;
  return jetzt.getHours() * 60 + jetzt.getMinutes() + jetzt.getSeconds() / 60;
}

// Zuletzt gezeichnete Szenenzeit (für die Uhr); Änderungen kommen als Event "szenenzeit".
export let szenenzeit = zielMinuten('auto');

type Zufall = () => number;
function zufallsquelle(seed: number): Zufall {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Paletten ----------
type Palette = {
  berg: [string, string];
  kante: string;
  feld: [string, string, string];
  wehe: string;
  fern: string;
  fichte: [string, string, string];
  fichteSchnee: [string, string];
  baeusch: [string, string];
  busch: [string, string];
  stamm: string;
  haus: string;
  dach: string;
  fenster: string;
  draht: string;
  dunst: string;
};
const NACHT: Palette = {
  berg: ['#2a2b74', '#1b1d58'],
  kante: 'rgba(232,238,255,0.6)',
  feld: ['#4b5499', '#6c78bd', '#353d80'],
  wehe: 'rgba(225,233,255,0.28)',
  fern: '#121850',
  fichte: ['#36588f', '#1b2c62', '#080e2c'],
  fichteSchnee: ['rgba(245,249,255,0.95)', 'rgba(170,190,240,0.75)'],
  baeusch: ['#dfe7ff', '#98a8dc'],
  busch: ['#f2f6ff', '#7f90cf'],
  stamm: '#0b0f2a',
  haus: '#1a1c4a',
  dach: '#e3eaff',
  fenster: '#20244a',
  draht: 'rgba(8,10,30,0.85)',
  dunst: 'rgba(220,130,170,0.22)',
};
const TAG: Palette = {
  berg: ['#93a5d6', '#6f84bf'],
  kante: 'rgba(255,255,255,0.95)',
  feld: ['#d6e1f8', '#f1f5ff', '#bccbee'],
  wehe: 'rgba(255,255,255,0.55)',
  fern: '#3d5684',
  fichte: ['#5f86b5', '#2e4f7f', '#152a50'],
  fichteSchnee: ['rgba(255,255,255,1)', 'rgba(205,220,250,0.92)'],
  baeusch: ['#ffffff', '#c3d0f0'],
  busch: ['#ffffff', '#b4c3ea'],
  stamm: '#3a2f3a',
  haus: '#6b5662',
  dach: '#ffffff',
  fenster: '#39435f',
  draht: 'rgba(40,40,55,0.8)',
  dunst: 'rgba(210,225,255,0.3)',
};

type Lampe = { x: number; y: number; farbe: number; phase: number };
const LAMPENFARBEN = ['255,236,190', '255,160,70', '255,120,190', '150,215,255']; // Warmweiß, Orange, Rosa, Eisblau

function draehte(W: number, H: number) {
  return [
    { x0: -0.02 * W, y0: 0.05 * H, x1: 0.4 * W, y1: 0.09 * H, sag: 0.09 * H },
    { x0: 0.3 * W, y0: 0.03 * H, x1: 0.74 * W, y1: 0.06 * H, sag: 0.07 * H },
    { x0: 0.66 * W, y0: 0.08 * H, x1: 1.02 * W, y1: 0.04 * H, sag: 0.08 * H },
  ].map((d) => ({ ...d, cx: (d.x0 + d.x1) / 2, cy: (d.y0 + d.y1) / 2 + d.sag * 2 }));
}
const bezier = (a: number, c: number, b: number, t: number) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * c + t * t * b;

function lampen(W: number, H: number): Lampe[] {
  const r = zufallsquelle(7);
  const aus: Lampe[] = [];
  draehte(W, H).forEach((d, k) => {
    const n = Math.max(6, Math.round(Math.hypot(d.x1 - d.x0, d.y1 - d.y0) / 34));
    for (let i = 1; i < n; i++) {
      const t = i / n;
      aus.push({ x: bezier(d.x0, d.cx, d.x1, t), y: bezier(d.y0, d.cy, d.y1, t) + 5, farbe: (i + k) % 4, phase: r() * 10 });
    }
  });
  return aus;
}

// ---------- Fichte: gestapelte Stufen, hell links, dunkel rechts, Schnee oben und an der Unterkante ----------
function fichte(c: CanvasRenderingContext2D, p: Palette, x: number, boden: number, h: number, r: Zufall, fern = false) {
  const stufen = fern ? 4 : 7;
  const breite = h * 0.46;
  c.fillStyle = p.stamm;
  c.fillRect(x - h * 0.025, boden - h * 0.1, h * 0.05, h * 0.1);
  for (let i = 0; i < stufen; i++) {
    const t = i / stufen;
    const unten = boden - h * 0.07 - t * h * 0.8;
    const hoehe = ((h * 0.93) / stufen) * 1.55;
    const hb = (breite / 2) * (1 - t * 0.82) + h * 0.015;
    const oben = unten - hoehe;
    const pfad = new Path2D();
    pfad.moveTo(x, oben);
    pfad.quadraticCurveTo(x - hb * 0.4, unten - hoehe * 0.45, x - hb, unten);
    const zacken = fern ? 3 : 6;
    for (let z = 1; z <= zacken; z++) {
      const zx = x - hb + (2 * hb * z) / zacken;
      pfad.lineTo(zx - hb / zacken, unten + hoehe * 0.07 * (0.5 + r() * 0.5));
      pfad.lineTo(zx, unten);
    }
    pfad.quadraticCurveTo(x + hb * 0.4, unten - hoehe * 0.45, x, oben);
    if (fern) {
      c.fillStyle = p.fern;
      c.fill(pfad);
      continue;
    }
    const g = c.createLinearGradient(x - hb, 0, x + hb, 0);
    g.addColorStop(0, p.fichte[0]);
    g.addColorStop(0.45, p.fichte[1]);
    g.addColorStop(1, p.fichte[2]);
    c.fillStyle = g;
    c.fill(pfad);
    const schnee = new Path2D();
    schnee.moveTo(x, oben);
    schnee.quadraticCurveTo(x - hb * 0.45, unten - hoehe * 0.5, x - hb * 0.85, unten - hoehe * 0.12);
    schnee.quadraticCurveTo(x - hb * 0.2, unten - hoehe * 0.32, x + hb * 0.45, unten - hoehe * 0.22);
    schnee.quadraticCurveTo(x + hb * 0.2, unten - hoehe * 0.55, x, oben);
    const gs = c.createLinearGradient(x - hb, 0, x + hb * 0.5, 0);
    gs.addColorStop(0, p.fichteSchnee[0]);
    gs.addColorStop(1, p.fichteSchnee[1]);
    c.fillStyle = gs;
    c.fill(schnee);
    const n = Math.max(3, Math.round(hb / (h * 0.018)));
    for (let k = 0; k < n; k++) {
      const bx = x - hb * 0.95 + (hb * 1.6 * k) / n;
      const br = h * (0.005 + r() * 0.008);
      c.fillStyle = bx < x ? p.baeusch[0] : p.baeusch[1];
      c.beginPath();
      c.arc(bx, unten - br * 0.3, br, 0, Math.PI * 2);
      c.fill();
    }
  }
}

function busch(c: CanvasRenderingContext2D, p: Palette, x: number, y: number, s: number, r: Zufall) {
  for (let i = 0; i < 6; i++) {
    const bx = x + (r() - 0.5) * s * 1.6;
    const by = y - r() * s * 0.5;
    const br = s * (0.35 + r() * 0.35);
    const g = c.createLinearGradient(0, by - br, 0, by + br);
    g.addColorStop(0, p.busch[0]);
    g.addColorStop(1, p.busch[1]);
    c.fillStyle = g;
    c.beginPath();
    c.arc(bx, by, br, 0, Math.PI * 2);
    c.fill();
  }
}

function berg(c: CanvasRenderingContext2D, p: Palette, W: number, basis: number, hoehe: number, farbe: string, r: Zufall) {
  const [f1, f2, f3] = [0.004 + r() * 0.002, 0.011 + r() * 0.004, 0.03 + r() * 0.01];
  const [p1, p2, p3] = [r() * 6, r() * 6, r() * 6];
  const y = (x: number) =>
    basis - hoehe * (0.55 + 0.45 * (0.6 * Math.sin(x * f1 + p1) + 0.28 * Math.sin(x * f2 + p2) + 0.12 * Math.sin(x * f3 + p3)));
  const kamm = new Path2D();
  kamm.moveTo(0, y(0));
  for (let x = 6; x <= W + 6; x += 6) kamm.lineTo(x, y(x));
  const flaeche = new Path2D(kamm);
  flaeche.lineTo(W + 6, basis + 40);
  flaeche.lineTo(0, basis + 40);
  c.fillStyle = farbe;
  c.fill(flaeche);
  c.strokeStyle = 'rgba(230,236,255,0.14)';
  c.lineWidth = 7;
  c.stroke(kamm);
  c.strokeStyle = p.kante;
  c.lineWidth = 1.4;
  c.stroke(kamm);
}

// Landschaft (ohne Himmel) in einer Palette. Mit "glut" werden die leuchtenden Fenster dorthin gezeichnet.
function landschaft(c: CanvasRenderingContext2D, W: number, H: number, p: Palette, glut?: CanvasRenderingContext2D) {
  const r = zufallsquelle(42); // gleiche Zufallsfolge für beide Paletten -> deckungsgleich
  const horizont = H * 0.64;
  const s = Math.min(W, H) / 800;

  berg(c, p, W, horizont + 4, H * 0.24, p.berg[0], r);
  berg(c, p, W, horizont + 8, H * 0.13, p.berg[1], r);

  let g = c.createLinearGradient(0, horizont - H * 0.08, 0, horizont + H * 0.04);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.7, p.dunst);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.fillRect(0, horizont - H * 0.08, W, H * 0.12);

  const feld = horizont + H * 0.025;
  g = c.createLinearGradient(0, feld, 0, H);
  g.addColorStop(0, p.feld[0]);
  g.addColorStop(0.35, p.feld[1]);
  g.addColorStop(1, p.feld[2]);
  c.fillStyle = g;
  c.fillRect(0, feld, W, H - feld);
  for (let i = 0; i < 7; i++) {
    const wx = r() * W;
    const wy = feld + (0.15 + r() * 0.8) * (H - feld);
    const rx = W * (0.15 + r() * 0.2);
    const ry = (H - feld) * (0.05 + r() * 0.06);
    g = c.createRadialGradient(wx, wy, 0, wx, wy, rx);
    g.addColorStop(0, p.wehe);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.save();
    c.translate(wx, wy);
    c.scale(1, ry / rx);
    c.translate(-wx, -wy);
    c.fillStyle = g;
    c.beginPath();
    c.arc(wx, wy, rx, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  for (let x = -10; x < W + 10; x += 7 + r() * 9) fichte(c, p, x, feld + 2, (14 + r() * 16) * s * 1.4, r, true);

  // Dorf: Fenster tagsüber dunkel, nachts (Ebene "glut") warm leuchtend mit Dunst
  const dorfX = W * 0.36;
  if (glut) {
    g = glut.createRadialGradient(dorfX, feld, 0, dorfX, feld, W * 0.16);
    g.addColorStop(0, 'rgba(255,170,90,0.22)');
    g.addColorStop(1, 'rgba(255,170,90,0)');
    glut.fillStyle = g;
    glut.fillRect(dorfX - W * 0.16, feld - W * 0.16, W * 0.32, W * 0.32);
  }
  for (let i = 0; i < 9; i++) {
    const hx = dorfX + (i - 4) * 26 * s + (r() - 0.5) * 10 * s;
    const hy = feld + 6 * s + r() * 8 * s;
    const hw = (14 + r() * 10) * s;
    const hh = (9 + r() * 6) * s;
    c.fillStyle = p.haus;
    c.fillRect(hx - hw / 2, hy - hh, hw, hh);
    c.fillStyle = p.dach;
    c.beginPath();
    c.moveTo(hx - hw * 0.62, hy - hh);
    c.lineTo(hx, hy - hh - hw * 0.45);
    c.lineTo(hx + hw * 0.62, hy - hh);
    c.fill();
    const fenster = 1 + Math.floor(r() * 2);
    for (let f = 0; f < fenster; f++) {
      const [fx, fy, fw, fh] = [hx - hw * 0.3 + f * hw * 0.38, hy - hh * 0.65, hw * 0.18, hh * 0.3];
      c.fillStyle = p.fenster;
      c.fillRect(fx, fy, fw, fh);
      if (glut) {
        glut.save();
        glut.shadowColor = '#ffb050';
        glut.shadowBlur = 8 * s;
        glut.fillStyle = '#ffd27e';
        glut.fillRect(fx, fy, fw, fh);
        glut.restore();
      }
    }
  }

  for (let x = -20; x < W + 20; x += 18 + r() * 30) {
    if (Math.abs(x - dorfX) < 130 * s) continue;
    fichte(c, p, x, feld + (H - feld) * 0.18 + r() * 10, (40 + r() * 35) * s * 1.3, r);
  }

  fichte(c, p, W * 0.05, H * 1.02, H * 0.78, r);
  fichte(c, p, W * 0.17, H * 1.0, H * 0.5, r);
  fichte(c, p, W * 0.96, H * 1.03, H * 0.74, r);
  fichte(c, p, W * 0.86, H * 1.0, H * 0.44, r);

  busch(c, p, W * 0.25, H * 0.98, 34 * s, r);
  busch(c, p, W * 0.75, H * 0.99, 40 * s, r);
  busch(c, p, W * 0.5, H * 1.01, 28 * s, r);

  c.strokeStyle = p.draht;
  c.lineWidth = 1.3;
  draehte(W, H).forEach((d) => {
    c.beginPath();
    c.moveTo(d.x0, d.y0);
    c.quadraticCurveTo(d.cx, d.cy, d.x1, d.y1);
    c.stroke();
  });
}

function sterne(c: CanvasRenderingContext2D, W: number, H: number) {
  const r = zufallsquelle(5);
  const horizont = H * 0.64;
  for (let i = 0; i < Math.round((W * H) / 4500); i++) {
    const x = r() * W;
    const y = r() * horizont * 0.85;
    c.fillStyle = `rgba(230,236,255,${(0.25 + 0.75 * r()) * (1 - y / horizont)})`;
    c.beginPath();
    c.arc(x, y, r() < 0.93 ? 0.5 + r() * 0.6 : 1.2 + r() * 0.8, 0, Math.PI * 2);
    c.fill();
  }
}

function wolken(c: CanvasRenderingContext2D, W: number, H: number) {
  const r = zufallsquelle(11);
  for (let i = 0; i < 7; i++) {
    const wx = r() * W;
    const wy = H * (0.1 + r() * 0.3);
    const breite = W * (0.08 + r() * 0.1);
    for (let k = 0; k < 6; k++) {
      const bx = wx + (r() - 0.5) * breite;
      const by = wy + (r() - 0.5) * breite * 0.18;
      const br = breite * (0.18 + r() * 0.2);
      const g = c.createRadialGradient(bx, by - br * 0.3, 0, bx, by, br);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.6, 'rgba(240,245,255,0.6)');
      g.addColorStop(1, 'rgba(230,238,255,0)');
      c.fillStyle = g;
      c.beginPath();
      c.arc(bx, by, br, 0, Math.PI * 2);
      c.fill();
    }
  }
}

// Kontrast: dunkler Bereich hinter dem Kopf und Vignette
function abschluss(c: CanvasRenderingContext2D, W: number, H: number) {
  const kx = W >= 768 ? W * 0.61 : W * 0.5;
  let g = c.createRadialGradient(kx, H * 0.48, 0, kx, H * 0.48, H * 0.6);
  g.addColorStop(0, 'rgba(3,5,26,0.85)');
  g.addColorStop(0.55, 'rgba(3,5,26,0.55)');
  g.addColorStop(1, 'rgba(3,5,26,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.78);
  g.addColorStop(0, 'rgba(2,3,15,0)');
  g.addColorStop(1, 'rgba(2,3,15,0.6)');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
}

// ---------- Farben mischen ----------
type RGB = [number, number, number];
const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
const mische = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t) as RGB;
const css = (c: RGB, a = 1) => `rgba(${c.map(Math.round).join(',')},${a})`;
const HIMMEL = {
  nacht: ['#040827', '#141a5a', '#3d2a78', '#7a4a8e'].map(hex),
  daemmerung: ['#2a2a70', '#8a4a96', '#ff7f6e', '#ffb45e'].map(hex),
  tag: ['#2f6fd0', '#5b98e6', '#9cc6f2', '#dcecfb'].map(hex),
};
const glatt = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Licht zu einer Tageszeit (Minuten): Sonnenhöhe, Tag-Anteil, Dämmerung, Bogenpositionen
function licht(min: number) {
  const { aufgang, untergang } = sonnenzeiten();
  const m = ((min % 1440) + 1440) % 1440;
  const tagLaenge = untergang - aufgang;
  let hoehe: number;
  let sonneT = -1;
  let mondT = -1;
  if (m >= aufgang && m <= untergang) {
    sonneT = (m - aufgang) / tagLaenge;
    hoehe = Math.sin(Math.PI * sonneT);
  } else {
    mondT = ((m - untergang + 1440) % 1440) / (1440 - tagLaenge);
    hoehe = -Math.sin(Math.PI * mondT);
  }
  // auch kurz vor Aufgang / nach Untergang noch Dämmerung
  const tag = glatt(-0.04, 0.28, hoehe);
  const daemmerung = Math.exp(-(((hoehe + 0.02) / 0.16) ** 2));
  return { hoehe, tag, daemmerung, sonneT, mondT };
}

function sprite(rgb: string, groesse = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = groesse;
  const k = c.getContext('2d')!;
  const g = k.createRadialGradient(groesse / 2, groesse / 2, 0, groesse / 2, groesse / 2, groesse / 2);
  g.addColorStop(0, `rgba(${rgb},1)`);
  g.addColorStop(0.35, `rgba(${rgb},0.55)`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  k.fillStyle = g;
  k.fillRect(0, 0, groesse, groesse);
  return c;
}

export default function Winter({ gedimmt, modus, schneefall }: { gedimmt: boolean; modus: Modus; schneefall: boolean }) {
  const winterRef = useRef<HTMLCanvasElement>(null);
  const schneeRef = useRef<HTMLCanvasElement>(null);
  const modusRef = useRef(modus);
  const schneefallRef = useRef(schneefall);
  const wechsel = useRef<(m: Modus) => void>(() => {});

  useEffect(() => {
    schneefallRef.current = schneefall;
  }, [schneefall]);
  useEffect(() => {
    if (modusRef.current === modus) return;
    modusRef.current = modus;
    wechsel.current(modus);
  }, [modus]);

  useEffect(() => {
    const winter = winterRef.current!;
    const schnee = schneeRef.current!;
    const wc = winter.getContext('2d')!;
    const sc = schnee.getContext('2d')!;
    const ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const flocke = sprite('255,255,255');
    const lichter = LAMPENFARBEN.map((f) => sprite(f));

    let W = 0;
    let H = 0;
    let dpr = 1;
    let birnen: Lampe[] = [];
    type Flocke = { x: number; y: number; z: number; phase: number; gross: boolean };
    let flocken: Flocke[] = [];
    const ebene = () => document.createElement('canvas');
    const ebenen = { sterne: ebene(), wolken: ebene(), nacht: ebene(), tag: ebene(), glut: ebene(), abschluss: ebene() };
    let zeit = zielMinuten(modusRef.current);
    let lichtStaerke = 1;

    // Szene zu einer Uhrzeit zeichnen (schnell: nur Himmel + vorgezeichnete Ebenen)
    function szene(min: number) {
      const l = licht(min);
      const horizont = H * 0.64;
      // Himmel: Nacht -> Tag, unten zusätzlich Dämmerung
      const stopps = HIMMEL.nacht.map((n, i) => {
        const basis = mische(n, HIMMEL.tag[i], l.tag);
        return mische(basis, HIMMEL.daemmerung[i], l.daemmerung * (0.45 + 0.18 * i));
      });
      const g = wc.createLinearGradient(0, 0, 0, horizont);
      stopps.forEach((c, i) => g.addColorStop([0, 0.45, 0.8, 1][i], css(c)));
      wc.fillStyle = g;
      wc.fillRect(0, 0, W, H);

      wc.globalAlpha = (1 - l.tag) * (1 - 0.6 * l.daemmerung);
      if (wc.globalAlpha > 0.01) wc.drawImage(ebenen.sterne, 0, 0, W, H);

      // Mond auf seinem Bogen (nachts)
      if (l.mondT >= 0) {
        const mx = W * (0.06 + 0.88 * l.mondT);
        const my = horizont - Math.sin(Math.PI * l.mondT) * H * 0.52 + H * 0.04;
        const mr = Math.max(14, 30 * (Math.min(W, H) / 800));
        wc.globalAlpha = 1 - l.tag;
        const hof = wc.createRadialGradient(mx, my, mr, mx, my, mr * 7);
        hof.addColorStop(0, 'rgba(200,215,255,0.32)');
        hof.addColorStop(1, 'rgba(200,215,255,0)');
        wc.fillStyle = hof;
        wc.fillRect(mx - mr * 7, my - mr * 7, mr * 14, mr * 14);
        wc.fillStyle = '#eef1ff';
        wc.beginPath();
        wc.arc(mx, my, mr, 0, Math.PI * 2);
        wc.fill();
        wc.fillStyle = 'rgba(170,182,225,0.35)';
        for (const [dx, dy, rr] of [[-0.3, -0.2, 0.22], [0.25, 0.15, 0.16], [-0.05, 0.4, 0.12]]) {
          wc.beginPath();
          wc.arc(mx + dx * mr, my + dy * mr, rr * mr, 0, Math.PI * 2);
          wc.fill();
        }
      }
      // Sonne auf ihrem Bogen (tagsüber), am Horizont orange
      if (l.sonneT >= 0) {
        const sx = W * (0.06 + 0.88 * l.sonneT);
        const sy = horizont - Math.sin(Math.PI * l.sonneT) * H * 0.52 + H * 0.04;
        const sr = Math.max(16, 34 * (Math.min(W, H) / 800));
        const warm = 1 - glatt(0.05, 0.4, l.hoehe);
        const kern = mische(hex('#fffbe8'), hex('#ffb35a'), warm);
        wc.globalAlpha = 1;
        const hof = wc.createRadialGradient(sx, sy, sr * 0.5, sx, sy, sr * 8);
        hof.addColorStop(0, css(kern, 0.55));
        hof.addColorStop(1, css(kern, 0));
        wc.fillStyle = hof;
        wc.fillRect(sx - sr * 8, sy - sr * 8, sr * 16, sr * 16);
        wc.fillStyle = css(kern);
        wc.beginPath();
        wc.arc(sx, sy, sr, 0, Math.PI * 2);
        wc.fill();
      }
      wc.globalAlpha = l.tag * 0.9;
      if (wc.globalAlpha > 0.01) wc.drawImage(ebenen.wolken, 0, 0, W, H);

      // Landschaft: Nacht-Palette, Tag-Palette darüber eingeblendet, Fenster nur nachts
      wc.globalAlpha = 1;
      wc.drawImage(ebenen.nacht, 0, 0, W, H);
      wc.globalAlpha = l.tag;
      if (l.tag > 0.01) wc.drawImage(ebenen.tag, 0, 0, W, H);
      wc.globalAlpha = 1 - glatt(0.1, 0.6, l.tag);
      if (wc.globalAlpha > 0.01) wc.drawImage(ebenen.glut, 0, 0, W, H);
      wc.globalAlpha = 1;
      wc.drawImage(ebenen.abschluss, 0, 0, W, H);

      lichtStaerke = 1 - 0.75 * l.tag; // Lichterketten tagsüber nur schwach
      document.documentElement.classList.toggle('hell', l.tag > 0.5);
      szenenzeit = ((min % 1440) + 1440) % 1440;
      dispatchEvent(new CustomEvent('szenenzeit', { detail: szenenzeit }));
    }

    function neu() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      // nie 0: ein Canvas mit Breite/Höhe 0 lässt drawImage abstürzen (z. B. versteckte App-Browser)
      W = Math.max(1, innerWidth);
      H = Math.max(1, innerHeight);
      for (const cv of [winter, schnee, ...Object.values(ebenen)]) {
        cv.width = Math.round(W * dpr);
        cv.height = Math.round(H * dpr);
      }
      wc.setTransform(dpr, 0, 0, dpr, 0, 0);
      sc.setTransform(dpr, 0, 0, dpr, 0, 0);
      const k = (cv: HTMLCanvasElement) => {
        const c = cv.getContext('2d')!;
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        return c;
      };
      sterne(k(ebenen.sterne), W, H);
      wolken(k(ebenen.wolken), W, H);
      landschaft(k(ebenen.nacht), W, H, NACHT, k(ebenen.glut));
      landschaft(k(ebenen.tag), W, H, TAG);
      abschluss(k(ebenen.abschluss), W, H);
      szene(zeit);
      birnen = lampen(W, H);
      const r = zufallsquelle(3);
      flocken = Array.from({ length: Math.min(170, Math.round((W * H) / 8500)) }, () => ({
        x: r() * W,
        y: r() * H,
        z: r(),
        phase: r() * 10,
        gross: r() < 0.07,
      }));
    }

    // Zeitraffer vorwärts zur Zielzeit (bei reduzierter Bewegung direkt springen)
    let raffer: { start: number; diff: number; t0: number; dauer: number } | null = null;
    wechsel.current = (m: Modus) => {
      const ziel = zielMinuten(m);
      const diff = (((ziel - zeit) % 1440) + 1440) % 1440;
      if (ruhig || diff < 1) {
        zeit = ziel;
        szene(zeit);
        if (ruhig) zeichneSchnee(0, 0);
        return;
      }
      raffer = { start: zeit, diff, t0: performance.now(), dauer: 1200 + (diff / 1440) * 2300 };
    };

    function zeichneSchnee(t: number, dt: number) {
      sc.clearRect(0, 0, W, H);
      if (!ruhig && schneefallRef.current) {
        for (const f of flocken) {
          const groesse = f.gross ? 12 + f.z * 10 : 1.5 + f.z * 4;
          f.y += (f.gross ? 28 : 14 + f.z * 40) * dt;
          f.x += Math.sin(t * 0.8 + f.phase) * (6 + f.z * 12) * dt;
          if (f.y > H + 20) {
            f.y = -20;
            f.x = Math.random() * W;
          }
          sc.globalAlpha = f.gross ? 0.18 : 0.3 + f.z * 0.6;
          sc.drawImage(flocke, f.x - groesse / 2, f.y - groesse / 2, groesse, groesse);
        }
      }
      sc.globalCompositeOperation = 'lighter';
      for (const b of birnen) {
        const flackern = ruhig ? 0.9 : 0.78 + 0.22 * Math.sin(t * (2.2 + b.phase * 0.3) + b.phase) * Math.sin(t * 7.1 + b.phase * 3);
        sc.globalAlpha = 0.55 * flackern * lichtStaerke;
        sc.drawImage(lichter[b.farbe], b.x - 13, b.y - 13, 26, 26);
        sc.globalAlpha = flackern * (0.35 + 0.65 * lichtStaerke);
        sc.drawImage(lichter[b.farbe], b.x - 3.5, b.y - 3.5, 7, 7);
      }
      sc.globalCompositeOperation = 'source-over';
      sc.globalAlpha = 1;
    }

    let bild = 0;
    let letzte = 0;
    function schleife(jetzt: number) {
      const dt = letzte ? Math.min(0.05, (jetzt - letzte) / 1000) : 0.016;
      letzte = jetzt;
      if (raffer) {
        const t = Math.min(1, (jetzt - raffer.t0) / raffer.dauer);
        const e = t < 0.5 ? 2 * t * t : 1 - (2 - 2 * t) ** 2 / 2;
        zeit = raffer.start + raffer.diff * e;
        szene(zeit);
        if (t >= 1) {
          zeit = zielMinuten(modusRef.current);
          raffer = null;
        }
      }
      zeichneSchnee(jetzt / 1000, dt);
      bild = requestAnimationFrame(schleife);
    }
    function starten() {
      cancelAnimationFrame(bild);
      letzte = 0;
      if (ruhig) return zeichneSchnee(0, 0);
      if (!document.hidden) bild = requestAnimationFrame(schleife);
    }

    // Automatisch: der echten Uhrzeit folgen
    const uhr = window.setInterval(() => {
      if (modusRef.current !== 'auto' || raffer) return;
      zeit = zielMinuten('auto');
      szene(zeit);
    }, 15_000);

    let warte = 0;
    const beiGroesse = () => {
      clearTimeout(warte);
      warte = window.setTimeout(() => {
        neu();
        if (ruhig) zeichneSchnee(0, 0);
      }, 150);
    };
    neu();
    starten();
    addEventListener('resize', beiGroesse);
    document.addEventListener('visibilitychange', starten);
    return () => {
      cancelAnimationFrame(bild);
      clearTimeout(warte);
      clearInterval(uhr);
      wechsel.current = () => {};
      removeEventListener('resize', beiGroesse);
      document.removeEventListener('visibilitychange', starten);
      document.documentElement.classList.remove('hell');
    };
  }, []);

  return (
    <>
      <canvas ref={winterRef} className={`winter${gedimmt ? ' gedimmt' : ''}`} aria-hidden="true" />
      <canvas ref={schneeRef} className="schnee" aria-hidden="true" />
    </>
  );
}
