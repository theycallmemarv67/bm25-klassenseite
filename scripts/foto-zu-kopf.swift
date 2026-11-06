// Erzeugt aus einem Foto zwei kleine PNGs für die Partikel-Büste der Startseite.
// Läuft nur auf einem Mac (nutzt Apples Vision-Framework, keine Installation nötig).
//
// Aufruf:  swift scripts/foto-zu-kopf.swift pfad/zum/foto.jpg public/kopf
//
// Ergebnis:
//   tiefe.png     R = Tiefe (hell = vorne), G = Maske (Person), B = Helligkeit
//   normalen.png  RGB = Oberflächen-Normale
//
// Vorgehen: Person freistellen, Gesicht (Augen, Nase) und Hand finden,
// daraus eine Tiefenkarte bauen (Körper leicht gewölbt, Kopf als Kuppel,
// Nase vorn, Augenhöhlen hinten, Hand ganz vorn), dann Normalen und Helligkeit.

import CoreImage
import Foundation
import ImageIO
import UniformTypeIdentifiers
import Vision

func abbruch(_ text: String) -> Never {
  FileHandle.standardError.write((text + "\n").data(using: .utf8)!)
  exit(1)
}

let argumente = CommandLine.arguments
guard argumente.count >= 3 else { abbruch("Aufruf: swift scripts/foto-zu-kopf.swift FOTO ZIELORDNER") }
let zielOrdner = URL(fileURLWithPath: argumente[2], isDirectory: true)
try FileManager.default.createDirectory(at: zielOrdner, withIntermediateDirectories: true)

guard let original = CIImage(contentsOf: URL(fileURLWithPath: argumente[1]), options: [.applyOrientationProperty: true])
else { abbruch("Foto konnte nicht gelesen werden: \(argumente[1])") }

// ---------- Volle Auflösung (nur sehr große Fotos werden auf 1000 px Höhe begrenzt) ----------
let H = min(1000, Int(original.extent.height.rounded()))
let W = Int((Double(H) * original.extent.width / original.extent.height).rounded())
let bild = original
  .transformed(by: CGAffineTransform(translationX: -original.extent.minX, y: -original.extent.minY))
  .transformed(by: CGAffineTransform(scaleX: CGFloat(W) / original.extent.width, y: CGFloat(H) / original.extent.height))
let rahmen = CGRect(x: 0, y: 0, width: W, height: H)
let ci = CIContext()
var rgba = [UInt8](repeating: 0, count: W * H * 4)
ci.render(bild, toBitmap: &rgba, rowBytes: W * 4, bounds: rahmen, format: .RGBA8, colorSpace: CGColorSpaceCreateDeviceRGB())
guard let cg = ci.createCGImage(bild, from: rahmen) else { abbruch("Bild konnte nicht umgewandelt werden.") }

// ---------- Vision: Person, Gesicht, Hand ----------
let personReq = VNGeneratePersonSegmentationRequest()
personReq.qualityLevel = .accurate
personReq.outputPixelFormat = kCVPixelFormatType_OneComponent8
let gesichtReq = VNDetectFaceLandmarksRequest()
let handReq = VNDetectHumanHandPoseRequest()
handReq.maximumHandCount = 2
try VNImageRequestHandler(cgImage: cg, options: [:]).perform([personReq, gesichtReq, handReq])

guard let maskenPuffer = personReq.results?.first?.pixelBuffer else { abbruch("Keine Person im Foto gefunden.") }
guard let gesicht = gesichtReq.results?.first else { abbruch("Kein Gesicht im Foto gefunden.") }

// Vision-Koordinaten (0–1, Ursprung unten links) → Pixel (Ursprung oben links)
func pixel(_ p: CGPoint) -> (Double, Double) { (Double(p.x) * Double(W), (1 - Double(p.y)) * Double(H)) }
let groesse = CGSize(width: W, height: H)
func punkte(_ r: VNFaceLandmarkRegion2D?) -> [(Double, Double)] {
  (r?.pointsInImage(imageSize: groesse) ?? []).map { (Double($0.x), Double(H) - Double($0.y)) }
}
func mitte(_ p: [(Double, Double)]) -> (Double, Double)? {
  p.isEmpty ? nil : (p.map(\.0).reduce(0, +) / Double(p.count), p.map(\.1).reduce(0, +) / Double(p.count))
}

// ---------- Maske einlesen ----------
var maske = [Double](repeating: 0, count: W * H)
CVPixelBufferLockBaseAddress(maskenPuffer, .readOnly)
let mb = CVPixelBufferGetWidth(maskenPuffer)
let mh = CVPixelBufferGetHeight(maskenPuffer)
let mz = CVPixelBufferGetBytesPerRow(maskenPuffer)
let mDaten = CVPixelBufferGetBaseAddress(maskenPuffer)!.assumingMemoryBound(to: UInt8.self)
for y in 0..<H {
  for x in 0..<W {
    maske[y * W + x] = Double(mDaten[(y * mh / H) * mz + x * mb / W]) / 255
  }
}
CVPixelBufferUnlockBaseAddress(maskenPuffer, .readOnly)

// ---------- Abstand zum Rand der Person (für eine weiche Wölbung) ----------
var abstand = maske.map { $0 > 0.5 ? 1e9 : 0.0 }
for y in 0..<H { for x in 0..<W where abstand[y * W + x] > 0 {
  var d = abstand[y * W + x]
  if x > 0 { d = min(d, abstand[y * W + x - 1] + 1) }
  if y > 0 { d = min(d, abstand[(y - 1) * W + x] + 1) }
  abstand[y * W + x] = d
} }
for y in stride(from: H - 1, through: 0, by: -1) { for x in stride(from: W - 1, through: 0, by: -1) where abstand[y * W + x] > 0 {
  var d = abstand[y * W + x]
  if x < W - 1 { d = min(d, abstand[y * W + x + 1] + 1) }
  if y < H - 1 { d = min(d, abstand[(y + 1) * W + x] + 1) }
  abstand[y * W + x] = d
} }
let groessterAbstand = max(1, abstand.max() ?? 1)

// ---------- Gesichtsmerkmale ----------
let box = gesicht.boundingBox
let fw = Double(box.width) * Double(W)
let fh = Double(box.height) * Double(H)
let (gx, gy) = pixel(CGPoint(x: box.midX, y: box.midY))
let lm = gesicht.landmarks
let augen = [mitte(punkte(lm?.leftEye)), mitte(punkte(lm?.rightEye))].compactMap { $0 }
let nasenPunkte = punkte(lm?.nose) + punkte(lm?.noseCrest)
let nase = mitte(nasenPunkte)

// Hand als "Knochen" (Linien zwischen Gelenken), damit Finger und Handfläche entstehen
typealias Gelenk = VNHumanHandPoseObservation.JointName
let ketten: [[Gelenk]] = [
  [.wrist, .thumbCMC, .thumbMP, .thumbIP, .thumbTip],
  [.wrist, .indexMCP, .indexPIP, .indexDIP, .indexTip],
  [.wrist, .middleMCP, .middlePIP, .middleDIP, .middleTip],
  [.wrist, .ringMCP, .ringPIP, .ringDIP, .ringTip],
  [.wrist, .littleMCP, .littlePIP, .littleDIP, .littleTip],
  [.indexMCP, .middleMCP, .ringMCP, .littleMCP],
]
var knochen: [((Double, Double), (Double, Double))] = []
for h in handReq.results ?? [] {
  let p = (try? h.recognizedPoints(.all)) ?? [:]
  for kette in ketten {
    for (a, b) in zip(kette, kette.dropFirst()) {
      if let pa = p[a], let pb = p[b], pa.confidence > 0.3, pb.confidence > 0.3 {
        knochen.append((pixel(pa.location), pixel(pb.location)))
      }
    }
  }
}
func abstandZuStrecke(_ x: Double, _ y: Double, _ s: ((Double, Double), (Double, Double))) -> Double {
  let (a, b) = s
  let (vx, vy) = (b.0 - a.0, b.1 - a.1)
  let t = max(0, min(1, ((x - a.0) * vx + (y - a.1) * vy) / max(1e-9, vx * vx + vy * vy)))
  return hypot(x - a.0 - t * vx, y - a.1 - t * vy)
}

func glocke(_ x: Double, _ y: Double, _ c: (Double, Double), _ sx: Double, _ sy: Double) -> Double {
  exp(-(pow((x - c.0) / sx, 2) + pow((y - c.1) / sy, 2)))
}
func glatt(_ a: Double, _ b: Double, _ x: Double) -> Double {
  let t = min(1, max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// ---------- Tiefenkarte ----------
var tiefe = [Double](repeating: 0, count: W * H)
for y in 0..<H {
  for x in 0..<W {
    let i = y * W + x
    guard maske[i] > 0.5 else { continue }
    let px = Double(x), py = Double(y)
    var d = 0.3 * sqrt(abstand[i] / groessterAbstand) // Körper und Schultern leicht gewölbt
    // Kopf als Kuppel (etwas nach oben verschoben, damit die Haare dazugehören)
    let r2 = pow((px - gx) / (0.62 * fw), 2) + pow((py - (gy - 0.15 * fh)) / (0.8 * fh), 2)
    if r2 < 1.15 { d += (0.32 + 0.3 * sqrt(max(0, 1 - r2)) - d) * glatt(1.15, 0.6, r2) }
    if let n = nase { d += 0.13 * glocke(px, py, n, 0.09 * fw, 0.16 * fh) }
    for a in augen { d -= 0.06 * glocke(px, py, a, 0.11 * fw, 0.07 * fh) }
    // Hand liegt vor dem Gesicht: Finger als gerundete Röhren
    if !knochen.isEmpty {
      let dicke = 0.1 * fw
      let nah = knochen.map { abstandZuStrecke(px, py, $0) }.min()!
      let rund = sqrt(max(0, 1 - pow(nah / dicke, 2)))
      d += (0.8 + 0.07 * rund - d) * glatt(dicke * 1.15, dicke * 0.6, nah)
    }
    tiefe[i] = min(1, max(0, d))
  }
}
// Weichzeichnen (Durchgänge passend zur Auflösung), damit keine Kanten und Treppen entstehen
for _ in 0..<max(4, H / 100) {
  var neu = tiefe
  for y in 1..<(H - 1) { for x in 1..<(W - 1) where maske[y * W + x] > 0.5 {
    var s = 0.0, n = 0.0
    for dy in -1...1 { for dx in -1...1 where maske[(y + dy) * W + x + dx] > 0.5 {
      s += tiefe[(y + dy) * W + x + dx]; n += 1
    } }
    neu[y * W + x] = s / n
  } }
  tiefe = neu
}

// ---------- Helligkeit: lokaler Kontrast, dann auf die Person gestreckt ----------
var lum = [Double](repeating: 0, count: W * H)
for i in 0..<(W * H) {
  lum[i] = (0.299 * Double(rgba[i * 4]) + 0.587 * Double(rgba[i * 4 + 1]) + 0.114 * Double(rgba[i * 4 + 2])) / 255
}
// Weichzeichner: 3 Box-Blur-Durchgänge (waagerecht + senkrecht), Radius ≈ 1 % der Bildhöhe
var weich = lum
let r = max(2, H / 100)
for _ in 0..<3 {
  var tmp = weich
  for y in 0..<H { for x in 0..<W {
    var s = 0.0
    for dx in -r...r { s += weich[y * W + min(W - 1, max(0, x + dx))] }
    tmp[y * W + x] = s / Double(2 * r + 1)
  } }
  for y in 0..<H { for x in 0..<W {
    var s = 0.0
    for dy in -r...r { s += tmp[min(H - 1, max(0, y + dy)) * W + x] }
    weich[y * W + x] = s / Double(2 * r + 1)
  } }
}
var hell = [Double](repeating: 0, count: W * H)
var werte: [Double] = []
for i in 0..<(W * H) {
  hell[i] = lum[i] + 1.4 * (lum[i] - weich[i]) // Augen, Brauen, Nase, Mund treten hervor
  if maske[i] > 0.5 { werte.append(hell[i]) }
}
werte.sort()
let tief = werte.isEmpty ? 0 : werte[werte.count * 2 / 100]
let hoch = werte.isEmpty ? 1 : werte[werte.count * 98 / 100]
for i in 0..<(W * H) { hell[i] = maske[i] > 0.5 ? pow(min(1, max(0, (hell[i] - tief) / max(0.01, hoch - tief))), 0.9) : 0 }

// ---------- PNGs schreiben ----------
let pixelGroesse = 2.1 / Double(H) // gleiche Skala wie lib/bueste.ts
var tiefePNG = [UInt8](repeating: 255, count: W * H * 4)
var normalenPNG = [UInt8](repeating: 255, count: W * H * 4)
for y in 0..<H {
  for x in 0..<W {
    let i = y * W + x
    let t = { (xx: Int, yy: Int) in tiefe[min(H - 1, max(0, yy)) * W + min(W - 1, max(0, xx))] * 0.55 }
    let sx = (t(x + 1, y) - t(x - 1, y)) / (2 * pixelGroesse)
    let sy = (t(x, y - 1) - t(x, y + 1)) / (2 * pixelGroesse) // Bild-y zeigt nach unten
    let l = sqrt(sx * sx + sy * sy + 1)
    tiefePNG[i * 4] = UInt8(tiefe[i] * 255)
    tiefePNG[i * 4 + 1] = maske[i] > 0.5 ? 255 : 0
    tiefePNG[i * 4 + 2] = UInt8(hell[i] * 255)
    normalenPNG[i * 4] = UInt8((-sx / l * 0.5 + 0.5) * 255)
    normalenPNG[i * 4 + 1] = UInt8((-sy / l * 0.5 + 0.5) * 255)
    normalenPNG[i * 4 + 2] = UInt8((1 / l * 0.5 + 0.5) * 255)
  }
}

func speichern(_ daten: [UInt8], _ name: String) {
  var kopie = daten
  let k = CGContext(data: &kopie, width: W, height: H, bitsPerComponent: 8, bytesPerRow: W * 4,
                    space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  let url = zielOrdner.appendingPathComponent(name)
  let ziel = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil)!
  CGImageDestinationAddImage(ziel, k.makeImage()!, nil)
  CGImageDestinationFinalize(ziel)
  print("geschrieben: \(url.path)")
}
speichern(tiefePNG, "tiefe.png")
speichern(normalenPNG, "normalen.png")
print("Größe \(W)×\(H), Augen: \(augen.count), Nase: \(nase != nil ? "ja" : "nein"), Handknochen: \(knochen.count)")
