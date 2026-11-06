'use client';

import { useEffect, useRef, useState } from 'react';

// Klassenname als verschneite Bubble-Schrift (WebGL2), Stil "Winter is Coming".
// Ablauf: Buchstaben als dicke runde Linien -> rund gemachte Maske -> exakte Distanzkarte (Abstand zum Rand)
// -> Shader baut daraus einen runden Wulst mit körniger Schneeoberfläche, Eiskristallen, Glow und Schatten.
// Beim Drüberfahren bricht Schnee ab: Klumpen fallen, bilden unten einen Haufen, die Buchstaben bekommen
// körnige Lücken und schneien danach langsam wieder zu (Abtrag-Karte + 2D-Partikel).
// Ohne WebGL2 bleibt eine weiße CSS-Schrift mit blauem Schatten sichtbar.

const BW = 1200;
const BH = 400;
const AW = 300; // Abtrag-Karte (0 = intakt, 1 = weggebrochen)
const AH = 100;

const VS = `#version 300 es
in vec2 p; out vec2 uv;
void main(){ uv = p*0.5+0.5; uv.y = 1.0-uv.y; gl_Position = vec4(p,0.,1.); }`;

const FS = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D uTex;      // R = Maske, G = Abstand zum Rand (Pixel), B = weiche Maske (Schatten/Glow)
uniform sampler2D uAbtrag;   // R = Abtrag (0 = intakt, 1 = weggebrochen)
uniform float uTime;
const float PX = 1.0/${BW}.0;
const float PY = 1.0/${BH}.0;

vec4 S(vec2 q){ return texture(uTex, q); }
float A(vec2 q){ return texture(uAbtrag, q).r; }
// Abstand zum Rand, eingesackt wo Schnee abgebrochen ist
float D(vec2 q){ return S(q).g - A(q) * 20.0; }

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float rausch(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}

void main(){
  vec2 q = uv;
  vec4 c = S(q);
  float ab = A(q);
  vec2 px = q * vec2(${BW}.0, ${BH}.0);
  // körnige Schwelle: Schnee bröckelt statt glatt zu verschwinden
  float schwelle = 0.2 + 0.6 * rausch(px * 0.3) + 0.2 * rausch(px * 1.1);
  float a = clamp(c.r - ab * 0.6, 0.0, 1.0) * (1.0 - smoothstep(schwelle - 0.05, schwelle + 0.05, ab));
  float d = max(c.g - ab * 20.0, 0.0);

  // Richtung vom Rand nach innen
  vec2 gd = 0.5 * vec2(D(q+vec2(PX,0.)) - D(q-vec2(PX,0.)),
                       D(q+vec2(0.,PY)) - D(q-vec2(0.,PY)));
  vec2 dir = gd / max(length(gd), 1e-4);

  // dicker Wulst: kreisrunder Querschnitt (Radius R), innen flaches Polster
  const float R = 30.0;
  float t = clamp(d, 0.0, R);
  float slope = min((R - t) / sqrt(max(R*R - (R-t)*(R-t), 9.0)), 4.0) * (1.0 - smoothstep(R*0.9, R, d));
  slope += 0.12 * (1.0 - smoothstep(R, R*2.4, d)) * smoothstep(R*0.85, R, d);
  vec3 n = normalize(vec3(-dir.x*slope, dir.y*slope, 1.0));

  // körnige Schneeoberfläche: Value-Noise stört die Normale
  vec2 korn = vec2(rausch(px*0.45), rausch(px*0.45 + 17.3)) + 0.5*vec2(rausch(px*1.3 + 5.1), rausch(px*1.3 + 9.7));
  n = normalize(n + vec3((korn - 0.75) * 0.42, 0.0));

  // Licht von links oben, Verlauf kühles Blau (Schatten) -> Weiß
  vec3 L = normalize(vec3(-0.55, 0.6, 0.6));
  float diff = dot(n, L) * 0.5 + 0.5;
  vec3 col = mix(vec3(0.36, 0.5, 0.86), vec3(0.98, 0.99, 1.0), smoothstep(0.28, 0.85, diff));
  col += vec3(0.85, 0.92, 1.0) * pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 20.0) * 0.3;
  // Kanten leicht bläulich
  col = mix(col, vec3(0.58, 0.72, 1.0), (1.0 - smoothstep(1.5, 9.0, d)) * 0.55);

  // funkelnde Eiskristalle
  vec2 zelle = floor(px / 3.0);
  float hz = hash(zelle);
  if (hz > 0.982) {
    float f = pow(max(0.0, sin(uTime * 2.4 + hz * 90.0)), 14.0);
    col += vec3(0.85, 0.95, 1.0) * f * smoothstep(0.45, 0.8, diff) * 1.5;
  }

  // Außen: kalter Glow und blauer Schlagschatten
  float glow = S(q).b * (1.0 - a) * (1.0 - ab);
  float sch = S(q + vec2(-0.004, -0.02)).b * (1.0 - a);
  vec3 aussen = vec3(0.55, 0.75, 1.0) * glow * 0.35 * (1.0 - 0.7*sch) + vec3(0.03, 0.08, 0.32) * sch * 0.55;
  float aA = max(glow * 0.3, sch * 0.55);
  o = vec4(col*a + aussen*(1.0-a), a + aA*(1.0-a));
}`;

// Selbst gezeichnete Bubble-Buchstaben: Mittellinien in einem Kästchen der Höhe 1 (y nach unten)
const GLYPHEN: Record<string, { breite: number; pfad: (p: Path2D) => void }> = {
  B: {
    breite: 0.66,
    pfad: (p) => {
      p.moveTo(0, 1);
      p.lineTo(0, 0);
      p.lineTo(0.36, 0);
      p.arc(0.36, 0.245, 0.245, -Math.PI / 2, Math.PI / 2);
      p.lineTo(0, 0.49);
      p.moveTo(0, 0.49);
      p.lineTo(0.41, 0.49);
      p.arc(0.41, 0.745, 0.255, -Math.PI / 2, Math.PI / 2);
      p.lineTo(0, 1);
    },
  },
  M: {
    breite: 0.8,
    pfad: (p) => {
      p.moveTo(0, 1);
      p.lineTo(0, 0);
      p.lineTo(0.4, 0.62);
      p.lineTo(0.8, 0);
      p.lineTo(0.8, 1);
    },
  },
  '2': {
    breite: 0.62,
    pfad: (p) => {
      p.moveTo(0, 0.3);
      p.arc(0.3, 0.3, 0.3, Math.PI, Math.PI * 2.2);
      p.lineTo(0, 1);
      p.lineTo(0.62, 1);
    },
  },
  '5': {
    breite: 0.62,
    pfad: (p) => {
      p.moveTo(0.6, 0);
      p.lineTo(0.06, 0);
      p.lineTo(0.03, 0.45);
      p.arc(0.3, 0.69, 0.31, 1.23 * Math.PI, 2.78 * Math.PI);
    },
  },
};
const KIPPEN = [-0.07, 0.05, -0.04, 0.07];
const VERSATZ = [0.03, -0.04, 0.02, -0.03];

// Zeichnet den Text weiß auf schwarz und gibt die Schriftgröße (Buchstabenhöhe) zurück.
function textZeichnen(x: CanvasRenderingContext2D, text: string): number {
  const zeichen = [...text];
  x.strokeStyle = x.fillStyle = '#fff';
  x.lineJoin = 'round';
  x.lineCap = 'round';

  if (zeichen.every((z) => GLYPHEN[z])) {
    // dicke, runde Linien (Strichstärke 0.26 der Buchstabenhöhe), pro Buchstabe gekippt und versetzt
    const STRICH = 0.26;
    const summe = zeichen.reduce((s, z) => s + GLYPHEN[z].breite, 0);
    const luecke = STRICH + 0.2; // Abstand in Buchstabenhöhen (inkl. Strichstärke)
    const roh = summe + luecke * (zeichen.length - 1) + STRICH;
    const h = Math.min((BW * 0.82) / roh, (BH * 0.62) / (1 + STRICH));
    let pos = (BW - roh * h) / 2 + (STRICH / 2) * h;
    zeichen.forEach((z, i) => {
      const g = GLYPHEN[z];
      const pfad = new Path2D();
      g.pfad(pfad);
      x.save();
      x.translate(pos + (g.breite * h) / 2, BH / 2 + VERSATZ[i % 4] * h);
      x.rotate(KIPPEN[i % 4]);
      x.translate((-g.breite * h) / 2, -h / 2);
      x.scale(h, h);
      x.lineWidth = STRICH;
      x.stroke(pfad);
      x.restore();
      pos += (g.breite + luecke) * h;
    });
    return h;
  }

  // andere Klassennamen: schwerste runde Schrift, leicht mit Kontur verdickt
  const nunito = getComputedStyle(document.documentElement).getPropertyValue('--font-rund').trim();
  const fam = `"Arial Rounded MT Bold",${nunito ? nunito + ',' : ''}"Varela Round",system-ui,sans-serif`;
  let fs = 260;
  x.font = `900 ${fs}px ${fam}`;
  fs = Math.min(260, (fs * (BW * 0.72)) / x.measureText(text).width);
  x.font = `900 ${fs}px ${fam}`;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.lineWidth = fs * 0.04;
  x.strokeText(text, BW / 2, BH * 0.5);
  x.fillText(text, BW / 2, BH * 0.5);
  return fs;
}

// Box-Blur (waagerecht + senkrecht) mit gleitender Summe
function blur(eingang: Float32Array, r: number, durchgaenge: number): Float32Array {
  const b = new Float32Array(BW * BH);
  const a = Float32Array.from(eingang);
  for (let pass = 0; pass < durchgaenge; pass++) {
    for (let y = 0; y < BH; y++) {
      let sum = 0;
      const o = y * BW;
      for (let k = -r; k <= r; k++) sum += a[o + Math.min(BW - 1, Math.max(0, k))];
      for (let x = 0; x < BW; x++) {
        b[o + x] = sum / (2 * r + 1);
        sum += a[o + Math.min(BW - 1, x + r + 1)] - a[o + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < BW; x++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += b[Math.min(BH - 1, Math.max(0, k)) * BW + x];
      for (let y = 0; y < BH; y++) {
        a[y * BW + x] = sum / (2 * r + 1);
        sum += b[Math.min(BH - 1, y + r + 1) * BW + x] - b[Math.max(0, y - r) * BW + x];
      }
    }
  }
  return a;
}

// exakte euklidische Distanztransformation (Felzenszwalb): Abstand jedes Innenpixels zum Rand
function abstand(innen: Uint8Array): Float32Array {
  const INF = 1e20;
  const m = Math.max(BW, BH);
  const g = new Float64Array(BW * BH);
  for (let i = 0; i < g.length; i++) g[i] = innen[i] ? INF : 0;
  const f = new Float64Array(m);
  const dd = new Float64Array(m);
  const v = new Int32Array(m);
  const z = new Float64Array(m + 1);
  function eindim(n: number) {
    let k = 0;
    v[0] = 0;
    z[0] = -INF;
    z[1] = INF;
    for (let q = 1; q < n; q++) {
      let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) {
        k--;
        s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      }
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < n; q++) {
      while (z[k + 1] < q) k++;
      const dx = q - v[k];
      dd[q] = dx * dx + f[v[k]];
    }
  }
  for (let x = 0; x < BW; x++) {
    for (let y = 0; y < BH; y++) f[y] = g[y * BW + x];
    eindim(BH);
    for (let y = 0; y < BH; y++) g[y * BW + x] = dd[y];
  }
  for (let y = 0; y < BH; y++) {
    for (let x = 0; x < BW; x++) f[x] = g[y * BW + x];
    eindim(BW);
    for (let x = 0; x < BW; x++) g[y * BW + x] = dd[x];
  }
  const d = new Float32Array(BW * BH);
  for (let i = 0; i < d.length; i++) d[i] = Math.sqrt(g[i]);
  return d;
}

// Text -> Maske (R), Abstand zum Rand (G), weiche Maske (B)
function maskeBauen(text: string): { daten: Float32Array; maske: Float32Array } {
  const c = document.createElement('canvas');
  c.width = BW;
  c.height = BH;
  const x = c.getContext('2d', { willReadFrequently: true })!;
  x.fillStyle = '#000';
  x.fillRect(0, 0, BW, BH);
  const fs = textZeichnen(x, text);

  const px = x.getImageData(0, 0, BW, BH).data;
  const roh = new Float32Array(BW * BH);
  for (let i = 0; i < roh.length; i++) roh[i] = px[i * 4] / 255;
  // abrunden: weichzeichnen (3 Durchgänge, Radius ≈ 3 % der Schriftgröße) und wieder schwellen
  const w = blur(roh, Math.max(3, Math.round(fs * 0.03)), 3);
  const maske = new Float32Array(BW * BH);
  const innen = new Uint8Array(BW * BH);
  for (let i = 0; i < w.length; i++) {
    const t = Math.min(1, Math.max(0, (w[i] - 0.44) / 0.12));
    maske[i] = t * t * (3 - 2 * t);
    innen[i] = maske[i] > 0.5 ? 1 : 0;
  }
  const dist = blur(abstand(innen), 2, 2); // Treppen im Abstand glätten
  const weich = blur(maske, 14, 2);
  const daten = new Float32Array(BW * BH * 4);
  for (let i = 0; i < maske.length; i++) {
    daten[i * 4] = maske[i];
    daten[i * 4 + 1] = innen[i] ? dist[i] : 0;
    daten[i * 4 + 2] = weich[i];
    daten[i * 4 + 3] = 1;
  }
  return { daten, maske };
}

type Teilchen = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  rot: number;
  vr: number;
  glow: boolean;
  art: 'klumpen' | 'puff' | 'flocke';
  leben: number;
  ziel: number;
};
const MAX_TEILCHEN = 250;
const SCHWERKRAFT = 900; // px/s²
const HAUFEN_MAX = 14; // px
const SPALTE = 2; // px je Haufen-Spalte

export default function Titel({ text }: { text: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const schneeRef = useRef<HTMLCanvasElement>(null);
  const [aktiv, setAktiv] = useState(false);

  useEffect(() => {
    const cv = canvasRef.current!;
    const sc = schneeRef.current!;
    const ctx = sc.getContext('2d')!;
    const gl = cv.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false });
    if (!gl) return; // CSS-Schrift bleibt sichtbar
    const reduziert = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const shader = (typ: number, src: string) => {
      const s = gl.createShader(typ)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? '');
      return s;
    };
    const prog = gl.createProgram()!;
    try {
      gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? '');
    } catch (err) {
      console.warn('Titel-Shader:', (err as Error).message);
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const U = (n: string) => gl.getUniformLocation(prog, n);
    const uTime = U('uTime');
    gl.uniform1i(U('uTex'), 0);
    gl.uniform1i(U('uAbtrag'), 1);
    const tex = gl.createTexture();
    const abTex = gl.createTexture();

    // ---------- Zustand ----------
    const abtrag = new Float32Array(AW * AH); // 0 = intakt, 1 = weggebrochen
    const abBytes = new Uint8Array(AW * AH);
    let maske: Float32Array | null = null;
    let bodenAnteil = 0.88; // Bodenlinie knapp unter den Buchstaben (Anteil der Höhe)
    const teilchen: Teilchen[] = [];
    let haufen = new Float32Array(0); // Höhe je Spalte in px
    let haufenZeit = new Float64Array(0); // letzte Zunahme je Spalte
    let W = 0;
    let H = 0;
    let abtragLaeuft = false;
    let letzt: { x: number; y: number; t: number } | null = null;
    let beruehrt = false;
    let rahmen = 0;
    let beendet = false;
    let vorher = 0;

    function abtragHochladen() {
      for (let i = 0; i < abtrag.length; i++) abBytes[i] = Math.round(abtrag[i] * 255);
      gl!.activeTexture(gl!.TEXTURE1);
      gl!.bindTexture(gl!.TEXTURE_2D, abTex);
      gl!.texSubImage2D(gl!.TEXTURE_2D, 0, 0, 0, AW, AH, gl!.RED, gl!.UNSIGNED_BYTE, abBytes);
      gl!.activeTexture(gl!.TEXTURE0);
    }

    function groesse() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = cv.clientWidth;
      H = cv.clientHeight;
      const w = Math.round(W * dpr);
      const h = Math.round(H * dpr);
      if (w && (cv.width !== w || cv.height !== h)) {
        cv.width = sc.width = w;
        cv.height = sc.height = h;
        gl!.viewport(0, 0, w, h);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      const spalten = Math.ceil(W / SPALTE) + 1;
      if (haufen.length !== spalten) {
        haufen = new Float32Array(spalten);
        haufenZeit = new Float64Array(spalten);
      }
    }

    // Ist an dieser Stelle (CSS-Pixel im Titel) noch Schnee?
    function istSchnee(x: number, y: number) {
      if (!maske || x < 0 || y < 0 || x >= W || y >= H) return false;
      const m = maske[Math.floor((y / H) * BH) * BW + Math.floor((x / W) * BW)];
      return m > 0.5 && abtrag[Math.floor((y / H) * AH) * AW + Math.floor((x / W) * AW)] < 0.5;
    }
    const neu = (t: Omit<Teilchen, 'leben' | 'ziel'> & { ziel?: number }) => {
      if (teilchen.length < MAX_TEILCHEN) teilchen.push({ leben: 0, ziel: 0, ...t });
    };

    // Schnee unter dem Zeiger abbrechen lassen
    function abbrechen(x: number, y: number, tempo: number) {
      const radius = 40 * (0.8 + Math.min(tempo / 1500, 0.8));
      // Klumpen aus der noch vorhandenen Buchstabenfläche
      const anzahl = 6 + Math.floor(Math.random() * 9);
      for (let n = 0, versuch = 0; n < anzahl && versuch < 40; versuch++) {
        const w = Math.random() * Math.PI * 2;
        const rr = Math.sqrt(Math.random()) * radius;
        const px = x + Math.cos(w) * rr;
        const py = y + Math.sin(w) * rr;
        if (!istSchnee(px, py)) continue;
        neu({
          x: px,
          y: py,
          vx: (Math.random() - 0.5) * 70,
          vy: -Math.random() * 50,
          r: 1 + Math.random() * 2.5, // 2–7 px Durchmesser
          rot: Math.random() * 6,
          vr: (Math.random() - 0.5) * 6,
          glow: Math.random() < 0.3,
          art: 'klumpen',
        });
        n++;
      }
      // Abtrag-Karte hochsetzen
      const sx = AW / W;
      const cx = x * sx;
      const cy = y * (AH / H);
      const rz = radius * sx;
      for (let gy = Math.max(0, Math.floor(cy - rz)); gy <= Math.min(AH - 1, Math.ceil(cy + rz)); gy++) {
        for (let gx = Math.max(0, Math.floor(cx - rz)); gx <= Math.min(AW - 1, Math.ceil(cx + rz)); gx++) {
          const d = Math.hypot(gx - cx, gy - cy) / rz;
          if (d < 1) abtrag[gy * AW + gx] = Math.min(1, abtrag[gy * AW + gx] + (1 - d) * 0.9);
        }
      }
      abtragLaeuft = true;
    }

    // kurzer Puff aus Pulverschnee
    function puff(x: number, y: number) {
      for (let i = 0; i < 10; i++) {
        neu({
          x,
          y,
          vx: (Math.random() - 0.5) * 280,
          vy: -90 - Math.random() * 200,
          r: 0.6 + Math.random() * 0.9,
          rot: 0,
          vr: 0,
          glow: false,
          art: 'puff',
        });
      }
    }

    function zeiger(e: PointerEvent, antippen: boolean) {
      const rect = cv.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const jetzt = performance.now();
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        letzt = null;
        beruehrt = false;
        return;
      }
      if (letzt && !antippen && Math.hypot(x - letzt.x, y - letzt.y) < 4) return; // nicht bei jedem Pixel
      const tempo = letzt ? Math.hypot(x - letzt.x, y - letzt.y) / Math.max(0.008, (jetzt - letzt.t) / 1000) : 600;
      if (!beruehrt && istSchnee(x, y)) {
        puff(x, y);
        beruehrt = true;
      }
      abbrechen(x, y, tempo);
      letzt = { x, y, t: jetzt };
    }
    const beiBewegung = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') zeiger(e, false);
    };
    const beiTippen = (e: PointerEvent) => {
      if (e.pointerType === 'touch') zeiger(e, true);
    };

    // ---------- Physik und Zeichnen der Teilchen ----------
    function schritt(dt: number, jetzt: number) {
      const boden = H * bodenAnteil;

      // Wiederaufbau: Abtrag sinkt, kleine Flocken schneien in die Lücken
      if (abtragLaeuft) {
        let max = 0;
        for (let i = 0; i < abtrag.length; i++) {
          abtrag[i] = Math.max(0, abtrag[i] - 0.35 * dt);
          if (abtrag[i] > max) max = abtrag[i];
        }
        abtragHochladen();
        abtragLaeuft = max > 0;
        for (let k = 0; k < 3; k++) {
          if (Math.random() > dt * 30) continue;
          for (let versuch = 0; versuch < 20; versuch++) {
            const i = Math.floor(Math.random() * abtrag.length);
            if (abtrag[i] < 0.08) continue;
            const x = ((i % AW) + 0.5) * (W / AW);
            const ziel = (Math.floor(i / AW) + 0.5) * (H / AH);
            if (!maske || maske[Math.floor((ziel / H) * BH) * BW + Math.floor((x / W) * BW)] < 0.5) continue;
            neu({ x, y: ziel - 30 - Math.random() * 40, vx: 0, vy: 50 + Math.random() * 40, r: 0.6 + Math.random() * 0.6, rot: Math.random() * 6, vr: 0, glow: false, art: 'flocke', ziel });
            break;
          }
        }
      }

      for (let i = teilchen.length - 1; i >= 0; i--) {
        const t = teilchen[i];
        t.leben += dt;
        if (t.art === 'klumpen') {
          t.vy += SCHWERKRAFT * dt;
          t.vx *= 1 - 1.5 * dt; // Luftwiderstand
          t.vy *= 1 - 0.3 * dt;
          t.x += t.vx * dt;
          t.y += t.vy * dt;
          t.rot += t.vr * dt;
          const sp = Math.max(0, Math.min(haufen.length - 1, Math.round(t.x / SPALTE)));
          if (t.y + t.r >= boden - haufen[sp]) {
            // liegen bleiben: Haufen wächst (weich auf Nachbarspalten verteilt)
            for (let k = -4; k <= 4; k++) {
              const c = sp + k;
              if (c < 0 || c >= haufen.length) continue;
              haufen[c] = Math.min(HAUFEN_MAX, haufen[c] + t.r * 0.55 * Math.exp(-(k * k) / 6));
              haufenZeit[c] = jetzt;
            }
            teilchen.splice(i, 1);
          }
        } else if (t.art === 'puff') {
          t.vy += 260 * dt;
          t.vx *= 1 - 2 * dt;
          t.x += t.vx * dt;
          t.y += t.vy * dt;
          if (t.leben > 0.6) teilchen.splice(i, 1);
        } else {
          t.x += Math.sin(t.leben * 4 + t.rot) * 12 * dt;
          t.y += t.vy * dt;
          if (t.y >= t.ziel || t.leben > 3) teilchen.splice(i, 1);
        }
      }

      // Haufen schmilzt/stäubt nach 3–5 s weg
      let haufenDa = false;
      for (let c = 0; c < haufen.length; c++) {
        if (haufen[c] <= 0) continue;
        if (jetzt - haufenZeit[c] > 3000 + (c % 7) * 280) haufen[c] = Math.max(0, haufen[c] - 9 * dt);
        if (haufen[c] > 0) haufenDa = true;
      }

      ctx.clearRect(0, 0, W, H);
      if (haufenDa) {
        const pfad = new Path2D();
        pfad.moveTo(0, boden);
        for (let c = 0; c < haufen.length; c++) {
          const h = ((haufen[c - 1] ?? 0) + 2 * haufen[c] + (haufen[c + 1] ?? 0)) / 4;
          pfad.lineTo(c * SPALTE, boden - h);
        }
        pfad.lineTo(W, boden);
        pfad.closePath();
        ctx.save();
        ctx.translate(1.5, 2);
        ctx.fillStyle = 'rgba(80,120,230,0.35)'; // leichter blauer Schatten
        ctx.fill(pfad);
        ctx.restore();
        const g = ctx.createLinearGradient(0, boden - HAUFEN_MAX, 0, boden);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(1, '#c6d5ff');
        ctx.fillStyle = g;
        ctx.fill(pfad);
      }
      for (const t of teilchen) {
        if (t.art === 'klumpen') {
          ctx.save();
          if (t.glow) {
            ctx.shadowColor = 'rgba(200,225,255,0.9)';
            ctx.shadowBlur = 6;
          }
          const g = ctx.createRadialGradient(t.x - t.r * 0.35, t.y - t.r * 0.35, 0, t.x, t.y, t.r * 1.2);
          g.addColorStop(0, '#ffffff');
          g.addColorStop(1, '#b7c8f3');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.ellipse(t.x, t.y, t.r, t.r * 0.78, t.rot, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          ctx.globalAlpha = t.art === 'puff' ? 0.6 * (1 - t.leben / 0.6) : 0.85;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    }

    function bild(ms: number) {
      groesse();
      gl!.uniform1f(uTime, reduziert ? 0 : ms / 1000);
      gl!.clearColor(0, 0, 0, 0);
      gl!.clear(gl!.COLOR_BUFFER_BIT);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
    }

    let unruhig = false; // Teilchen, Haufen oder Abtrag vorhanden
    function schleife(ms: number) {
      const dt = vorher ? Math.min(0.05, (ms - vorher) / 1000) : 0.016;
      vorher = ms;
      if (!document.hidden) {
        // nur rechnen, solange etwas passiert; sonst nur die Standard-Zeichnung
        if (abtragLaeuft || teilchen.length || unruhig) {
          schritt(dt, performance.now());
          unruhig = abtragLaeuft || teilchen.length > 0 || haufen.some((h) => h > 0);
        }
        bild(ms);
      }
      rahmen = requestAnimationFrame(schleife);
    }

    if (!reduziert) {
      addEventListener('pointermove', beiBewegung, { passive: true });
      addEventListener('pointerdown', beiTippen, { passive: true });
    }

    // Schriften abwarten, dann Maske und Distanzkarte einmal bauen
    document.fonts.ready.then(() => {
      if (beendet) return;
      try {
        const gebaut = maskeBauen(text);
        maske = gebaut.maske;
        // Bodenlinie: unterste Zeile mit Schnee + etwas Abstand
        for (let y = BH - 1; y >= 0; y--) {
          let da = false;
          for (let x = 0; x < BW; x += 2) if (maske[y * BW + x] > 0.5) { da = true; break; }
          if (da) {
            bodenAnteil = Math.min(0.98, (y + 10) / BH);
            break;
          }
        }
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, BW, BH, 0, gl.RGBA, gl.FLOAT, gebaut.daten);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, abTex);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, AW, AH, 0, gl.RED, gl.UNSIGNED_BYTE, abBytes);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.activeTexture(gl.TEXTURE0);
      } catch (err) {
        console.warn('Titel:', (err as Error).message);
        return;
      }
      setAktiv(true);
      if (reduziert) bild(0);
      else rahmen = requestAnimationFrame(schleife);
    });

    return () => {
      beendet = true;
      cancelAnimationFrame(rahmen);
      removeEventListener('pointermove', beiBewegung);
      removeEventListener('pointerdown', beiTippen);
      gl.deleteTexture(tex);
      gl.deleteTexture(abTex);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    };
  }, [text]);

  return (
    <h1 className={`schneetitel${aktiv ? ' gl-an' : ''}`} tabIndex={-1}>
      <span className="nur-sr" data-klasse>
        {text}
      </span>
      <span className="schneetitel-css" data-klasse aria-hidden="true">
        {text}
      </span>
      <canvas ref={canvasRef} aria-hidden="true" />
      <canvas ref={schneeRef} aria-hidden="true" />
    </h1>
  );
}
