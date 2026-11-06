'use client';

import { useEffect, useRef, useState } from 'react';

// Frost-Effekt beim Wechsel auf "Start": Der Bildschirm friert in ca. 1,7 s von den Rändern her zu,
// mit 3 Klicks (oder Enter/Leertaste) bricht das Eis auf. Esc überspringt. Alles Canvas 2D, eigener Code.

const WACHSEN = 1.7; // Sekunden
const TEXTE = [
  'Das Eis ist zugefroren – klicke 3× darauf, um es aufzubrechen',
  'Es knackt … noch 2×',
  'Fast geschafft … noch 1×',
];

type P = [number, number];
type Dreieck = { p: [P, P, P]; c: P; los: boolean };
type Stueck = { bild: HTMLCanvasElement; x: number; y: number; vx: number; vy: number; rot: number; vrot: number; tum: number; alter: number };
type Riss = { punkte: P[]; laengen: number[]; gesamt: number; gezeichnet: number; start: number; dauer: number };

const glatt = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const zufall = (a: number, b: number) => a + Math.random() * (b - a);

// ---------- Eis-Textur: Milchglas, Körnung, Bokeh, Farn-Kristalle, Eissterne, Leuchtrand ----------
function eisMalen(W: number, H: number, dpr: number) {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const k = c.getContext('2d')!;
  const w = W / dpr;
  const h = H / dpr;
  const diag = Math.hypot(w, h);
  k.scale(dpr, dpr);
  const randAbstand = (x: number, y: number) => Math.min(x, w - x, y, h - y) / (Math.min(w, h) / 2); // 0 Rand … 1 Mitte

  const g = k.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, diag / 2);
  g.addColorStop(0, 'rgba(140,190,232,.5)');
  g.addColorStop(1, 'rgba(236,247,255,.94)');
  k.fillStyle = g;
  k.fillRect(0, 0, w, h);

  // Körnung, zum Rand dichter
  for (let i = 0, n = 0; n < 12000 && i < 60000; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    if (Math.random() < randAbstand(x, y) * 0.85) continue;
    k.fillStyle = `rgba(255,255,255,${zufall(0.2, 0.6).toFixed(2)})`;
    const s = zufall(0.6, 1.6);
    k.fillRect(x, y, s, s);
    n++;
  }
  // weiche Bokeh-Punkte
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = zufall(4, 22);
    const b = k.createRadialGradient(x, y, 0, x, y, r);
    b.addColorStop(0, 'rgba(255,255,255,.22)');
    b.addColorStop(1, 'rgba(255,255,255,0)');
    k.fillStyle = b;
    k.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Farn-Kristalle: leicht gebogene Äste, rekursiv, nach Feinheit in 4 Pfaden gesammelt
  const pfade = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
  const farn = (x: number, y: number, winkel: number, laenge: number, tiefe: number, stamm: number) => {
    const ex = x + Math.cos(winkel) * laenge;
    const ey = y + Math.sin(winkel) * laenge;
    const bieg = zufall(-0.15, 0.15) * laenge;
    const kx = (x + ex) / 2 - Math.sin(winkel) * bieg;
    const ky = (y + ey) / 2 + Math.cos(winkel) * bieg;
    const pf = pfade[Math.min(tiefe, 3)];
    pf.moveTo(x, y);
    pf.quadraticCurveTo(kx, ky, ex, ey);
    if (tiefe >= 5 || laenge < 6) return;
    const seiten = tiefe === 0 ? 3 + Math.floor(Math.random() * 4) : 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < seiten; i++) {
      const t = (i + 0.6) / (seiten + 0.4);
      const px = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * kx + t * t * ex;
      const py = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * ky + t * t * ey;
      const seite = i % 2 ? 1 : -1;
      farn(px, py, winkel + seite * 0.95 + zufall(-0.12, 0.12), laenge * 0.45 * (1 - t * 0.5), tiefe + 1, 0);
    }
    if (stamm > 0) farn(ex, ey, winkel + zufall(-0.3, 0.3), laenge * 0.72, tiefe, stamm - 1);
  };
  const starts = Math.round(diag / 9);
  for (let i = 0; i < starts; i++) {
    const kante = Math.floor(Math.random() * 4);
    const u = Math.random();
    const [x, y, innen] =
      kante === 0 ? [u * w, 0, Math.PI / 2] : kante === 1 ? [u * w, h, -Math.PI / 2] : kante === 2 ? [0, u * h, 0] : [w, u * h, Math.PI];
    farn(x, y, innen + zufall(-0.6, 0.6), diag * zufall(0.025, 0.06), 0, 2);
  }
  const breiten = [2.2, 1.3, 0.8, 0.5];
  const deck = [0.55, 0.45, 0.38, 0.3];
  k.lineCap = 'round';
  pfade.forEach((pf, i) => {
    k.strokeStyle = `rgba(255,255,255,${deck[i]})`;
    k.lineWidth = breiten[i];
    k.shadowColor = 'rgba(255,255,255,.9)';
    k.shadowBlur = i === 0 ? 5 : 0;
    k.stroke(pf);
  });
  k.shadowBlur = 0;

  // sechsarmige Eissterne, meist nahe am Rand
  k.strokeStyle = 'rgba(255,255,255,.7)';
  for (let i = 0; i < 46; i++) {
    let x = 0;
    let y = 0;
    do {
      x = Math.random() * w;
      y = Math.random() * h;
    } while (randAbstand(x, y) > 0.45 && Math.random() < 0.85);
    const r = zufall(5, 16);
    const dreh = Math.random() * Math.PI;
    k.lineWidth = zufall(0.7, 1.3);
    k.beginPath();
    for (let a = 0; a < 6; a++) {
      const wa = dreh + (a * Math.PI) / 3;
      const cx = Math.cos(wa);
      const sy = Math.sin(wa);
      k.moveTo(x, y);
      k.lineTo(x + cx * r, y + sy * r);
      // kleine Seitenzacken
      const mx = x + cx * r * 0.55;
      const my = y + sy * r * 0.55;
      for (const s of [-1, 1]) {
        k.moveTo(mx, my);
        k.lineTo(mx + Math.cos(wa + s * 0.8) * r * 0.3, my + Math.sin(wa + s * 0.8) * r * 0.3);
      }
    }
    k.stroke();
  }

  // heller Leuchtrand
  const rand = k.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, diag / 2);
  rand.addColorStop(0, 'rgba(255,255,255,0)');
  rand.addColorStop(1, 'rgba(255,255,255,.35)');
  k.fillStyle = rand;
  k.fillRect(0, 0, w, h);
  k.setTransform(1, 0, 0, 1, 0, 0); // danach wird in Gerätepixeln gezeichnet (Risse, Löcher)
  return c;
}

// Risslinie: vom Klickpunkt aus, leicht geknickt
function riss(x: number, y: number, winkel: number, laenge: number, start: number): Riss {
  const punkte: P[] = [[x, y]];
  const schritte = 8;
  let a = winkel;
  for (let i = 1; i <= schritte; i++) {
    a += zufall(-0.35, 0.35);
    const [px, py] = punkte[i - 1];
    punkte.push([px + Math.cos(a) * (laenge / schritte), py + Math.sin(a) * (laenge / schritte)]);
  }
  const laengen = [0];
  for (let i = 1; i < punkte.length; i++) laengen.push(laengen[i - 1] + Math.hypot(punkte[i][0] - punkte[i - 1][0], punkte[i][1] - punkte[i - 1][1]));
  return { punkte, laengen, gesamt: laengen.at(-1)!, gezeichnet: 0, start, dauer: zufall(0.25, 0.45) };
}

export default function Frost({ onEnde }: { onEnde: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stufe, setStufe] = useState(-1); // -1 = wächst noch, 0..2 = Klicks, 3 = zerbricht
  const klick = useRef<(x?: number, y?: number) => void>(() => {});
  const ende = useRef(onEnde);
  ende.current = onEnde;

  useEffect(() => {
    const cv = canvasRef.current!;
    const html = document.documentElement;
    if (!innerWidth || !innerHeight) {
      ende.current(); // Fenster ohne Größe (z. B. ausgeblendet): kein Effekt
      return;
    }
    html.dataset.frost = 'an';
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const W = Math.max(1, Math.round(innerWidth * dpr));
    const H = Math.max(1, Math.round(innerHeight * dpr));
    cv.width = W;
    cv.height = H;
    const k = cv.getContext('2d')!;
    const eis = eisMalen(W, H, dpr); // wird zur Eisschicht (Risse und Löcher kommen hinein)
    const ek = eis.getContext('2d')!;
    const diag = Math.hypot(W, H);

    // Wachstums-Maske: 64 px breit, Randabstand plus Rauschen
    const MW = 64;
    const MH = Math.max(2, Math.round((64 * H) / W));
    const maske = document.createElement('canvas');
    maske.width = MW;
    maske.height = MH;
    const mk = maske.getContext('2d')!;
    const mBild = mk.createImageData(MW, MH);
    const rauschen = Array.from({ length: MW * MH }, () => Math.random());

    // Bruch-Gitter: verschobene Eckpunkte (Rand fest), jede Zelle in 2 Dreiecke
    const SP = 12; // ca. 150 Dreiecke (vorher 24 Spalten = ca. 600, das ruckelte)
    const ZE = Math.max(2, Math.round((SP * H) / W));
    const ecke: P[][] = [];
    for (let j = 0; j <= ZE; j++) {
      ecke.push([]);
      for (let i = 0; i <= SP; i++) {
        const rand = i === 0 || j === 0 || i === SP || j === ZE;
        const x = (i / SP) * W + (rand ? 0 : zufall(-0.35, 0.35) * (W / SP));
        const y = (j / ZE) * H + (rand ? 0 : zufall(-0.35, 0.35) * (H / ZE));
        ecke[j].push([x, y]);
      }
    }
    const dreiecke: Dreieck[] = [];
    const neu = (a: P, b: P, c: P): Dreieck => ({ p: [a, b, c], c: [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3], los: false });
    for (let j = 0; j < ZE; j++)
      for (let i = 0; i < SP; i++) {
        const [a, b, c, d] = [ecke[j][i], ecke[j][i + 1], ecke[j + 1][i + 1], ecke[j + 1][i]];
        if ((i + j) % 2) dreiecke.push(neu(a, b, c), neu(a, c, d));
        else dreiecke.push(neu(a, b, d), neu(b, c, d));
      }

    let start = performance.now() / 1000;
    let jetzt = start;
    let gewachsen = false;
    let klicks = 0;
    let wackeln = 0;
    let wellenEnde = Infinity;
    const risse: Riss[] = [];
    const warteschlange: { d: Dreieck; zeit: number; von: P }[] = [];
    const stuecke: Stueck[] = [];

    const dreieckPfad = (ctx: CanvasRenderingContext2D, d: Dreieck, dx = 0, dy = 0) => {
      ctx.beginPath();
      ctx.moveTo(d.p[0][0] - dx, d.p[0][1] - dy);
      ctx.lineTo(d.p[1][0] - dx, d.p[1][1] - dy);
      ctx.lineTo(d.p[2][0] - dx, d.p[2][1] - dy);
      ctx.closePath();
    };
    // Dreieck als Sprite mit heller Bruchkante kopieren, dann aus der Eisschicht stanzen
    const loesen = (d: Dreieck, von: P) => {
      if (d.los) return;
      d.los = true;
      const xs = d.p.map((p) => p[0]);
      const ys = d.p.map((p) => p[1]);
      const x0 = Math.floor(Math.min(...xs)) - 2;
      const y0 = Math.floor(Math.min(...ys)) - 2;
      const bw = Math.ceil(Math.max(...xs)) + 2 - x0;
      const bh = Math.ceil(Math.max(...ys)) + 2 - y0;
      const bild = document.createElement('canvas');
      bild.width = Math.max(1, bw);
      bild.height = Math.max(1, bh);
      const bk = bild.getContext('2d')!;
      dreieckPfad(bk, d, x0, y0);
      bk.save();
      bk.clip();
      bk.drawImage(eis, -x0, -y0);
      bk.restore();
      bk.strokeStyle = 'rgba(255,255,255,.75)';
      bk.lineWidth = 1.5 * dpr;
      bk.stroke();
      ek.save();
      ek.globalCompositeOperation = 'destination-out';
      ek.fillStyle = ek.strokeStyle = '#000'; // volle Deckkraft: ganz ausstanzen
      dreieckPfad(ek, d);
      ek.fill();
      ek.lineWidth = 1;
      ek.stroke();
      ek.restore();
      const rx = d.c[0] - von[0];
      const ry = d.c[1] - von[1];
      const l = Math.hypot(rx, ry) || 1;
      const schub = zufall(60, 200) * dpr;
      stuecke.push({
        bild,
        x: x0 + bw / 2,
        y: y0 + bh / 2,
        vx: (rx / l) * schub,
        vy: (ry / l) * schub * 0.5 - zufall(40, 140) * dpr,
        rot: 0,
        vrot: zufall(-3, 3),
        tum: zufall(2, 6),
        alter: 0,
      });
    };

    klick.current = (x = W / 2, y = H / 2) => {
      if (!gewachsen || klicks >= 3) return;
      klicks++;
      setStufe(klicks);
      const p: P = [x, y];
      const t = jetzt;
      if (klicks < 3) {
        const n = klicks === 1 ? 9 : 14;
        for (let i = 0; i < n; i++) risse.push(riss(x, y, (i / n) * Math.PI * 2 + zufall(-0.25, 0.25), diag * zufall(0.12, klicks === 1 ? 0.3 : 0.45), t));
        const radius = diag * (klicks === 1 ? 0.07 : 0.2);
        for (const d of dreiecke) {
          const ab = Math.hypot(d.c[0] - x, d.c[1] - y);
          if (!d.los && ab < radius) warteschlange.push({ d, zeit: t + zufall(0.05, 0.22) + (ab / diag) * 0.5, von: p });
        }
        wackeln = (klicks === 1 ? 7 : 13) * dpr;
      } else {
        let spaet = t;
        for (const d of dreiecke) {
          if (d.los) continue;
          const zeit = t + 0.12 + (Math.hypot(d.c[0] - x, d.c[1] - y) / diag) * 0.9;
          spaet = Math.max(spaet, zeit);
          warteschlange.push({ d, zeit, von: p });
        }
        wellenEnde = spaet;
        wackeln = 16 * dpr;
      }
      warteschlange.sort((a, b) => a.zeit - b.zeit);
    };

    // Riss-Stück von Länge a bis b in die Eisschicht zeichnen (source-atop: nicht in Löcher)
    const rissZeichnen = (r: Riss, a: number, b: number) => {
      const pfad = new Path2D();
      let erster = true;
      for (let i = 1; i < r.punkte.length; i++) {
        const l0 = r.laengen[i - 1];
        const l1 = r.laengen[i];
        if (l1 < a || l0 > b) continue;
        const [x0, y0] = r.punkte[i - 1];
        const [x1, y1] = r.punkte[i];
        const t0 = Math.max(0, (a - l0) / (l1 - l0 || 1));
        const t1 = Math.min(1, (b - l0) / (l1 - l0 || 1));
        const p0: P = [x0 + (x1 - x0) * t0, y0 + (y1 - y0) * t0];
        if (erster) pfad.moveTo(...p0);
        erster = false;
        pfad.lineTo(x0 + (x1 - x0) * t1, y0 + (y1 - y0) * t1);
      }
      ek.save();
      ek.globalCompositeOperation = 'source-atop';
      ek.lineCap = 'round';
      ek.lineJoin = 'round';
      ek.strokeStyle = 'rgba(25,55,85,.6)';
      ek.lineWidth = 1.6 * dpr;
      ek.stroke(pfad);
      ek.translate(dpr, dpr);
      ek.strokeStyle = 'rgba(255,255,255,.85)';
      ek.lineWidth = 0.8 * dpr;
      ek.stroke(pfad);
      ek.restore();
    };

    let rahmen = 0;
    let vorher = 0;
    let beendet = false;
    const fertig = () => {
      if (beendet) return;
      beendet = true;
      ende.current();
    };
    function schleife(ms: number) {
      jetzt = ms / 1000;
      if (!vorher) start = jetzt;
      const dt = vorher ? Math.min(0.05, jetzt - vorher) : 0;
      vorher = jetzt;
      k.setTransform(1, 0, 0, 1, 0, 0);
      k.clearRect(0, 0, W, H);

      if (!gewachsen) {
        // Zeit echt messen, damit es auf langsamen Geräten nicht ewig dauert
        const e = (jetzt - start) / WACHSEN;
        for (let j = 0; j < MH; j++)
          for (let i = 0; i < MW; i++) {
            const d = Math.min(i / (MW - 1), 1 - i / (MW - 1), j / (MH - 1), 1 - j / (MH - 1)) * 2;
            const a = Math.min(1, Math.max(0, (e * 1.45 - d - rauschen[j * MW + i] * 0.3) / 0.15));
            mBild.data.set([255, 255, 255, a * 255], (j * MW + i) * 4);
          }
        mk.putImageData(mBild, 0, 0);
        k.drawImage(eis, 0, 0);
        k.globalCompositeOperation = 'destination-in';
        k.imageSmoothingEnabled = true;
        k.drawImage(maske, 0, 0, W, H);
        k.globalCompositeOperation = 'source-over';
        if (e >= 1) {
          gewachsen = true;
          setStufe(0);
        }
        rahmen = requestAnimationFrame(schleife);
        return;
      }

      // Risse wachsen sichtbar
      for (const r of risse) {
        const ziel = r.gesamt * glatt(0, 1, (jetzt - r.start) / r.dauer);
        if (ziel > r.gezeichnet) {
          rissZeichnen(r, r.gezeichnet, ziel);
          r.gezeichnet = ziel;
        }
      }
      // höchstens 30 Dreiecke pro Bild lösen
      let n = 0;
      while (warteschlange.length && warteschlange[0].zeit <= jetzt && n < 30) {
        const w = warteschlange.shift()!;
        loesen(w.d, w.von);
        n++;
      }

      wackeln *= Math.exp(-5 * dt);
      k.translate(Math.sin(jetzt * 55) * wackeln, Math.cos(jetzt * 47) * wackeln);
      k.drawImage(eis, 0, 0);
      for (let i = stuecke.length - 1; i >= 0; i--) {
        const s = stuecke[i];
        s.alter += dt;
        s.vy += 1000 * dpr * glatt(0, 0.45, s.alter) * dt; // Schwerkraft setzt weich ein
        s.vx *= Math.exp(-1.2 * dt);
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.rot += s.vrot * dt;
        const alpha = 1 - glatt(0.6, 1.4, s.alter);
        if (alpha <= 0 || s.y - s.bild.height > H) {
          stuecke.splice(i, 1);
          continue;
        }
        k.save();
        k.globalAlpha = alpha;
        k.translate(s.x, s.y);
        k.rotate(s.rot);
        k.scale(1, Math.max(0.3, Math.abs(Math.cos(s.alter * s.tum))));
        k.drawImage(s.bild, -s.bild.width / 2, -s.bild.height / 2);
        k.restore();
      }

      if (klicks === 3 && ((!warteschlange.length && !stuecke.length) || jetzt > wellenEnde + 2.5)) {
        fertig();
        return;
      }
      rahmen = requestAnimationFrame(schleife);
    }
    rahmen = requestAnimationFrame(schleife);

    const taste = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return fertig();
      if ((e.target as HTMLElement)?.closest?.('input, select, textarea, button, a')) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        klick.current();
      }
    };
    addEventListener('keydown', taste);

    return () => {
      cancelAnimationFrame(rahmen);
      removeEventListener('keydown', taste);
      klick.current = () => {};
      delete html.dataset.frost;
    };
  }, []);

  const dpr = () => Math.min(devicePixelRatio || 1, 2);
  return (
    <>
      <canvas
        ref={canvasRef}
        className="frost"
        aria-hidden="true"
        onPointerDown={(e) => klick.current(e.clientX * dpr(), e.clientY * dpr())}
      />
      {stufe >= 0 && stufe < 3 && (
        <div className="frost-hinweis" role="status">
          <span>{TEXTE[stufe]}</span>
          <span className="frost-punkte" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <i key={i} className={i < stufe ? 'voll' : ''} />
            ))}
          </span>
        </div>
      )}
    </>
  );
}
