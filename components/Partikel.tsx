'use client';

import { useEffect, useRef } from 'react';
import { buesteAusCode, buesteAusFoto, WERTE_PRO_PUNKT, type Bild } from '@/lib/bueste';

const SPUR_MAX = 24; // gemerkte Mauspositionen
const SPUR_DAUER = 1500; // ms, bis eine Position ausgeblasst ist

const VERTEX = `#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormale;
layout(location = 2) in vec2 aInfo; // Helligkeit, Zufall
uniform float uZeit, uDreh, uSkala, uAspekt, uVersatz, uPunkt;
uniform vec3 uSpur[${SPUR_MAX}]; // x, y (Bildschirm -1…1), Stärke
out vec3 vFarbe;
out float vAlpha;
void main() {
  float c = cos(uDreh), s = sin(uDreh);
  vec3 p = vec3(c * aPos.x + s * aPos.z, aPos.y, -s * aPos.x + c * aPos.z);
  vec3 n = vec3(c * aNormale.x + s * aNormale.z, aNormale.y, -s * aNormale.x + c * aNormale.z);
  p += n * 0.004 * sin(uZeit * 1.3 + aInfo.y * 40.0);

  vec2 bild = vec2(p.x / uAspekt, p.y - 0.08) * uSkala / (3.2 - p.z);
  bild.x += uVersatz;

  // Partikel entlang der Mausspur wegschieben
  vec2 schub = vec2(0.0);
  for (int i = 0; i < ${SPUR_MAX}; i++) {
    vec3 m = uSpur[i];
    if (m.z <= 0.0) continue;
    vec2 d = (bild - m.xy) * vec2(uAspekt, 1.0);
    float l2 = dot(d, d);
    schub += d / sqrt(l2 + 1e-4) * m.z * 0.07 * exp(-l2 / 0.01);
  }
  bild += schub * vec2(1.0 / uAspekt, 1.0);
  gl_Position = vec4(bild, 0.0, 1.0);

  vec3 licht = normalize(vec3(-0.45, 0.55, 0.8));
  float diffus = max(dot(n, licht), 0.0);
  float kante = pow(1.0 - abs(n.z), 3.0);
  vec3 indigo = vec3(0.30, 0.34, 1.0);
  vec3 weiss = vec3(0.93, 0.94, 1.0);
  vec3 rosa = vec3(1.0, 0.62, 0.86);
  // Helligkeit (aus Foto oder Code) bestimmt das Bild, Licht und Kanten geben Tiefe.
  vec3 f = mix(indigo * 0.55, weiss, clamp(aInfo.x * aInfo.x * 0.95 + diffus * 0.2 + kante * 0.35, 0.0, 1.0));
  f = mix(f, rosa, smoothstep(-0.5, -1.0, aPos.y) * 0.65);
  vFarbe = f;
  float zufall = fract(aInfo.y * 13.7);
  vAlpha = (0.15 + 0.85 * aInfo.x) * (0.55 + 0.45 * zufall) * (1.0 - smoothstep(-0.75, -1.12, aPos.y));
  gl_PointSize = uPunkt * (0.7 + 0.8 * fract(aInfo.y * 7.3));
}`;

const FRAGMENT = `#version 300 es
precision mediump float;
in vec3 vFarbe;
in float vAlpha;
out vec4 farbe;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = dot(d, d);
  if (r > 0.25) discard;
  farbe = vec4(vFarbe, vAlpha * (1.0 - r * 4.0));
}`;

// Lädt ein PNG und gibt die Pixel zurück (null, wenn es fehlt).
async function ladeBild(url: string): Promise<Bild | null> {
  try {
    const antwort = await fetch(url);
    if (!antwort.ok) return null;
    const bmp = await createImageBitmap(await antwort.blob(), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
    const c = document.createElement('canvas');
    c.width = bmp.width;
    c.height = bmp.height;
    const k = c.getContext('2d', { willReadFrequently: true })!;
    k.drawImage(bmp, 0, 0);
    return { breite: bmp.width, hoehe: bmp.height, pixel: k.getImageData(0, 0, bmp.width, bmp.height).data };
  } catch {
    return null;
  }
}

export default function Partikel({ laeuft }: { laeuft: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const laeuftRef = useRef(laeuft);
  const neuStarten = useRef(() => {});

  useEffect(() => {
    laeuftRef.current = laeuft;
    neuStarten.current();
  }, [laeuft]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const gl = canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: false });
    if (!gl) return; // Ohne WebGL2 bleibt der Farbverlauf im Hintergrund, alle Texte bleiben lesbar.

    const shader = (art: number, quelle: string) => {
      const s = gl.createShader(art)!;
      gl.shaderSource(s, quelle);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
      return s;
    };
    const programm = gl.createProgram()!;
    gl.attachShader(programm, shader(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(programm, shader(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(programm);
    gl.useProgram(programm);
    const u = (name: string) => gl.getUniformLocation(programm, name);
    const [uZeit, uDreh, uSkala, uAspekt, uVersatz, uPunkt, uSpur] = [
      'uZeit', 'uDreh', 'uSkala', 'uAspekt', 'uVersatz', 'uPunkt', 'uSpur',
    ].map(u);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // leuchtende Punkte addieren sich
    gl.clearColor(0, 0, 0, 0);

    const ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const klein = innerWidth < 820; // nur nach Fensterbreite
    let anzahl = 0;
    let puffer: WebGLBuffer | null = null;
    let beendet = false;

    // Punktwolke einmal erzeugen und einmal in die GPU laden.
    function hochladen(daten: Float32Array) {
      puffer = gl!.createBuffer();
      gl!.bindBuffer(gl!.ARRAY_BUFFER, puffer);
      gl!.bufferData(gl!.ARRAY_BUFFER, daten, gl!.STATIC_DRAW);
      const schritt = WERTE_PRO_PUNKT * 4;
      gl!.enableVertexAttribArray(0);
      gl!.vertexAttribPointer(0, 3, gl!.FLOAT, false, schritt, 0);
      gl!.enableVertexAttribArray(1);
      gl!.vertexAttribPointer(1, 3, gl!.FLOAT, false, schritt, 12);
      gl!.enableVertexAttribArray(2);
      gl!.vertexAttribPointer(2, 2, gl!.FLOAT, false, schritt, 24);
      anzahl = daten.length / WERTE_PRO_PUNKT;
    }

    const spur: { x: number; y: number; t: number }[] = [];
    const spurDaten = new Float32Array(SPUR_MAX * 3);
    let zeit = 0;
    let letzte = 0;
    let bild = 0;

    function groesse() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      gl!.viewport(0, 0, canvas.width, canvas.height);
      gl!.uniform1f(uPunkt, dpr);
    }

    function zeichnen(jetzt: number) {
      const aspekt = canvas.width / Math.max(1, canvas.height);
      gl!.uniform1f(uZeit, zeit);
      // fast frontal, damit das Gesicht erkennbar bleibt
      gl!.uniform1f(uDreh, 0.12 + (ruhig ? 0 : 0.32 * Math.sin(zeit * 0.35)));
      gl!.uniform1f(uSkala, 2.7 * Math.min(1, aspekt / 0.8));
      gl!.uniform1f(uAspekt, aspekt);
      gl!.uniform1f(uVersatz, innerWidth >= 768 ? 0.22 : 0);
      spurDaten.fill(0);
      spur.forEach((p, i) => {
        const s = 1 - (jetzt - p.t) / SPUR_DAUER;
        if (s <= 0) return;
        spurDaten.set([p.x, p.y, s * s * (3 - 2 * s)], i * 3);
      });
      gl!.uniform3fv(uSpur, spurDaten);
      gl!.clear(gl!.COLOR_BUFFER_BIT);
      if (anzahl) gl!.drawArrays(gl!.POINTS, 0, anzahl);
    }

    function schleife(jetzt: number) {
      zeit += (letzte ? Math.min(jetzt - letzte, 50) : 16) / 1000;
      letzte = jetzt;
      zeichnen(jetzt);
      bild = requestAnimationFrame(schleife);
    }

    // Startet oder pausiert die Animation (Tab unsichtbar, Inhaltsreiter, reduzierte Bewegung).
    function starten() {
      cancelAnimationFrame(bild);
      letzte = 0;
      if (ruhig || !laeuftRef.current || document.hidden) {
        spur.length = 0;
        zeichnen(performance.now());
        return;
      }
      bild = requestAnimationFrame(schleife);
    }
    neuStarten.current = starten;

    function maus(e: PointerEvent) {
      if (ruhig || !laeuftRef.current) return;
      const x = (e.clientX / innerWidth) * 2 - 1;
      const y = 1 - (e.clientY / innerHeight) * 2;
      const vorher = spur[spur.length - 1];
      if (vorher && Math.hypot(vorher.x - x, vorher.y - y) < 0.015) return;
      spur.push({ x, y, t: performance.now() });
      if (spur.length > SPUR_MAX) spur.shift();
    }

    const beiGroesse = () => {
      groesse();
      zeichnen(performance.now());
    };
    addEventListener('resize', beiGroesse);
    addEventListener('pointermove', maus, { passive: true });
    document.addEventListener('visibilitychange', starten);
    groesse();

    // Foto-Kopf, falls vorhanden; sonst Büste per Code.
    const basis = process.env.NEXT_PUBLIC_BASE_PATH ?? ''; // z. B. "/bm25-klassenseite" auf GitHub Pages
    Promise.all([ladeBild(`${basis}/kopf/tiefe.png`), ladeBild(`${basis}/kopf/normalen.png`)]).then(([tiefe, normalen]) => {
      if (beendet) return;
      hochladen(
        tiefe && normalen
          ? buesteAusFoto(tiefe, normalen, klein ? 170_000 : 320_000)
          : buesteAusCode(klein ? 70_000 : 150_000),
      );
      starten();
    });

    return () => {
      beendet = true;
      cancelAnimationFrame(bild);
      neuStarten.current = () => {};
      removeEventListener('resize', beiGroesse);
      removeEventListener('pointermove', maus);
      document.removeEventListener('visibilitychange', starten);
      if (puffer) gl.deleteBuffer(puffer);
      gl.deleteProgram(programm);
    };
  }, []);

  return (
    <div className={`buehne${laeuft ? '' : ' gedimmt'}`} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
