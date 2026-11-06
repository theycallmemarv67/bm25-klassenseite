'use client';

import { useEffect, useRef, useState } from 'react';

// Winter-Tal vor dem Quiz (Reiter "Quiz").
// Scrollen, Wischen, Pfeiltasten/Leertaste oder Klick bewegen die Kamera einen geschwungenen Weg entlang
// durch ein nächtliches Tal voller leuchtender Winterblumen. Am Ende lösen sich die Blüten in Lichtpunkte auf
// und das Quiz blendet ein. Ganz oben im Quiz weiter nach oben scrollen fliegt zurück ins Tal.
// Rendering: WebGL2 (Punkt-Sprites, instanzierte Linien, Gelände-Gitter) in ein Framebuffer-Objekt,
// danach Nachbearbeitung (Bloom, Mondstrahlen, RGB-Versatz, Vignette, Filmkorn). Alles eigener Code.
// Ohne WebGL2 oder bei reduzierter Bewegung erscheint das Quiz direkt.

const L = 300; // Länge des Flugwegs in Metern
const K = L / 110; // Mengen-Faktor (Blumen, Bäume, Sträucher)
const FOV = (58 * Math.PI) / 180;

type V3 = [number, number, number];

// ---------- Weg und Gelände: identisch in JS (Platzierung, Kamera) und im Shader ----------
const pfadX = (z: number) => 7 * Math.sin(z * 0.021) + 3 * Math.sin(z * 0.057 + 1.3);
function hoehe(x: number, z: number) {
  const d = x - pfadX(z);
  const du = 0.55 * Math.sin(x * 0.21 + z * 0.09) + 0.35 * Math.sin(z * 0.17 - x * 0.11 + 2.0) + 0.25 * Math.sin((x + z) * 0.31);
  const t = Math.max(Math.abs(d) - 9, 0);
  return du + 7 * (1 - Math.exp(-t * 0.12)) + t * 0.08 - 0.35 * Math.exp(-d * d * 0.08);
}

const GEMEINSAM = `
const vec3 NEBEL = vec3(0.022, 0.035, 0.09);
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float rausch(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}
float pfadX(float z){ return 7.0*sin(z*0.021) + 3.0*sin(z*0.057 + 1.3); }
float hoehe(float x, float z){
  float d = x - pfadX(z);
  float du = 0.55*sin(x*0.21 + z*0.09) + 0.35*sin(z*0.17 - x*0.11 + 2.0) + 0.25*sin((x + z)*0.31);
  float t = max(abs(d) - 9.0, 0.0);
  return du + 7.0*(1.0 - exp(-t*0.12)) + t*0.08 - 0.35*exp(-d*d*0.08);
}
vec3 wind(vec3 p, float t){ return vec3(sin(t*1.3 + p.x*0.4 + p.z*0.3), 0.0, cos(t*1.1 + p.z*0.5 + p.x*0.2)) * 0.06; }
`;
const KOPF = `#version 300 es
precision highp float;
${GEMEINSAM}`;

// Vollbild-Dreieck ohne Attribute
const VS_VOLL = `#version 300 es
void main(){ vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2); gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;

// ---------- Himmel: Nacht, Mond mit Hof, Sterne ----------
const FS_HIMMEL = `${KOPF}
uniform vec3 uR, uU, uF, uMond;
uniform float uTan, uAspekt, uVersatz, uZeit;
uniform vec2 uAufl;
out vec4 o;
void main(){
  vec2 n = gl_FragCoord.xy / uAufl * 2.0 - 1.0;
  n.x -= uVersatz;
  vec3 d = normalize(uF + uR * n.x * uTan * uAspekt + uU * n.y * uTan);
  vec3 c = mix(NEBEL * 1.15, vec3(0.003, 0.006, 0.025), smoothstep(-0.05, 0.55, d.y));
  c += vec3(0.07, 0.04, 0.1) * exp(-max(d.y, 0.0) * 8.0) * 0.7;
  vec2 sp = vec2(atan(d.z, d.x), asin(clamp(d.y, -1.0, 1.0))) * 70.0;
  float st = hash(floor(sp));
  c += vec3(0.85, 0.9, 1.0) * step(0.982, st) * smoothstep(0.3, 0.0, length(fract(sp) - 0.5))
     * (0.55 + 0.45 * sin(uZeit * 1.7 + st * 60.0)) * smoothstep(0.02, 0.2, d.y);
  float m = dot(d, uMond);
  c += vec3(0.25, 0.32, 0.6) * pow(max(m, 0.0), 260.0) * 0.9 + vec3(0.12, 0.15, 0.3) * pow(max(m, 0.0), 18.0) * 0.35;
  float scheibe = smoothstep(0.99935, 0.99952, m);
  float krater = rausch(d.xy * 260.0) * 0.18 + rausch(d.xy * 90.0) * 0.12;
  c = mix(c, vec3(1.0, 0.97, 0.88) * (1.7 - krater), scheibe);
  o = vec4(c, 1.0);
}`;

// ---------- Gelände ----------
const VS_GELAENDE = `${KOPF}
layout(location = 0) in vec2 aXZ;
uniform mat4 uVP;
out vec3 vW;
void main(){ vW = vec3(aXZ.x, hoehe(aXZ.x, aXZ.y), aXZ.y); gl_Position = uVP * vec4(vW, 1.0); }`;
const FS_GELAENDE = `${KOPF}
in vec3 vW;
uniform vec3 uKamera, uMond;
uniform float uZeit;
out vec4 o;
void main(){
  float e = 0.25;
  float h = hoehe(vW.x, vW.z);
  vec3 n = normalize(vec3(h - hoehe(vW.x + e, vW.z), e, h - hoehe(vW.x, vW.z + e)));
  float dif = max(dot(n, uMond), 0.0);
  float k = rausch(vW.xz * 6.0) * 0.6 + rausch(vW.xz * 23.0) * 0.4;
  vec3 c = vec3(0.035, 0.05, 0.11) + vec3(0.3, 0.34, 0.5) * dif * 0.6;
  c *= 0.8 + 0.32 * k;
  vec2 g = vW.xz * 9.0;
  float hz = hash(floor(g));
  float dist = distance(vW, uKamera);
  float funkel = step(0.986, hz) * smoothstep(0.3, 0.0, length(fract(g) - 0.5)) * (0.5 + 0.5 * sin(uZeit * 3.0 + hz * 90.0 + uKamera.z * 0.7));
  c += vec3(0.8, 0.85, 1.0) * funkel * smoothstep(22.0, 4.0, dist);
  o = vec4(mix(c, NEBEL, 1.0 - exp(-dist * 0.024)), 1.0);
}`;

// ---------- Linien: Gras, Äste, Rosenstiele (instanziert, 2 Ecken) ----------
const VS_STRICH = `${KOPF}
layout(location = 0) in vec3 aA;
layout(location = 1) in vec3 aB;
layout(location = 2) in float aEcke;
layout(location = 3) in vec4 aFarbe;
uniform mat4 uVP;
uniform vec3 uKamera;
uniform float uZeit;
out vec3 vF;
out float vNebel;
void main(){
  vec3 p = aEcke < 0.5 ? aA : aB + wind(aB, uZeit) * aFarbe.a;
  gl_Position = uVP * vec4(p, 1.0);
  vF = aFarbe.rgb;
  vNebel = 1.0 - exp(-distance(p, uKamera) * 0.024);
}`;
const FS_STRICH = `${KOPF}
in vec3 vF;
in float vNebel;
uniform float uAuf;
out vec4 o;
void main(){ o = vec4(mix(vF, NEBEL, vNebel), 1.0 - uAuf); }`;

// ---------- Blumen-Kopf: Position, Wachsen, Wind, Maus, Auflösen (für Blüten und Stiele) ----------
const BLUME_VS = `${KOPF}
layout(location = 0) in vec3 aBasis;
layout(location = 1) in vec4 aInfo; // Typ, Stängelhöhe, Größe, Zufall
uniform mat4 uVP;
uniform vec3 uKamera;
uniform vec2 uAufl, uMaus;
uniform float uZeit, uFokus, uAuf, uDpr;
float gNaehe = 0.0, gDist = 1.0, gWachs = 1.0;
vec4 kopfClip(){
  float typ = aInfo.x;
  gDist = distance(aBasis, uKamera);
  gWachs = typ > 4.5 ? 1.0 : mix(0.3, 1.0, smoothstep(45.0, 8.0, gDist));
  vec3 k = aBasis + vec3(0.0, aInfo.y * gWachs, 0.0);
  if (typ > 4.5) k.y += aInfo.z * 0.22;
  k += wind(k, uZeit) * aInfo.y * 2.5 * gWachs;
  vec4 c = uVP * vec4(k, 1.0);
  if (c.w < 0.05) return vec4(2.0, 2.0, 2.0, 1.0);
  vec2 s = (c.xy / c.w * 0.5 + 0.5) * uAufl;
  vec2 dm = s - uMaus;
  float lm = length(dm);
  float R = 130.0 * uDpr;
  gNaehe = clamp(1.0 - lm / R, 0.0, 1.0);
  s += dm / max(lm, 0.001) * gNaehe * gNaehe * R * 0.5;
  s += (s - uAufl * 0.5) * uAuf * uAuf * (0.8 + fract(aInfo.w * 13.7) * 2.5);
  c.xy = (s / uAufl * 2.0 - 1.0) * c.w;
  return c;
}`;

const VS_STIEL = `${BLUME_VS}
layout(location = 2) in float aEcke;
out float vNebel;
void main(){
  if (aInfo.x > 1.5 || aInfo.y <= 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vNebel = 0.0; return; }
  if (aEcke < 0.5) { gl_Position = uVP * vec4(aBasis, 1.0); gDist = distance(aBasis, uKamera); }
  else gl_Position = kopfClip();
  vNebel = 1.0 - exp(-gDist * 0.024);
}`;
const FS_STIEL = `${KOPF}
in float vNebel;
uniform float uAuf;
out vec4 o;
void main(){ o = vec4(mix(vec3(0.07, 0.22, 0.09), NEBEL, vNebel), 1.0 - uAuf); }`;

const VS_BLUETE = `${BLUME_VS}
uniform float uMaxPx, uHalo;
out float vTyp, vSeed, vNebel, vLeucht, vKlein, vNah;
void main(){
  vec4 c = kopfClip();
  float typ = aInfo.x;
  float px = aInfo.z * gWachs * uFokus / max(c.w, 0.05);
  px = mix(px, 3.0 * uDpr, uAuf);
  if (uHalo > 0.5) { if (typ > 4.5) c = vec4(2.0, 2.0, 2.0, 1.0); px *= 2.6; }
  vKlein = clamp(px / (2.5 * uDpr), 0.0, 1.0);
  gl_PointSize = clamp(px, 1.0, uMaxPx);
  gl_Position = c;
  vTyp = typ;
  vSeed = aInfo.w;
  vNebel = 1.0 - exp(-gDist * 0.024);
  vLeucht = 1.0 + gNaehe * 0.9;
  vNah = smoothstep(50.0, 10.0, gDist);
}`;

const FS_BLUETE = `${KOPF}
in float vTyp, vSeed, vNebel, vLeucht, vKlein, vNah;
uniform float uAuf, uHalo;
out vec4 o;
vec3 farbe(float t){
  return t < 0.5 ? vec3(0.88, 0.95, 1.0) : t < 1.5 ? vec3(0.45, 0.6, 1.0) : t < 2.5 ? vec3(1.0, 0.48, 0.74)
       : t < 3.5 ? vec3(1.0, 0.95, 0.85) : t < 4.5 ? vec3(1.0, 0.16, 0.26) : vec3(0.55, 0.6, 0.78);
}
// Blütenform im Sprite (q: -1..1, y nach oben); Rückgabe Farbe und Deckkraft
vec4 bluete(vec2 q, float typ, float seed){
  float r = length(q);
  if (typ > 5.5) { // Schneeklumpen auf Ästen
    float a = smoothstep(0.8, 0.6, r + (rausch(q * 4.0 + seed * 9.0) - 0.5) * 0.3);
    return vec4(vec3(0.5, 0.55, 0.72) * (0.8 + 0.3 * q.y), a);
  }
  if (typ > 4.5) { // Schneehaufen: flache Kuppe, vom Mond links oben beschienen
    float kuppe = 0.3 - 0.65 * q.x * q.x;
    float a = smoothstep(0.04, -0.02, q.y - kuppe) * step(-0.35, q.y);
    vec3 c = mix(vec3(0.05, 0.07, 0.16), vec3(0.26, 0.3, 0.44), clamp(smoothstep(-0.35, 0.3, q.y) - q.x * 0.25, 0.0, 1.0));
    c *= 0.85 + 0.3 * rausch(q * 14.0 + seed * 20.0);
    return vec4(c, a);
  }
  float w = seed * 6.2832;
  vec2 pr = mat2(cos(w), -sin(w), sin(w), cos(w)) * q;
  float a = atan(pr.y, pr.x);
  float R;
  vec3 c;
  if (typ < 0.5) { // Schneeglöckchen: 6 Blätter, grünes Herz
    R = 0.3 + 0.62 * pow(abs(cos(a * 3.0)), 1.5);
    c = mix(vec3(0.7, 0.8, 0.95), vec3(1.0), smoothstep(0.1, R, r) * 0.6 + 0.4);
    c = mix(c, vec3(0.35, 0.85, 0.3), smoothstep(0.2, 0.12, r));
  } else if (typ < 1.5) { // Blaustern: schmale Blätter, dunkles Zentrum
    R = 0.18 + 0.78 * pow(abs(cos(a * 3.0)), 4.0);
    c = mix(vec3(0.35, 0.5, 1.0), vec3(0.7, 0.82, 1.0), r) * 1.15;
    c = mix(c, vec3(0.04, 0.05, 0.22), smoothstep(0.18, 0.1, r));
  } else if (typ < 2.5) { // Kirschblüte: 5 Blätter mit Kerbe
    float k = abs(cos(a * 2.5));
    R = 0.35 + 0.6 * pow(k, 0.7) - 0.2 * pow(k, 30.0);
    c = mix(vec3(1.0, 0.42, 0.68), vec3(1.0, 0.8, 0.9), r);
    c = mix(c, vec3(0.75, 0.15, 0.4), smoothstep(0.2, 0.08, r));
  } else if (typ < 3.5) { // Pflaumenblüte: 5 runde Blätter, gelbe Staubfäden
    R = 0.45 + 0.5 * pow(abs(cos(a * 2.5)), 0.5);
    c = vec3(0.95, 0.96, 1.0) * (0.82 + 0.18 * r);
    float sek = atan(q.y, q.x) / 6.2832 * 12.0;
    float sid = (floor(sek) + 0.5) / 12.0 * 6.2832;
    float kopf = smoothstep(0.08, 0.04, length(q - vec2(cos(sid), sin(sid)) * 0.34));
    float faden = step(r, 0.34) * smoothstep(0.08, 0.02, abs(fract(sek) - 0.5));
    c = mix(c, vec3(1.0, 0.82, 0.2), max(max(kopf, faden * 0.7), smoothstep(0.13, 0.07, r)));
  } else { // Rose: Spiralblüte
    R = 0.8 + 0.06 * sin(a * 5.0);
    float spirale = smoothstep(0.55, 1.0, sin(a * 2.0 - log(r + 0.03) * 9.0));
    c = mix(vec3(0.95, 0.1, 0.18), vec3(0.35, 0.01, 0.05), spirale * 0.8) * (0.65 + 0.5 * r);
  }
  float form = smoothstep(R, R - 0.07, r);
  // Schneehaube auf der Oberseite: verrauschter Rand, je Blüte unterschiedlich dick
  float dicke = 0.15 + fract(seed * 7.31) * 0.35;
  float grenze = 0.85 - dicke * 1.4 + (rausch(vec2(q.x * 4.0 + seed * 31.0, seed * 7.0)) - 0.5) * 0.3;
  float haube = smoothstep(grenze, grenze + 0.06, q.y) * smoothstep(R + 0.08, R, r);
  vec3 schnee = vec3(0.78, 0.84, 0.98) * (0.8 + 0.25 * rausch(q * 12.0 + seed * 5.0));
  schnee *= mix(0.7, 1.0, smoothstep(grenze, grenze + 0.25, q.y));
  c = mix(c, schnee, haube);
  return vec4(c, max(form, haube));
}
void main(){
  vec2 q = vec2(gl_PointCoord.x * 2.0 - 1.0, 1.0 - gl_PointCoord.y * 2.0);
  if (uHalo > 0.5) {
    float r2 = dot(q, q);
    float a = exp(-r2 * 5.0) * (1.0 - smoothstep(0.8, 1.0, r2));
    o = vec4(farbe(vTyp) * a * 0.11 * vNah * vLeucht * (1.0 - vNebel) * (1.0 - uAuf * 0.6), 1.0);
    return;
  }
  vec4 b = bluete(q, vTyp, vSeed);
  b = mix(b, vec4(farbe(vTyp) * 1.3, smoothstep(1.0, 0.2, length(q))), uAuf); // wird zum Lichtpunkt
  if (hash(gl_FragCoord.xy + vSeed * 100.0) < uAuf * uAuf * 0.85) discard; // Dither-Ausblendung
  if (b.a < 0.3) discard;
  vec3 c = b.rgb * (vTyp > 4.5 ? 1.0 : 0.95 * vLeucht);
  c = mix(c, NEBEL, vNebel * 0.92);
  o = vec4(c, vKlein * smoothstep(0.3, 0.6, b.a));
}`;

// ---------- Schneefall und schwebender Staub (um die Kamera wiederholt) ----------
const VS_FLOCKE = `${KOPF}
layout(location = 0) in vec4 aZ;
uniform mat4 uVP;
uniform vec3 uKamera;
uniform float uZeit, uFokus, uDpr, uStaub;
out float vA;
void main(){
  bool staub = uStaub > 0.5;
  vec3 box = staub ? vec3(30.0, 8.0, 30.0) : vec3(36.0, 18.0, 36.0);
  vec3 p = aZ.xyz * box;
  if (staub) p += vec3(sin(uZeit * 0.21 + aZ.w * 40.0) * 1.5, uZeit * 0.15 * (0.5 + aZ.w) + sin(uZeit * 0.5 + aZ.w * 9.0) * 0.5, cos(uZeit * 0.17 + aZ.w * 30.0) * 1.5);
  else p += vec3(sin(uZeit * 0.4 + aZ.w * 20.0) * 0.8 + uZeit * 0.3, -uZeit * (0.7 + aZ.w * 0.6), 0.0);
  vec3 mitte = uKamera - vec3(0.0, staub ? 1.0 : 0.0, 0.0);
  p = mod(p - mitte + box * 0.5, box) + mitte - box * 0.5;
  vec4 c = uVP * vec4(p, 1.0);
  float d = max(c.w, 0.05);
  gl_PointSize = clamp((staub ? 0.05 : 0.04) * uFokus / d, 1.0, 8.0 * uDpr);
  gl_Position = c;
  vA = smoothstep(box.x * 0.5, box.x * 0.3, distance(p, uKamera)) * smoothstep(0.3, 1.0, d);
  if (staub) vA *= 0.5 + 0.5 * sin(uZeit * 2.0 + aZ.w * 50.0);
}`;
const FS_FLOCKE = `${KOPF}
in float vA;
uniform float uStaub;
out vec4 o;
void main(){
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float a = smoothstep(1.0, 0.1, r) * vA;
  if (uStaub > 0.5) o = vec4(vec3(1.0, 0.82, 0.55) * a * 0.55, 1.0);
  else o = vec4(vec3(0.8, 0.85, 1.0) * 0.75, a * 0.8);
}`;

// ---------- Nachbearbeitung ----------
const FS_HELL = `${KOPF}
uniform sampler2D uT;
uniform vec2 uAufl, uTexel;
out vec4 o;
void main(){
  vec2 uv = gl_FragCoord.xy / uAufl;
  vec3 c = (texture(uT, uv + uTexel * vec2(-1.0, -1.0)).rgb + texture(uT, uv + uTexel * vec2(1.0, -1.0)).rgb
          + texture(uT, uv + uTexel * vec2(-1.0, 1.0)).rgb + texture(uT, uv + uTexel * vec2(1.0, 1.0)).rgb) * 0.25;
  float l = dot(c, vec3(0.3, 0.59, 0.11));
  o = vec4(c * smoothstep(0.55, 1.2, l), 1.0);
}`;
const FS_WEICH = `${KOPF}
uniform sampler2D uT;
uniform vec2 uAufl, uRichtung;
out vec4 o;
void main(){
  vec2 uv = gl_FragCoord.xy / uAufl;
  vec3 c = texture(uT, uv).rgb * 0.227;
  c += (texture(uT, uv + uRichtung * 1.385).rgb + texture(uT, uv - uRichtung * 1.385).rgb) * 0.316;
  c += (texture(uT, uv + uRichtung * 3.231).rgb + texture(uT, uv - uRichtung * 3.231).rgb) * 0.07;
  o = vec4(c, 1.0);
}`;
const FS_STRAHLEN = `${KOPF}
uniform sampler2D uT;
uniform vec2 uAufl, uMondUV;
uniform float uMondSicht;
out vec4 o;
void main(){
  vec2 uv = gl_FragCoord.xy / uAufl;
  vec2 schritt = (uMondUV - uv) / 40.0 * 0.92;
  vec3 s = vec3(0.0);
  float gew = 1.0;
  for (int i = 0; i < 40; i++) { s += texture(uT, uv).rgb * gew; gew *= 0.955; uv += schritt; }
  o = vec4(s / 40.0 * uMondSicht * vec3(0.8, 0.88, 1.0), 1.0);
}`;
const FS_ENDE = `${KOPF}
uniform sampler2D uSzene, uBloom, uStrahlen;
uniform vec2 uAufl;
uniform float uTempo, uZeit;
out vec4 o;
void main(){
  vec2 uv = gl_FragCoord.xy / uAufl;
  vec2 d = uv - 0.5;
  float k = (0.002 + 0.014 * uTempo) * dot(d, d) * 4.0; // RGB-Versatz am Rand, stärker beim Fliegen
  vec3 c = vec3(texture(uSzene, uv + d * k).r, texture(uSzene, uv).g, texture(uSzene, uv - d * k).b);
  c += texture(uBloom, uv).rgb * 0.5 + texture(uStrahlen, uv).rgb * 0.5;
  c = 1.0 - exp(-c * 1.15);
  c *= clamp(1.0 - dot(d, d) * (1.3 + 2.2 * uTempo), 0.0, 1.0); // Vignette zieht sich bei Tempo zu
  c += (hash(gl_FragCoord.xy + fract(uZeit * 7.0) * 311.0) - 0.5) * 0.035; // Filmkorn
  o = vec4(c, 1.0);
}`;

// ---------- Zufall mit festem Seed ----------
function zufall(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const norm = (v: V3): V3 => {
  const l = Math.hypot(...v) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const kreuz = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const punktprodukt = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const MOND = norm([-0.35, 0.3, -1]);

// Blumen (je 7 Werte: x, y, z, Typ, Stängelhöhe, Größe, Zufall) und Linien (je 10: a, b, Farbe, Wiegen)
// Typen: 0 Schneeglöckchen, 1 Blaustern, 2 Kirschblüte, 3 Pflaumenblüte, 4 Rose, 5 Schneehaufen, 6 Schneeklumpen
export function talBauen() {
  const r = zufall(25);
  const B: number[] = [];
  const S: number[] = [];
  const punkt = (s: number, d: number): V3 => {
    const z = 10 - s;
    const x = pfadX(z) + d;
    return [x, hoehe(x, z), z];
  };
  const seite = (min: number, weite: number) => (r() < 0.5 ? -1 : 1) * (min + r() * weite);
  const blume = (p: V3, typ: number, h: number, g: number) => B.push(p[0], p[1], p[2], typ, h, g, r());
  const strich = (a: V3, b: V3, f: V3, w: number) => S.push(...a, ...b, ...f, w);
  const gruppe = (s: number, d: number, n: number, streu: number, f: (p: V3) => void) => {
    for (let i = 0; i < n; i++) {
      const a = r() * 6.2832;
      const rad = Math.sqrt(r()) * streu;
      const dd = d + Math.cos(a) * rad;
      if (Math.abs(dd) > 1.1) f(punkt(s + Math.sin(a) * rad, dd));
    }
  };

  // Schneeglöckchen am Anfang und bei 70 Prozent, in Grüppchen
  for (let i = 0; i < 110 * K; i++) {
    const s = (r() < 0.5 ? r() * 0.2 : 0.62 + r() * 0.16) * L;
    gruppe(s, seite(1.2, 8), 5 + Math.floor(r() * 6), 0.7, (p) => blume(p, 0, 0.18 + r() * 0.12, 0.15 + r() * 0.05));
  }
  // Blausterne-Teppich in der Mitte
  for (let i = 0; i < 1500 * K; i++) {
    const s = (0.3 + r() * 0.3) * L;
    blume(punkt(s, seite(1.2, 9)), 1, 0.08 + r() * 0.07, 0.12 + r() * 0.04);
  }
  // vereinzelte Blumen überall
  for (let i = 0; i < 500 * K; i++) {
    blume(punkt(r() * L, seite(1.2, 10)), r() < 0.5 ? 0 : 1, 0.1 + r() * 0.15, 0.1 + r() * 0.04);
  }

  // Bäume mit verschneiten Ästen, Blüten an den Zweigen
  const baum = (fuss: V3, typ: number) => {
    const ast = (a: V3, dir: V3, len: number, tiefe: number) => {
      const b: V3 = [a[0] + dir[0] * len, a[1] + dir[1] * len, a[2] + dir[2] * len];
      strich(a, b, [0.07, 0.05, 0.045], 0);
      if (dir[1] < 0.8) strich([a[0], a[1] + 0.035, a[2]], [b[0], b[1] + 0.035, b[2]], [0.5, 0.55, 0.7], 0);
      if (tiefe === 0) {
        for (let i = 0; i < 6; i++) {
          const t = 0.25 + r() * 0.75;
          const j = () => (r() - 0.5) * 0.14;
          blume([a[0] + (b[0] - a[0]) * t + j(), a[1] + (b[1] - a[1]) * t + j(), a[2] + (b[2] - a[2]) * t + j()], typ, 0, typ === 2 ? 0.16 : 0.14);
        }
        return;
      }
      if (r() < 0.3) blume(b, 6, 0, 0.12 + r() * 0.1);
      const n = 2 + (r() < 0.4 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        ast(b, norm([dir[0] + (r() - 0.5) * 1.4, dir[1] + 0.25 + (r() - 0.5) * 0.4, dir[2] + (r() - 0.5) * 1.4]), len * 0.72, tiefe - 1);
      }
    };
    ast(fuss, [0, 1, 0], 1.0 + r() * 0.8, 3);
    blume([fuss[0], fuss[1] - 0.15, fuss[2]], 5, 0, 1.3);
  };
  for (let i = 0; i < 18 * K; i++) baum(punkt(r() * 0.97 * L, seite(4.5, 8)), i % 9 < 5 ? 2 : 3);

  // Rosensträucher
  const strauch = (fuss: V3) => {
    for (let j = 0; j < 6; j++) {
      const dx = (r() - 0.5) * 0.8;
      const dz = (r() - 0.5) * 0.8;
      const a: V3 = [fuss[0] + dx * 0.4, fuss[1], fuss[2] + dz * 0.4];
      const m: V3 = [a[0] + dx * 0.3, a[1] + 0.35, a[2] + dz * 0.3];
      const t: V3 = [m[0] + dx * 0.3, m[1] + 0.3 + r() * 0.3, m[2] + dz * 0.3];
      strich(a, m, [0.04, 0.11, 0.05], 0);
      strich(m, t, [0.04, 0.11, 0.05], 0);
      blume(t, 4, 0, 0.17 + r() * 0.05);
    }
  };
  for (let i = 0; i < 12 * K; i++) strauch(punkt(r() * L, seite(2, 6)));

  // Gras in Büscheln
  for (let i = 0; i < 625 * K; i++) {
    const fuss = punkt(r() * (L + 20), seite(0.8, 11));
    for (let j = 0; j < 4; j++) {
      const a: V3 = [fuss[0] + (r() - 0.5) * 0.2, fuss[1] - 0.02, fuss[2] + (r() - 0.5) * 0.2];
      strich(a, [a[0] + (r() - 0.5) * 0.15, a[1] + 0.15 + r() * 0.3, a[2] + (r() - 0.5) * 0.15], [0.05 + r() * 0.04, 0.16 + r() * 0.12, 0.06], 1);
    }
  }
  // Schneehaufen
  for (let i = 0; i < 120 * K; i++) {
    const p = punkt(r() * (L + 20), seite(2, 10));
    blume([p[0], p[1] - 0.12, p[2]], 5, 0, 0.5 + r() * 0.8);
  }

  // dichte Blüteninsel am Wegende
  const insel = L + 10;
  for (let i = 0; i < 1800; i++) {
    const a = r() * 6.2832;
    const rad = 0.8 + Math.sqrt(r()) * 7;
    const typ = [0, 1, 1, 0, 4][Math.floor(r() * 5)];
    blume(punkt(insel + Math.sin(a) * rad, Math.cos(a) * rad), typ, typ === 4 ? 0.25 : 0.15 + r() * 0.25, 0.13 + r() * 0.04);
  }
  for (const [ds, d, typ] of [[-3, -5, 2], [2, 5.5, 3], [6, -4, 3], [7, 4, 2]]) baum(punkt(insel + ds, d), typ);

  return { blumen: new Float32Array(B), striche: new Float32Array(S) };
}

// ---------- Matrizen (spaltenweise wie in WebGL) ----------
function perspektive(asp: number, versatz: number) {
  const t = 1 / Math.tan(FOV / 2);
  const n = 0.1;
  const f = 260;
  return [t / asp, 0, 0, 0, 0, t, 0, 0, -versatz, 0, (f + n) / (n - f), -1, 0, 0, (2 * f * n) / (n - f), 0];
}
function mal(a: number[], b: number[]) {
  const o = new Array<number>(16).fill(0);
  for (let c = 0; c < 4; c++) for (let z = 0; z < 4; z++) for (let k = 0; k < 4; k++) o[c * 4 + z] += a[k * 4 + z] * b[c * 4 + k];
  return o;
}

const glatt = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export default function Tal() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fortschritt, setFortschritt] = useState(0);
  const [bewegt, setBewegt] = useState(false);
  const [aus, setAus] = useState(() => typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const fliegeDurch = useRef(() => {});

  useEffect(() => {
    if (aus) return;
    const cv = canvasRef.current!;
    const kontext = cv.getContext('webgl2', { antialias: false, alpha: false, depth: false });
    if (!kontext) {
      setAus(true); // Quiz erscheint direkt
      return;
    }
    const gl: WebGL2RenderingContext = kontext;
    const html = document.documentElement;
    html.dataset.tal = 'zu';
    html.style.setProperty('--tal-sicht', '0');

    // ---------- Eingabe ----------
    let ziel = 0;
    let anzeige = 0;
    let offen = false;
    let letzteEingabe = performance.now();
    let richtung = 1;
    let tempo = 0;
    const maus = { x: 0, y: 0, gx: 0, gy: 0, px: -1e4, py: -1e4 };

    function eingabe(delta: number) {
      if (offen) {
        if (delta >= 0 || scrollY > 0) return false;
        offen = false; // ganz oben weiter nach oben: zurück ins Tal
        html.dataset.tal = 'zu';
      }
      ziel = Math.min(1, Math.max(0, ziel + delta));
      richtung = Math.sign(delta) || richtung;
      letzteEingabe = performance.now();
      setBewegt(true);
      return true;
    }
    fliegeDurch.current = () => {
      ziel = 1;
      richtung = 1;
      letzteEingabe = performance.now();
      setBewegt(true);
    };
    const rad = (e: WheelEvent) => {
      if (eingabe(e.deltaY * (e.deltaMode === 1 ? 0.0125 : 0.00038))) e.preventDefault();
    };
    let touchY: number | null = null;
    const touchStart = (e: TouchEvent) => {
      touchY = e.touches[0].clientY;
    };
    const touchMove = (e: TouchEvent) => {
      if (touchY === null) return;
      const y = e.touches[0].clientY;
      if (eingabe((touchY - y) * 0.0013)) e.preventDefault();
      touchY = y;
    };
    const taste = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.('input, select, textarea, button')) return;
      const vor = ['ArrowDown', 'PageDown', ' '].includes(e.key);
      const zurueck = ['ArrowUp', 'PageUp'].includes(e.key);
      if ((vor || zurueck) && eingabe(vor ? 0.07 : -0.07)) e.preventDefault();
    };
    const zeiger = (e: PointerEvent) => {
      maus.x = (e.clientX / innerWidth) * 2 - 1;
      maus.y = (e.clientY / innerHeight) * 2 - 1;
      // Maus-Abstoßen nur mit echter Maus, nicht beim Wischen
      if (e.pointerType === 'mouse') {
        maus.px = e.clientX;
        maus.py = e.clientY;
      }
    };
    const weg = () => {
      maus.px = maus.py = -1e4;
    };
    addEventListener('wheel', rad, { passive: false });
    addEventListener('touchstart', touchStart, { passive: true });
    addEventListener('touchmove', touchMove, { passive: false });
    addEventListener('keydown', taste);
    addEventListener('pointermove', zeiger, { passive: true });
    document.addEventListener('pointerleave', weg);

    // ---------- Programme parallel kompilieren ----------
    const ext = gl.getExtension('KHR_parallel_shader_compile');
    const programm = (vs: string, fs: string) => {
      const p = gl.createProgram()!;
      for (const [typ, src] of [
        [gl.VERTEX_SHADER, vs],
        [gl.FRAGMENT_SHADER, fs],
      ] as const) {
        const s = gl.createShader(typ)!;
        gl.shaderSource(s, src);
        gl.compileShader(s);
        gl.attachShader(p, s);
      }
      gl.linkProgram(p);
      return p;
    };
    const P = {
      himmel: programm(VS_VOLL, FS_HIMMEL),
      gelaende: programm(VS_GELAENDE, FS_GELAENDE),
      strich: programm(VS_STRICH, FS_STRICH),
      stiel: programm(VS_STIEL, FS_STIEL),
      bluete: programm(VS_BLUETE, FS_BLUETE),
      flocke: programm(VS_FLOCKE, FS_FLOCKE),
      hell: programm(VS_VOLL, FS_HELL),
      weich: programm(VS_VOLL, FS_WEICH),
      strahlen: programm(VS_VOLL, FS_STRAHLEN),
      ende: programm(VS_VOLL, FS_ENDE),
    };
    const alle = Object.values(P);
    const ortCache = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>();
    const ort = (p: WebGLProgram, n: string) => {
      let m = ortCache.get(p);
      if (!m) ortCache.set(p, (m = new Map()));
      if (!m.has(n)) m.set(n, gl.getUniformLocation(p, n));
      return m.get(n)!;
    };
    // Uniforms setzen: Zahl, vec2, vec3 oder mat4 (16 Werte)
    const setze = (p: WebGLProgram, werte: Record<string, number | number[]>) => {
      for (const [n, v] of Object.entries(werte)) {
        const o = ort(p, n);
        if (typeof v === 'number') gl.uniform1f(o, v);
        else if (v.length === 2) gl.uniform2fv(o, v);
        else if (v.length === 3) gl.uniform3fv(o, v);
        else gl.uniformMatrix4fv(o, false, v);
      }
    };

    // ---------- Geometrie ----------
    const { blumen, striche } = talBauen();
    const nBlumen = blumen.length / 7;
    const nStriche = striche.length / 10;
    const puffer = (daten: BufferSource, typ: number = gl.ARRAY_BUFFER) => {
      const b = gl.createBuffer()!;
      gl.bindBuffer(typ, b);
      gl.bufferData(typ, daten, gl.STATIC_DRAW);
      return b;
    };
    const attr = (ort: number, groesse: number, schritt: number, versatz: number, teiler = 0) => {
      gl.enableVertexAttribArray(ort);
      gl.vertexAttribPointer(ort, groesse, gl.FLOAT, false, schritt, versatz);
      gl.vertexAttribDivisor(ort, teiler);
    };
    const vaos: WebGLVertexArrayObject[] = [];
    const vao = () => {
      const v = gl.createVertexArray()!;
      gl.bindVertexArray(v);
      vaos.push(v);
      return v;
    };

    // Gelände-Gitter (Höhe rechnet der Shader)
    const GX = 101;
    const GZ = Math.round(L + 120) + 1;
    const xz = new Float32Array(GX * GZ * 2);
    for (let j = 0; j < GZ; j++) for (let i = 0; i < GX; i++) xz.set([-55 + i * 1.1, 20 - j], (j * GX + i) * 2);
    const idx = new Uint32Array((GX - 1) * (GZ - 1) * 6);
    let k = 0;
    for (let j = 0; j < GZ - 1; j++)
      for (let i = 0; i < GX - 1; i++) {
        const a = j * GX + i;
        idx.set([a, a + GX, a + 1, a + 1, a + GX, a + GX + 1], k);
        k += 6;
      }
    const puffer1 = [puffer(xz), puffer(blumen), puffer(striche), puffer(new Float32Array([0, 1]))];
    const vGelaende = vao();
    gl.bindBuffer(gl.ARRAY_BUFFER, puffer1[0]);
    attr(0, 2, 8, 0);
    const pIdx = puffer(idx, gl.ELEMENT_ARRAY_BUFFER);

    const vBlueten = vao();
    gl.bindBuffer(gl.ARRAY_BUFFER, puffer1[1]);
    attr(0, 3, 28, 0);
    attr(1, 4, 28, 12);

    const vStiele = vao();
    gl.bindBuffer(gl.ARRAY_BUFFER, puffer1[1]);
    attr(0, 3, 28, 0, 1);
    attr(1, 4, 28, 12, 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, puffer1[3]);
    attr(2, 1, 4, 0);

    const vStriche = vao();
    gl.bindBuffer(gl.ARRAY_BUFFER, puffer1[2]);
    attr(0, 3, 40, 0, 1);
    attr(1, 3, 40, 12, 1);
    attr(3, 4, 40, 24, 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, puffer1[3]);
    attr(2, 1, 4, 0);

    const r = zufall(7);
    const flocken = (n: number) => {
      const v = vao();
      const d = new Float32Array(n * 4).map(() => r());
      gl.bindBuffer(gl.ARRAY_BUFFER, puffer(d));
      attr(0, 4, 16, 0);
      return v;
    };
    const vSchnee = flocken(3000);
    const vStaub = flocken(500);
    const vLeer = vao();
    gl.bindVertexArray(null);

    // ---------- Render-Ziele ----------
    const halb = !!gl.getExtension('EXT_color_buffer_float');
    const texturen: WebGLTexture[] = [];
    const fbos: WebGLFramebuffer[] = [];
    let tiefe: WebGLRenderbuffer | null = null;
    let breite = 0;
    let hoeheB = 0;
    const ziel2 = (w: number, h: number) => {
      const t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, halb ? gl.RGBA16F : gl.RGBA8, w, h, 0, gl.RGBA, halb ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const f = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      texturen.push(t);
      fbos.push(f);
      return { t, f, w, h };
    };
    let szene = { t: null as WebGLTexture | null, f: null as WebGLFramebuffer | null, w: 1, h: 1 };
    let A = szene;
    let Bz = szene;
    let C = szene;
    const zieleNeu = (w: number, h: number) => {
      texturen.splice(0).forEach((t) => gl.deleteTexture(t));
      fbos.splice(0).forEach((f) => gl.deleteFramebuffer(f));
      if (tiefe) gl.deleteRenderbuffer(tiefe);
      szene = ziel2(w, h);
      tiefe = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, tiefe);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, tiefe);
      const w4 = Math.max(1, w >> 2);
      const h4 = Math.max(1, h >> 2);
      A = ziel2(w4, h4);
      Bz = ziel2(w4, h4);
      C = ziel2(w4, h4);
      breite = w;
      hoeheB = h;
    };
    const maxPunkt = (gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as Float32Array)[1];

    function groesse() {
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.round(cv.clientWidth * dpr));
      const h = Math.max(1, Math.round(cv.clientHeight * dpr));
      if (cv.width !== w || cv.height !== h) {
        cv.width = w;
        cv.height = h;
      }
      return dpr;
    }
    const links = () => (innerWidth >= 768 ? (innerWidth <= 1024 ? 148 : 168) : 0);

    const vollbild = (prog: WebGLProgram, z: { f: WebGLFramebuffer | null; w: number; h: number } | null, werte: Record<string, number | number[]>, tex: [string, WebGLTexture | null][] = []) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, z ? z.f : null);
      const w = z ? z.w : cv.width;
      const h = z ? z.h : cv.height;
      gl.viewport(0, 0, w, h);
      gl.useProgram(prog);
      tex.forEach(([n, t], i) => {
        gl.activeTexture(gl.TEXTURE0 + i);
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.uniform1i(ort(prog, n), i);
      });
      setze(prog, { uAufl: [w, h], ...werte });
      gl.bindVertexArray(vLeer);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    function zeichne(zeit: number, p: number) {
      const dpr = groesse();
      const W = cv.width;
      const H = cv.height;
      if (W !== breite || H !== hoeheB) zieleNeu(W, H);

      // Kamera auf dem Weg, Blick nach vorn, leicht zur Maus geneigt
      const z = 10 - p * L;
      const cx = pfadX(z);
      const cy = (hoehe(cx, z) + hoehe(pfadX(z - 3), z - 3) + hoehe(pfadX(z + 3), z + 3)) / 3 + 1.7;
      const zt = z - 12;
      const tx = pfadX(zt);
      const auge: V3 = [cx, cy, z];
      const vor0 = norm([tx - cx, hoehe(tx, zt) + 1.1 - cy, zt - z]);
      const rechts0 = norm(kreuz(vor0, [0, 1, 0]));
      const blick: V3 = [
        cx + vor0[0] * 12 + rechts0[0] * maus.gx * 1.6,
        cy + vor0[1] * 12 - maus.gy * 0.9,
        z + vor0[2] * 12 + rechts0[2] * maus.gx * 1.6,
      ];
      const f = norm([blick[0] - cx, blick[1] - cy, blick[2] - z]);
      const ri = norm(kreuz(f, [0, 1, 0]));
      const up = kreuz(ri, f);
      const view = [ri[0], up[0], -f[0], 0, ri[1], up[1], -f[1], 0, ri[2], up[2], -f[2], 0, -punktprodukt(ri, auge), -punktprodukt(up, auge), punktprodukt(f, auge), 1];
      const versatz = links() / innerWidth;
      const vp = mal(perspektive(W / H, versatz), view);
      const fokus = H / (2 * Math.tan(FOV / 2));
      const auf = glatt(0.84, 1, p);
      const gemeinsam = {
        uVP: vp,
        uKamera: auge,
        uZeit: zeit,
        uFokus: fokus,
        uDpr: dpr,
        uAuf: auf,
        uAufl: [W, H],
        uMaus: [maus.px * dpr, (innerHeight - maus.py) * dpr],
      };

      // Szene ins Framebuffer-Objekt
      gl.bindFramebuffer(gl.FRAMEBUFFER, szene.f);
      gl.viewport(0, 0, W, H);
      gl.disable(gl.BLEND);
      gl.disable(gl.DEPTH_TEST);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.useProgram(P.himmel);
      setze(P.himmel, { uR: ri, uU: up, uF: f, uMond: MOND, uTan: Math.tan(FOV / 2), uAspekt: W / H, uVersatz: versatz, uZeit: zeit, uAufl: [W, H] });
      gl.bindVertexArray(vLeer);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.depthMask(true);
      gl.useProgram(P.gelaende);
      setze(P.gelaende, { uVP: vp, uKamera: auge, uMond: MOND, uZeit: zeit });
      gl.bindVertexArray(vGelaende);
      gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_INT, 0);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(P.strich);
      setze(P.strich, { uVP: vp, uKamera: auge, uZeit: zeit, uAuf: auf });
      gl.bindVertexArray(vStriche);
      gl.drawArraysInstanced(gl.LINES, 0, 2, nStriche);
      gl.useProgram(P.stiel);
      setze(P.stiel, gemeinsam);
      gl.bindVertexArray(vStiele);
      gl.drawArraysInstanced(gl.LINES, 0, 2, nBlumen);

      gl.useProgram(P.bluete);
      setze(P.bluete, { ...gemeinsam, uMaxPx: Math.min(150 * dpr, maxPunkt), uHalo: 0 });
      gl.bindVertexArray(vBlueten);
      gl.drawArrays(gl.POINTS, 0, nBlumen);
      // weiches additives Leuchten
      gl.depthMask(false);
      gl.blendFunc(gl.ONE, gl.ONE);
      setze(P.bluete, { uHalo: 1 });
      gl.drawArrays(gl.POINTS, 0, nBlumen);

      gl.useProgram(P.flocke);
      setze(P.flocke, { uVP: vp, uKamera: auge, uZeit: zeit, uFokus: fokus, uDpr: dpr, uStaub: 1 });
      gl.bindVertexArray(vStaub);
      gl.drawArrays(gl.POINTS, 0, 500);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      setze(P.flocke, { uStaub: 0 });
      gl.bindVertexArray(vSchnee);
      gl.drawArrays(gl.POINTS, 0, 3000);
      gl.depthMask(true);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);

      // Nachbearbeitung: Bloom, Mondstrahlen, Zusammensetzen
      vollbild(P.hell, A, { uTexel: [1 / W, 1 / H] }, [['uT', szene.t]]);
      for (let i = 0; i < 2; i++) {
        vollbild(P.weich, Bz, { uRichtung: [1 / A.w, 0] }, [['uT', A.t]]);
        vollbild(P.weich, A, { uRichtung: [0, 1 / A.h] }, [['uT', Bz.t]]);
      }
      const m = [0, 1, 2, 3].map((i) => vp[i] * MOND[0] + vp[4 + i] * MOND[1] + vp[8 + i] * MOND[2]);
      const mx = m[3] > 0 ? m[0] / m[3] : 9;
      const my = m[3] > 0 ? m[1] / m[3] : 9;
      const sicht = m[3] > 0 ? 1 - glatt(1.0, 1.6, Math.max(Math.abs(mx), Math.abs(my))) : 0;
      vollbild(P.strahlen, C, { uMondUV: [mx * 0.5 + 0.5, my * 0.5 + 0.5], uMondSicht: sicht }, [['uT', A.t]]);
      vollbild(P.ende, null, { uTempo: tempo, uZeit: zeit }, [
        ['uSzene', szene.t],
        ['uBloom', A.t],
        ['uStrahlen', C.t],
      ]);
    }

    // ---------- Schleife ----------
    let bereit = false;
    let rahmen = 0;
    let vorher = 0;
    let gemeldet = -1;
    function schleife(ms: number) {
      const dt = vorher ? Math.min(0.05, (ms - vorher) / 1000) : 0.016;
      vorher = ms;
      const ruhe = performance.now() - letzteEingabe;
      // Einrasten im Auflöse-Bereich: vorwärts ganz durch, rückwärts zurück ins Tal
      if (!offen && ruhe > 450 && ziel > 0.84 && ziel < 1) ziel = richtung > 0 ? 1 : 0.8;
      // ohne Eingabe treibt die Kamera sehr langsam vorwärts (nie bis ans Ende)
      if (!offen && ruhe > 1500 && ziel < 0.8) ziel = Math.min(0.8, ziel + 0.004 * dt);
      const schritt = Math.max(-0.3 * dt, Math.min(0.3 * dt, (ziel - anzeige) * Math.min(1, dt * 2.5)));
      anzeige += schritt;
      if (Math.abs(ziel - anzeige) < 0.0003) anzeige = ziel;
      tempo += (Math.min(1, Math.abs(schritt) / Math.max(dt, 1e-3) / 0.3) - tempo) * Math.min(1, dt * 4);
      maus.gx += (maus.x - maus.gx) * Math.min(1, dt * 2);
      maus.gy += (maus.y - maus.gy) * Math.min(1, dt * 2);
      if (!offen && anzeige > 0.985 && ziel === 1) {
        offen = true;
        html.dataset.tal = 'offen';
      }
      const sicht = glatt(0.84, 1, anzeige);
      html.style.setProperty('--tal-sicht', sicht.toFixed(3));
      cv.style.filter = `blur(${(sicht * 6).toFixed(2)}px) brightness(${(1 - sicht * 0.55).toFixed(3)})`;
      if (Math.abs(anzeige - gemeldet) > 0.01) {
        gemeldet = anzeige;
        setFortschritt(anzeige);
      }
      if (!bereit && alle.every((p) => !ext || gl.getProgramParameter(p, ext.COMPLETION_STATUS_KHR))) {
        const kaputt = alle.find((p) => !gl.getProgramParameter(p, gl.LINK_STATUS));
        if (kaputt) {
          console.warn('Winter-Tal-Shader:', gl.getProgramInfoLog(kaputt));
          setAus(true);
          return;
        }
        bereit = true;
      }
      // bei geöffnetem Quiz nicht mehr rendern
      if (bereit && !document.hidden && !(offen && anzeige === 1)) zeichne(ms / 1000, anzeige);
      rahmen = requestAnimationFrame(schleife);
    }
    rahmen = requestAnimationFrame(schleife);

    // für Tests: Position direkt setzen und lesen
    const test = {
      setze: (v: number) => {
        ziel = anzeige = Math.min(1, Math.max(0, v));
        letzteEingabe = performance.now();
        offen = false;
        html.dataset.tal = 'zu';
      },
      p: () => anzeige,
    };
    Object.assign(window, { talTest: test });

    return () => {
      cancelAnimationFrame(rahmen);
      fliegeDurch.current = () => {};
      removeEventListener('wheel', rad);
      removeEventListener('touchstart', touchStart);
      removeEventListener('touchmove', touchMove);
      removeEventListener('keydown', taste);
      removeEventListener('pointermove', zeiger);
      document.removeEventListener('pointerleave', weg);
      Reflect.deleteProperty(window, 'talTest');
      // GPU-Speicher freigeben (kein loseContext: im Entwicklungsmodus läuft der Effekt zweimal auf demselben Canvas)
      texturen.forEach((t) => gl.deleteTexture(t));
      fbos.forEach((f) => gl.deleteFramebuffer(f));
      if (tiefe) gl.deleteRenderbuffer(tiefe);
      [...puffer1, pIdx].forEach((b) => gl.deleteBuffer(b));
      vaos.forEach((v) => gl.deleteVertexArray(v));
      alle.forEach((p) => gl.deleteProgram(p));
      delete html.dataset.tal;
      html.style.removeProperty('--tal-sicht');
    };
  }, [aus]);

  if (aus) return null;

  return (
    <div className="tal">
      <canvas ref={canvasRef} aria-hidden="true" onClick={() => fliegeDurch.current()} />
      <button
        className="kugel-hinweis"
        style={{ opacity: bewegt || fortschritt > 0.06 ? 0 : 1, pointerEvents: bewegt ? 'none' : 'auto' }}
        onClick={() => fliegeDurch.current()}
      >
        Scrolle, um durch das Winter-Tal zu wandern
        <span aria-hidden="true">⌄</span>
      </button>
    </div>
  );
}
