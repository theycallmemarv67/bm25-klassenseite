'use client';

import { useEffect, useRef, useState } from 'react';

// 3D-Schneekugel vor dem Kalender (Reiter "Termine").
// Scrollen, Wischen, Pfeiltasten/Leertaste oder Klick zoomen die Kamera durch das Glas ins Innere;
// danach blendet der Kalender ein. Ganz oben im Kalender weiter nach oben scrollen zoomt wieder hinaus.
// Rendering: WebGL2, ein einziger Fullscreen-Fragment-Shader (Glas, Sockel per Raymarching, Inneres mit Billboards).
// Ohne WebGL2: flache 2D-Version mit denselben Szenenteilen und demselben Zoom.

// ---------- Welt-Koordinaten des Inneren (Kugel: Radius 1, Mittelpunkt 0, Schneeboden y = -0.5) ----------
const BODEN = -0.5;
const FENSTER = [
  { x: -0.22, y: -0.29, w: 0.12, h: 0.14 },
  { x: 0.1, y: -0.29, w: 0.12, h: 0.14 },
  { x: -0.035, y: -0.005, w: 0.07, h: 0.055 }, // Giebelgaube
];
const TUER = { x: -0.055, y: -0.5, w: 0.11, h: 0.2 };
const LATERNE = { x: -0.39, y: -0.25 };
// Tannen: x, z (Tiefe), Höhe; von hinten nach vorn
const TANNEN = {
  klein: [
    [-0.52, -0.6, 0.34],
    [0.12, -0.62, 0.3],
    [0.58, -0.58, 0.33],
  ],
  mittel: [
    [-0.42, -0.3, 0.5],
    [0.45, -0.28, 0.48],
  ],
  gross: [
    [-0.72, 0.35, 0.95],
    [0.74, 0.38, 0.9],
  ],
};
const LW = 960; // Licht-Layer (deckt x -0.95…0.95, y -0.5…0.4 ab)
const LH = 453;

const VS = `#version 300 es
in vec2 p;
void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const tanneGLSL = (liste: number[][], faktor: string) =>
  liste
    .map(
      ([x, z, h]) =>
        `t = billboard(uTanne, ro, rd, ${x.toFixed(3)}, ${z.toFixed(3)}, vec2(${(h * 0.667).toFixed(3)}, ${h.toFixed(3)}), tBg); col = mix(col, t.rgb * ${faktor}, t.a);`,
    )
    .join('\n  ');

const FS = `#version 300 es
precision highp float;
out vec4 o;
uniform vec2 uAufl;
uniform float uLinks, uZeit, uFort, uGlas, uDunkel, uSchuettel, uYaw, uPitch;
uniform sampler2D uHaus, uTanne, uLicht;
const float BODEN = ${BODEN.toFixed(2)};

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float rausch(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}

// Studio-Umgebung: kühle Grundfarbe, Softbox links oben und rechts, warmer Boden
vec3 umgebung(vec3 d){
  vec3 c = mix(vec3(0.02, 0.025, 0.06), vec3(0.07, 0.09, 0.18), d.y * 0.5 + 0.5);
  c += vec3(1.7, 1.65, 1.6) * smoothstep(0.93, 0.975, dot(d, normalize(vec3(-0.6, 0.65, 0.45))));
  c += vec3(0.8, 0.88, 1.0) * smoothstep(0.88, 0.95, dot(d, normalize(vec3(0.95, 0.12, 0.3))));
  c += vec3(0.28, 0.16, 0.08) * smoothstep(0.0, -0.6, d.y);
  return c;
}

// Billboard bei Tiefe z (Ebene parallel zur Bildebene), unten auf dem Schneeboden
vec4 billboard(sampler2D tex, vec3 ro, vec3 rd, float mx, float z, vec2 groesse, float tMax){
  if (abs(rd.z) < 1e-4) return vec4(0.0);
  float t = (z - ro.z) / rd.z;
  if (t <= 0.0 || t >= tMax) return vec4(0.0);
  vec3 q = ro + rd * t;
  vec2 uv = vec2((q.x - mx) / groesse.x + 0.5, 1.0 - (q.y - BODEN) / groesse.y);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec4(0.0);
  return texture(tex, uv);
}

// eine fallende Schnee-Ebene (Zellen-Noise), mit Wirbel beim Schütteln
float schnee(vec3 ro, vec3 rd, float z, float tMax, float dichte, float groesse, float tempo, float seed){
  if (abs(rd.z) < 1e-4) return 0.0;
  float t = (z - ro.z) / rd.z;
  if (t <= 0.0 || t >= tMax) return 0.0;
  vec3 q = ro + rd * t;
  if (dot(q, q) > 0.97) return 0.0;
  vec2 g = q.xy * dichte;
  g.y += uZeit * tempo * (1.0 - 1.6 * uSchuettel);
  g.x += sin(g.y * 0.7 + seed) * 0.3 + uSchuettel * sin(uZeit * 3.0 + g.y * 0.9 + seed) * 1.4;
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  vec2 versatz = (vec2(hash(id + seed), hash(id + seed + 7.7)) - 0.5) * 0.7;
  float r = groesse * (0.5 + hash(id + 3.3));
  return smoothstep(r, r * 0.35, length(f - versatz)) * step(0.62, hash(id + 1.1 + seed));
}

// Inneres der Kugel: Himmel an der Kugelwand, Schneeboden, Billboards, Lichter, Schnee
vec3 innen(vec3 ro, vec3 rd){
  float b = dot(ro, rd);
  float c = dot(ro, ro) - 1.0;
  float tWand = -b + sqrt(max(b*b - c, 0.0));
  vec3 w = normalize(ro + rd * tWand);

  vec3 col = mix(vec3(0.22, 0.27, 0.6), vec3(0.05, 0.06, 0.2), smoothstep(-0.3, 0.9, w.y));
  vec2 sp = vec2(atan(w.z, w.x), w.y) * 42.0;
  float st = hash(floor(sp));
  col += vec3(0.9) * step(0.985, st) * smoothstep(0.35, 0.0, length(fract(sp) - 0.5)) * (0.6 + 0.4 * sin(uZeit * 2.0 + st * 40.0));
  vec3 md = normalize(vec3(-0.45, 0.5, -0.74));
  float dm = dot(w, md);
  col += vec3(0.22, 0.26, 0.45) * pow(max(dm, 0.0), 40.0);
  float mond = smoothstep(0.972, 0.976, dm) * (1.0 - smoothstep(0.97, 0.975, dot(w, normalize(md + vec3(0.12, 0.08, 0.06)))));
  col = mix(col, vec3(1.0, 0.97, 0.86), mond);
  float tBg = tWand;

  if (rd.y < 0.0) {
    float tB = (BODEN - ro.y) / rd.y;
    if (tB > 0.0 && tB < tWand) {
      vec3 q = ro + rd * tB;
      float n = rausch(q.xz * 18.0) * 0.5 + rausch(q.xz * 60.0) * 0.25;
      vec3 sc = mix(vec3(0.5, 0.58, 0.85), vec3(0.88, 0.92, 1.0), n);
      vec2 k = (q.xz - vec2(0.0, 0.2)) * vec2(3.2, 2.4);
      sc += vec3(1.0, 0.72, 0.38) * 0.55 * exp(-dot(k, k));
      float gl = hash(floor(q.xz * 230.0));
      sc += vec3(1.2) * step(0.993, gl) * (0.5 + 0.5 * sin(uZeit * 4.0 + gl * 50.0));
      col = sc;
      tBg = tB;
    }
  }

  vec4 t;
  ${tanneGLSL(TANNEN.klein, '0.7')}
  col += vec3(0.95, 0.97, 1.0) * schnee(ro, rd, -0.45, tBg, 26.0, 0.12, 0.35, 1.0) * 0.6;
  ${tanneGLSL(TANNEN.mittel, '0.85')}
  col += vec3(0.95, 0.97, 1.0) * schnee(ro, rd, -0.15, tBg, 20.0, 0.13, 0.45, 2.0) * 0.7;
  t = billboard(uHaus, ro, rd, 0.0, 0.0, vec2(1.0, 0.75), tBg); col = mix(col, t.rgb, t.a);
  t = billboard(uLicht, ro, rd, 0.0, 0.03, vec2(1.9, 0.9), tBg); col += t.rgb;
  col += vec3(0.95, 0.97, 1.0) * schnee(ro, rd, 0.2, tBg, 14.0, 0.14, 0.55, 3.0) * 0.8;
  ${tanneGLSL(TANNEN.gross, '1.0')}
  col += vec3(1.0) * schnee(ro, rd, 0.6, tBg, 11.0, 0.08, 0.7, 4.0) * 0.7;
  return col;
}

// ---------- Sockel: Rotationskörper als Distanzfeld ----------
float sdTrapez(vec2 p, float r1, float r2, float he){
  vec2 k1 = vec2(r2, he), k2 = vec2(r2 - r1, 2.0 * he);
  p.x = abs(p.x);
  vec2 ca = vec2(p.x - min(p.x, (p.y < 0.0) ? r1 : r2), abs(p.y) - he);
  vec2 cb = p - k1 + k2 * clamp(dot(k1 - p, k2) / dot(k2, k2), 0.0, 1.0);
  float s = (cb.x < 0.0 && ca.y < 0.0) ? -1.0 : 1.0;
  return s * sqrt(min(dot(ca, ca), dot(cb, cb)));
}
float sdBox2(vec2 p, vec2 b){ vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
vec2 sockel(vec3 p){
  vec2 q = vec2(length(p.xz), p.y);
  float holz = sdTrapez(q - vec2(0.0, -1.19), 0.98, 0.7, 0.36) - 0.01;
  float platte = sdBox2(q - vec2(0.0, -0.785), vec2(0.735, 0.045)) - 0.012;
  float ring1 = length(q - vec2(0.725, -0.85)) - 0.035;
  float ring2 = length(q - vec2(0.985, -1.555)) - 0.04;
  float fuss = sdBox2(q - vec2(0.0, -1.62), vec2(1.02, 0.04)) - 0.01;
  float gold = min(min(platte, ring1), min(ring2, fuss));
  return holz < gold ? vec2(holz, 0.0) : vec2(gold, 1.0);
}
vec3 sockelNormale(vec3 p){
  vec2 e = vec2(0.002, -0.002);
  return normalize(e.xyy * sockel(p + e.xyy).x + e.yyx * sockel(p + e.yyx).x + e.yxy * sockel(p + e.yxy).x + e.xxx * sockel(p + e.xxx).x);
}

void main(){
  float f = uFort;
  float dist = 5.35 * pow(0.88 / 5.35, f);
  float pitch = mix(uPitch, 0.02, f);
  vec3 ziel = vec3(0.0, mix(-0.42, -0.12, f), 0.0);
  vec3 ro = ziel + dist * vec3(sin(uYaw) * cos(pitch), sin(pitch), cos(uYaw) * cos(pitch));
  vec3 fw = normalize(ziel - ro);
  vec3 ri = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(ri, fw);
  vec2 uv = (gl_FragCoord.xy - vec2(uLinks + (uAufl.x - uLinks) * 0.5, uAufl.y * 0.5)) / (uAufl.y * 0.5);
  vec3 rd = normalize(fw * 3.17 + ri * uv.x + up * uv.y); // Bildwinkel ca. 35°

  vec3 col;
  if (dot(ro, ro) < 1.0) {
    col = innen(ro, rd); // Kamera im Inneren: nur noch das Innere
  } else {
    // Hintergrund und Boden mit Kontaktschatten und warmem Widerschein
    col = mix(vec3(0.012, 0.016, 0.045), vec3(0.04, 0.05, 0.12), smoothstep(-0.3, 0.6, rd.y));
    float tNah = 1e9;
    if (rd.y < 0.0) {
      float tF = (-1.66 - ro.y) / rd.y;
      if (tF > 0.0) {
        vec3 q = ro + rd * tF;
        float r = length(q.xz);
        vec3 fc = vec3(0.02, 0.025, 0.065) + vec3(0.4, 0.2, 0.08) * 0.45 * exp(-r * r * 1.1);
        fc *= mix(0.2, 1.0, smoothstep(0.95, 1.7, r));
        col = mix(col, fc, exp(-tF * 0.04));
        tNah = tF;
      }
    }
    // Glaskugel
    float b = dot(ro, rd);
    float h = b * b - dot(ro, ro) + 1.0;
    float tK = h > 0.0 ? -b - sqrt(h) : 1e9;
    if (tK < 0.0) tK = 1e9;
    // Sockel (Raymarching in der Höhen-Schicht)
    float tP = 1e9;
    vec2 m = vec2(0.0);
    if (abs(rd.y) > 1e-4) {
      float t1 = (-0.68 - ro.y) / rd.y, t2 = (-1.7 - ro.y) / rd.y;
      float t = max(0.0, min(t1, t2)), tEnde = max(t1, t2);
      for (int i = 0; i < 64; i++) {
        if (t > tEnde) break;
        vec3 p = ro + rd * t;
        m = sockel(p);
        if (m.x < 0.0015) { tP = t; break; }
        t += m.x;
      }
    }
    if (tP < min(tK, tNah)) {
      vec3 p = ro + rd * tP;
      vec3 n = sockelNormale(p);
      vec3 r = reflect(rd, n);
      float fres = 0.04 + 0.96 * pow(1.0 - max(dot(-rd, n), 0.0), 5.0);
      vec3 L = normalize(vec3(-0.5, 0.6, 0.6));
      if (m.y < 0.5) {
        float ang = atan(p.z, p.x);
        float maser = sin(ang * 5.0 + rausch(vec2(ang * 3.0, p.y * 8.0)) * 6.0 + p.y * 30.0);
        vec3 holz = mix(vec3(0.28, 0.06, 0.03), vec3(0.58, 0.18, 0.08), 0.5 + 0.5 * maser);
        col = holz * (max(dot(n, L), 0.0) * 0.8 + 0.2) + umgebung(r) * mix(0.08, 0.7, fres); // Klarlack
      } else {
        col = vec3(1.0, 0.76, 0.36) * (umgebung(r) * 1.3 + 0.07)
            + vec3(1.0, 0.9, 0.7) * pow(max(dot(r, normalize(vec3(-0.6, 0.65, 0.45))), 0.0), 40.0) * 1.4;
      }
    } else if (tK < tNah) {
      vec3 p = ro + rd * tK;
      vec3 n = normalize(p);
      float cosi = max(dot(-rd, n), 0.0);
      float fres = 0.04 + 0.96 * pow(1.0 - cosi, 5.0);
      vec3 rr = normalize(mix(rd, refract(rd, n, 1.0 / 1.25), uGlas));
      vec3 inn = innen(p + rr * 0.001, rr);
      col = mix(inn, umgebung(reflect(rd, n)), clamp(fres * 1.2, 0.0, 1.0) * uGlas);
      col += vec3(0.55, 0.75, 1.0) * pow(1.0 - cosi, 3.0) * 0.35 * uGlas;   // hellblauer Glasrand
      col += vec3(1.0, 0.75, 0.4) * 0.3 * uGlas * exp(-pow((p.y + 0.62) / 0.12, 2.0)) * smoothstep(0.3, 0.9, cosi); // warmer Lichtfleck
    }
  }
  vec2 v = gl_FragCoord.xy / uAufl - 0.5;
  col *= 1.0 - 0.45 * dot(v, v) * 2.0;   // Vignette
  col *= 1.0 - uDunkel;
  o = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

// ---------- Billboard-Texturen per Canvas 2D (Vektorgrafik) ----------
function hausZeichnen(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 384;
  const k = c.getContext('2d')!;
  const X = (x: number) => (x + 0.5) * 512;
  const Y = (y: number) => (0.25 - y) * 512;
  const S = (v: number) => v * 512;
  const rect = (x: number, y: number, w: number, h: number) => k.fillRect(X(x), Y(y + h), S(w), S(h));

  // Zaun
  k.fillStyle = '#e6ddd0';
  for (const seite of [-1, 1]) {
    for (let x = 0.34; x <= 0.5; x += 0.035) rect(seite * x - 0.008, BODEN, 0.016, 0.08);
    rect(seite > 0 ? 0.32 : -0.5, -0.455, 0.18, 0.012);
    rect(seite > 0 ? 0.32 : -0.5, -0.485, 0.18, 0.012);
  }
  // Laterne
  k.fillStyle = '#1d1a22';
  rect(LATERNE.x - 0.006, BODEN, 0.012, 0.23);
  rect(LATERNE.x - 0.02, LATERNE.y - 0.01, 0.04, 0.045);
  k.fillStyle = '#ffd98a';
  rect(LATERNE.x - 0.013, LATERNE.y - 0.003, 0.026, 0.03);

  // Holzwand mit Bretterfugen
  const g = k.createLinearGradient(X(-0.3), 0, X(0.3), 0);
  g.addColorStop(0, '#80502e');
  g.addColorStop(1, '#55301b');
  k.fillStyle = g;
  rect(-0.3, BODEN, 0.6, 0.44);
  k.strokeStyle = 'rgba(40,20,10,0.55)';
  k.lineWidth = 1.5;
  for (let y = BODEN + 0.03; y < -0.06; y += 0.03) {
    k.beginPath();
    k.moveTo(X(-0.3), Y(y));
    k.lineTo(X(0.3), Y(y));
    k.stroke();
  }
  // warme Fenster mit Kreuzsprossen, beleuchtete Tür
  const fenster = (f: { x: number; y: number; w: number; h: number }) => {
    k.fillStyle = '#f2e6d0';
    rect(f.x - 0.012, f.y - 0.012, f.w + 0.024, f.h + 0.024);
    const fg = k.createRadialGradient(X(f.x + f.w / 2), Y(f.y + f.h / 2), 0, X(f.x + f.w / 2), Y(f.y + f.h / 2), S(f.w));
    fg.addColorStop(0, '#ffe7a0');
    fg.addColorStop(1, '#f0a440');
    k.fillStyle = fg;
    rect(f.x, f.y, f.w, f.h);
    k.fillStyle = '#5a321c';
    rect(f.x + f.w / 2 - 0.006, f.y, 0.012, f.h);
    rect(f.x, f.y + f.h / 2 - 0.006, f.w, 0.012);
  };
  FENSTER.slice(0, 2).forEach(fenster);
  k.fillStyle = '#f2e6d0';
  rect(TUER.x - 0.012, TUER.y, TUER.w + 0.024, TUER.h + 0.012);
  const tg = k.createLinearGradient(0, Y(TUER.y + TUER.h), 0, Y(TUER.y));
  tg.addColorStop(0, '#ffe7a0');
  tg.addColorStop(1, '#f2a948');
  k.fillStyle = tg;
  rect(TUER.x, TUER.y, TUER.w, TUER.h);

  // Schornstein
  k.fillStyle = '#6b3a2a';
  rect(0.16, 0.02, 0.07, 0.15);
  // Dach
  k.fillStyle = '#3a2418';
  k.beginPath();
  k.moveTo(X(-0.4), Y(-0.06));
  k.lineTo(X(0), Y(0.21));
  k.lineTo(X(0.4), Y(-0.06));
  k.fill();
  // Giebelgaube
  k.fillStyle = '#6a3e24';
  rect(-0.06, -0.03, 0.12, 0.1);
  fenster(FENSTER[2]);
  // Schneedecke auf Dach, Gaube und Schornstein
  k.strokeStyle = '#f4f8ff';
  k.lineCap = k.lineJoin = 'round';
  k.lineWidth = S(0.05);
  k.beginPath();
  k.moveTo(X(-0.4), Y(-0.05));
  k.lineTo(X(0), Y(0.22));
  k.lineTo(X(0.4), Y(-0.05));
  k.stroke();
  k.lineWidth = S(0.03);
  k.beginPath();
  k.moveTo(X(-0.085), Y(0.07));
  k.lineTo(X(0), Y(0.135));
  k.lineTo(X(0.085), Y(0.07));
  k.stroke();
  k.fillStyle = '#f4f8ff';
  k.beginPath();
  k.ellipse(X(0.195), Y(0.175), S(0.05), S(0.02), 0, 0, Math.PI * 2);
  k.fill();
  // Schneebäuschen an der Traufe
  for (let x = -0.4; x <= 0.4; x += 0.04) {
    k.fillStyle = '#eef3ff';
    k.beginPath();
    k.arc(X(x), Y(-0.07 - Math.abs(Math.sin(x * 40)) * 0.008), S(0.022), 0, Math.PI * 2);
    k.fill();
  }
  // Schneehäufchen unten und auf den Zaunpfosten
  for (let x = -0.5; x <= 0.5; x += 0.06) {
    const hg = k.createLinearGradient(0, Y(BODEN + 0.05), 0, Y(BODEN));
    hg.addColorStop(0, '#ffffff');
    hg.addColorStop(1, '#b9c8ef');
    k.fillStyle = hg;
    k.beginPath();
    k.ellipse(X(x), Y(BODEN), S(0.05), S(0.03 + Math.abs(Math.sin(x * 17)) * 0.02), 0, Math.PI, 0);
    k.fill();
  }
  return c;
}

function tanneZeichnen(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 384;
  const k = c.getContext('2d')!;
  const W = 256;
  const H = 384;
  k.fillStyle = '#3e2a1e';
  k.fillRect(W / 2 - 10, H - 40, 20, 40);
  const stufen = 7;
  for (let i = 0; i < stufen; i++) {
    const t = i / stufen;
    const unten = H - 30 - t * (H - 60);
    const hoehe = ((H - 40) / stufen) * 1.6;
    const hb = (W / 2 - 8) * (1 - t * 0.85);
    const oben = unten - hoehe;
    const g = k.createLinearGradient(W / 2 - hb, 0, W / 2 + hb, 0);
    g.addColorStop(0, '#3f7a5e');
    g.addColorStop(0.5, '#24533f');
    g.addColorStop(1, '#122e24');
    k.fillStyle = g;
    k.beginPath();
    k.moveTo(W / 2, oben);
    k.quadraticCurveTo(W / 2 - hb * 0.4, unten - hoehe * 0.4, W / 2 - hb, unten);
    k.lineTo(W / 2 + hb, unten);
    k.quadraticCurveTo(W / 2 + hb * 0.4, unten - hoehe * 0.4, W / 2, oben);
    k.fill();
    // Schneekappe: Bogen-Bäuschen an der Unterkante
    k.fillStyle = '#f2f6ff';
    const n = Math.max(3, Math.round(hb / 14));
    for (let j = 0; j < n; j++) {
      const bx = W / 2 - hb + ((2 * hb) / n) * (j + 0.5);
      k.beginPath();
      k.ellipse(bx, unten - 6, hb / n + 2, 9, 0, Math.PI, 0);
      k.fill();
    }
    k.beginPath();
    k.ellipse(W / 2, oben + 10, 10, 12, 0, 0, Math.PI * 2);
    k.fill();
  }
  return c;
}

// Lichter-Layer: Fensterglühen, Laterne, Lichterketten (jede Frame neu, additiv)
const KETTEN = [
  { x0: -0.4, y0: -0.06, x1: -0.9, y1: 0.02, sag: 0.08 },
  { x0: 0.4, y0: -0.06, x1: 0.9, y1: 0.02, sag: 0.08 },
];
const LAMPEN = ['255,236,190', '255,160,70', '255,130,195', '150,215,255'];
function lichterZeichnen(k: CanvasRenderingContext2D, zeit: number) {
  const X = (x: number) => ((x + 0.95) / 1.9) * LW;
  const Y = (y: number) => ((0.4 - y) / 0.9) * LH;
  const S = (v: number) => (v / 1.9) * LW;
  k.globalCompositeOperation = 'source-over';
  k.fillStyle = '#000';
  k.fillRect(0, 0, LW, LH);
  k.globalCompositeOperation = 'lighter';
  const glut = (x: number, y: number, r: number, rgb: string, a: number) => {
    const g = k.createRadialGradient(X(x), Y(y), 0, X(x), Y(y), S(r));
    g.addColorStop(0, `rgba(${rgb},${a})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    k.fillStyle = g;
    k.fillRect(X(x) - S(r), Y(y) - S(r), S(r) * 2, S(r) * 2);
  };
  for (const f of [...FENSTER, TUER]) {
    glut(f.x + f.w / 2, f.y + f.h / 2, f.w * 1.6, '255,180,90', 0.45 + 0.05 * Math.sin(zeit * 3 + f.x * 20));
  }
  glut(LATERNE.x, LATERNE.y + 0.01, 0.12, '255,210,140', 0.7 + 0.08 * Math.sin(zeit * 7) * Math.sin(zeit * 3.1));
  KETTEN.forEach((kette, ki) => {
    for (let i = 1; i < 10; i++) {
      const t = i / 10;
      const x = kette.x0 + (kette.x1 - kette.x0) * t;
      const y = kette.y0 + (kette.y1 - kette.y0) * t - Math.sin(Math.PI * t) * kette.sag;
      const flackern = 0.75 + 0.25 * Math.sin(zeit * (2.5 + i * 0.4) + i + ki) * Math.sin(zeit * 6.3 + i * 2);
      const rgb = LAMPEN[(i + ki) % 4];
      glut(x, y, 0.035, rgb, 0.6 * flackern);
      glut(x, y, 0.009, rgb, flackern);
    }
  });
}

const glatt = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Shader schon vorab im Hintergrund kompilieren (nicht blockierend). Der Browser speichert das Ergebnis,
// so öffnet "Termine" später ohne lange dunkle Pause.
export function vorwaermen() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return;
  gl.getExtension('KHR_parallel_shader_compile');
  const prog = gl.createProgram()!;
  for (const [typ, src] of [
    [gl.VERTEX_SHADER, VS],
    [gl.FRAGMENT_SHADER, FS],
  ] as const) {
    const sh = gl.createShader(typ)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    gl.attachShader(prog, sh);
  }
  gl.linkProgram(prog);
  setTimeout(() => gl.getExtension('WEBGL_lose_context')?.loseContext(), 30_000);
}

export default function Kugel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fortschritt, setFortschritt] = useState(0);
  const [reduziert] = useState(() => typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const zoomeRein = useRef(() => {});

  useEffect(() => {
    if (reduziert) return;
    const html = document.documentElement;
    const cv = canvasRef.current!;
    html.dataset.kugel = 'zu';
    html.style.setProperty('--kugel-sicht', '0');

    let ziel = 0;
    let anzeige = 0;
    let offen = false;
    let letzteEingabe = 0;
    let richtung = 1;
    let schuettel = 0;
    const maus = { x: 0, y: 0, gx: 0, gy: 0 };

    function eingabe(delta: number) {
      if (offen) {
        if (delta >= 0 || scrollY > 0) return false;
        offen = false; // ganz oben weiter nach oben: wieder hinauszoomen
        html.dataset.kugel = 'zu';
      }
      ziel = Math.min(1, Math.max(0, ziel + delta));
      richtung = Math.sign(delta) || richtung;
      letzteEingabe = performance.now();
      schuettel = Math.min(1, schuettel + Math.abs(delta) * 2.5);
      return true;
    }
    zoomeRein.current = () => {
      ziel = 1;
      richtung = 1;
      schuettel = Math.min(1, schuettel + 0.6);
      letzteEingabe = performance.now();
    };

    const rad = (e: WheelEvent) => {
      if (eingabe(e.deltaY * (e.deltaMode === 1 ? 0.04 : 0.0012))) e.preventDefault();
    };
    let touchY: number | null = null;
    const touchStart = (e: TouchEvent) => {
      touchY = e.touches[0].clientY;
    };
    const touchMove = (e: TouchEvent) => {
      if (touchY === null) return;
      const y = e.touches[0].clientY;
      if (eingabe((touchY - y) * 0.003)) e.preventDefault();
      touchY = y;
    };
    const taste = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.('input, select, textarea, button')) return;
      const vor = ['ArrowDown', 'PageDown', ' '].includes(e.key);
      const zurueck = ['ArrowUp', 'PageUp'].includes(e.key);
      if ((vor || zurueck) && eingabe(vor ? 0.25 : -0.25)) e.preventDefault();
    };
    const zeiger = (e: PointerEvent) => {
      maus.x = (e.clientX / innerWidth) * 2 - 1;
      maus.y = (e.clientY / innerHeight) * 2 - 1;
    };
    addEventListener('wheel', rad, { passive: false });
    addEventListener('touchstart', touchStart, { passive: true });
    addEventListener('touchmove', touchMove, { passive: false });
    addEventListener('keydown', taste);
    addEventListener('pointermove', zeiger, { passive: true });

    // ---------- Zeichnen: WebGL2 oder 2D-Ersatz ----------
    const gl = cv.getContext('webgl2', { antialias: false });
    const haus = hausZeichnen();
    const tanne = tanneZeichnen();
    const licht = document.createElement('canvas');
    licht.width = LW;
    licht.height = LH;
    const lk = licht.getContext('2d')!;
    let zeichne: (zeit: number, f: number) => void = () => {};
    let aufraeumen = () => {};

    function groesse() {
      const dpr = Math.min(devicePixelRatio || 1, 1.25);
      const w = Math.round(cv.clientWidth * dpr);
      const h = Math.round(cv.clientHeight * dpr);
      if (cv.width !== w || cv.height !== h) {
        cv.width = w;
        cv.height = h;
      }
      return dpr;
    }
    const links = () => (innerWidth >= 768 ? (innerWidth <= 1024 ? 148 : 168) : 0);

    // Shader im Hintergrund kompilieren (KHR_parallel_shader_compile), damit die Seite nicht hängt;
    // bis dahin sieht man den dunklen Hintergrund mit dem Hinweis.
    let warten: (() => boolean) | null = null; // true, sobald fertig
    if (gl) {
      const ext = gl.getExtension('KHR_parallel_shader_compile');
      const shader = (typ: number, src: string) => {
        const s = gl.createShader(typ)!;
        gl.shaderSource(s, src);
        gl.compileShader(s);
        return s;
      };
      const vs = shader(gl.VERTEX_SHADER, VS);
      const fs = shader(gl.FRAGMENT_SHADER, FS);
      const prog = gl.createProgram()!;
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      warten = () => {
        if (ext && !gl.getProgramParameter(prog, ext.COMPLETION_STATUS_KHR)) return false;
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
          console.warn('Schneekugel-Shader:', gl.getShaderInfoLog(fs) || gl.getProgramInfoLog(prog));
          return true;
        }
        einrichten();
        return true;
      };
      const einrichten = () => {
        gl.useProgram(prog);
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(prog, 'p');
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        const U = (n: string) => gl.getUniformLocation(prog, n);
        const textur = (einheit: number, quelle: HTMLCanvasElement, mip: boolean) => {
          const t = gl.createTexture();
          gl.activeTexture(gl.TEXTURE0 + einheit);
          gl.bindTexture(gl.TEXTURE_2D, t);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, quelle);
          if (mip) gl.generateMipmap(gl.TEXTURE_2D);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          return t;
        };
        const tHaus = textur(0, haus, true);
        const tTanne = textur(1, tanne, true);
        lichterZeichnen(lk, 0);
        const tLicht = textur(2, licht, false);
        gl.uniform1i(U('uHaus'), 0);
        gl.uniform1i(U('uTanne'), 1);
        gl.uniform1i(U('uLicht'), 2);
        const u = Object.fromEntries(
          ['uAufl', 'uLinks', 'uZeit', 'uFort', 'uGlas', 'uDunkel', 'uSchuettel', 'uYaw', 'uPitch'].map((n) => [n, U(n)]),
        );
        zeichne = (zeit, f) => {
          const dpr = groesse();
          gl.viewport(0, 0, cv.width, cv.height);
          lichterZeichnen(lk, zeit);
          gl.activeTexture(gl.TEXTURE2);
          gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, licht);
          gl.uniform2f(u.uAufl, cv.width, cv.height);
          gl.uniform1f(u.uLinks, links() * dpr);
          gl.uniform1f(u.uZeit, zeit);
          gl.uniform1f(u.uFort, f);
          gl.uniform1f(u.uGlas, 1 - glatt(0.55, 0.85, f));
          gl.uniform1f(u.uDunkel, glatt(0.85, 1, f) * 0.5);
          gl.uniform1f(u.uSchuettel, schuettel);
          gl.uniform1f(u.uYaw, 0.18 * Math.sin(zeit * 0.25) + maus.gx * 0.28);
          gl.uniform1f(u.uPitch, 0.17 + maus.gy * 0.08);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        };
        aufraeumen = () => {
          [tHaus, tTanne, tLicht].forEach((t) => gl.deleteTexture(t));
          gl.deleteBuffer(buf);
          gl.deleteProgram(prog);
        };
      };
    } else {
      // 2D-Ersatz: dieselben Szenenteile als Ebenen, die je nach Tiefe unterschiedlich stark skalieren
      const k = cv.getContext('2d');
      zeichne = (zeit, f) => {
        if (!k) return;
        const dpr = groesse();
        const W = cv.width / dpr;
        const H = cv.height / dpr;
        k.setTransform(dpr, 0, 0, dpr, 0, 0);
        k.fillStyle = '#05071a';
        k.fillRect(0, 0, W, H);
        const cx = links() + (W - links()) / 2;
        const cy = H * 0.42;
        const basis = H * 0.3; // Kugelradius in px ohne Zoom
        const zoom = (tiefe: number) => 1 + f * f * (5 + tiefe * 6);
        const welt = (x: number, y: number, tiefe: number) => [cx + x * basis * zoom(tiefe), cy - y * basis * zoom(tiefe)];
        // Sockel
        const [, sy] = welt(0, -0.8, 0);
        const s0 = zoom(0);
        k.fillStyle = '#6a2412';
        k.beginPath();
        k.moveTo(cx - basis * 0.72 * s0, sy);
        k.lineTo(cx + basis * 0.72 * s0, sy);
        k.lineTo(cx + basis * 0.98 * s0, sy + basis * 0.75 * s0);
        k.lineTo(cx - basis * 0.98 * s0, sy + basis * 0.75 * s0);
        k.fill();
        k.fillStyle = '#d8a845';
        k.fillRect(cx - basis * 0.75 * s0, sy - basis * 0.06 * s0, basis * 1.5 * s0, basis * 0.08 * s0);
        // Kugel mit Inhalt
        k.save();
        k.beginPath();
        k.arc(cx, cy, basis * s0, 0, Math.PI * 2);
        k.clip();
        const g = k.createLinearGradient(0, cy - basis * s0, 0, cy + basis * s0);
        g.addColorStop(0, '#0d1036');
        g.addColorStop(1, '#3a4594');
        k.fillStyle = g;
        k.fillRect(0, 0, W, H);
        k.fillStyle = '#c9d4f5';
        const [, by] = welt(0, BODEN, 0.3);
        k.fillRect(0, by, W, H);
        const bild = (img: HTMLCanvasElement, x: number, z: number, w: number, h: number) => {
          const tiefe = (z + 0.6) / 1.2;
          const [px, py] = welt(x - w / 2, BODEN + h, tiefe);
          k.drawImage(img, px, py, w * basis * zoom(tiefe), h * basis * zoom(tiefe));
        };
        TANNEN.klein.concat(TANNEN.mittel).forEach(([x, z, h]) => bild(tanne, x, z, h * 0.667, h));
        bild(haus, 0, 0, 1, 0.75);
        k.globalCompositeOperation = 'lighter';
        lichterZeichnen(lk, zeit);
        bild(licht, 0, 0.03, 1.9, 0.9);
        k.globalCompositeOperation = 'source-over';
        TANNEN.gross.forEach(([x, z, h]) => bild(tanne, x, z, h * 0.667, h));
        k.restore();
        k.fillStyle = `rgba(3,5,20,${glatt(0.85, 1, f) * 0.5})`;
        k.fillRect(0, 0, W, H);
      };
    }

    // ---------- Schleife ----------
    let rahmen = 0;
    let vorher = 0;
    let gemeldet = -1;
    function schleife(ms: number) {
      const dt = vorher ? Math.min(0.05, (ms - vorher) / 1000) : 0.016;
      vorher = ms;
      // Einrasten nach 450 ms ohne Eingabe
      if (!offen && letzteEingabe && performance.now() - letzteEingabe > 450 && ziel > 0 && ziel < 1) {
        ziel = richtung > 0 ? (ziel >= 0.3 ? 1 : 0) : ziel >= 0.7 ? 1 : 0;
      }
      anzeige += (ziel - anzeige) * Math.min(1, dt * 5.5);
      if (Math.abs(ziel - anzeige) < 0.0005) anzeige = ziel;
      schuettel *= Math.exp(-dt * 1.6);
      maus.gx += (maus.x - maus.gx) * Math.min(1, dt * 2);
      maus.gy += (maus.y - maus.gy) * Math.min(1, dt * 2);
      if (!offen && anzeige >= 0.999 && ziel === 1) {
        offen = true;
        html.dataset.kugel = 'offen';
      }
      const sicht = glatt(0.8, 1, anzeige);
      html.style.setProperty('--kugel-sicht', sicht.toFixed(3));
      cv.style.filter = `blur(${(glatt(0.85, 1, anzeige) * 5).toFixed(2)}px)`;
      if (Math.abs(anzeige - gemeldet) > 0.01) {
        gemeldet = anzeige;
        setFortschritt(anzeige);
      }
      if (warten && warten()) warten = null;
      if (!document.hidden) zeichne(ms / 1000, anzeige);
      rahmen = requestAnimationFrame(schleife);
    }
    rahmen = requestAnimationFrame(schleife);

    return () => {
      cancelAnimationFrame(rahmen);
      zoomeRein.current = () => {};
      removeEventListener('wheel', rad);
      removeEventListener('touchstart', touchStart);
      removeEventListener('touchmove', touchMove);
      removeEventListener('keydown', taste);
      removeEventListener('pointermove', zeiger);
      aufraeumen();
      delete html.dataset.kugel;
      html.style.removeProperty('--kugel-sicht');
    };
  }, [reduziert]);

  if (reduziert) return null; // Kalender erscheint direkt

  return (
    <div className="kugel">
      <canvas ref={canvasRef} aria-hidden="true" onClick={() => zoomeRein.current()} />
      <button
        className="kugel-hinweis"
        style={{ opacity: 1 - glatt(0.02, 0.15, fortschritt), pointerEvents: fortschritt > 0.1 ? 'none' : 'auto' }}
        onClick={() => zoomeRein.current()}
      >
        Scrolle, um in die Schneekugel zu zoomen
        <span aria-hidden="true">⌄</span>
      </button>
    </div>
  );
}
