# BM25 – Klassen-Website

Website der Berufsschulklasse BM25: Startseite mit Partikel-Büste (rohes WebGL2), Termine mit Kalender, Lernstoff, Quiz und Prüfungsvorbereitung.
Gebaut mit Next.js, ohne Datenbank und ohne 3D-Bibliothek. Alle Inhalte stehen in **einer** Datei: `data/daten.ts`.

## Starten

Voraussetzung: [Node.js](https://nodejs.org) (Version 20 oder neuer).

```bash
npm install      # nur beim ersten Mal
npm run dev      # Entwicklungsmodus
```

Dann im Browser <http://localhost:3000> öffnen. Änderungen erscheinen sofort.

Vor dem Veröffentlichen prüfen, ob alles fehlerfrei baut:

```bash
npm run build
```

## Inhalte ergänzen

Alles passiert in `data/daten.ts`. Bei jeder Liste steht ein Beispiel als Kommentar.

**Startseite:** `startseite.headline` (Zeile unter „BM25“), `startseite.text` (unten links), `startseite.knopf` (Button oben rechts), `startseite.aussagen` (wechselnde Sätze unten rechts).

**Test eintragen** – in die Liste `tests: [ ... ]`:

```ts
tests: [
  {
    fach: 'Fachname',
    thema: 'Name des Themas',
    datum: '2027-03-15',
    lernstoff: ['Punkt 1', 'Punkt 2'],
    material: [{ titel: 'Arbeitsblatt', link: 'https://...' }],
  },
],
```

**Quizfrage eintragen** – in die Liste `fragen: [ ... ]`. Das `thema` muss genau so geschrieben sein wie beim Test. Dann erscheint die Frage im Quiz zu diesem Thema und im Prüfungsmodus.

```ts
fragen: [
  {
    thema: 'Name des Themas',
    frage: 'Wie lautet die Frage?',
    antworten: ['Antwort A', 'Antwort B', 'Antwort C'],
    richtig: 1, // gezählt ab 0 → "Antwort B"
    erklaerung: 'Warum B richtig ist.',
  },
],
```

**Prüfungstermin:** bei `pruefung` das `datum` mit Uhrzeit eintragen, z. B. `'2027-05-12T08:30'`, dazu `ort` und `hinweise`.

**Checkliste und Karteikarten:** `themen: ['Thema A', 'Thema B']` und `karten: [{ vorne: 'Begriff', hinten: 'Erklärung' }]`.

Keine privaten Daten (Namen, Noten) eintragen – die Seite ist öffentlich.

## Zwischenprüfung (Reiter „Prüfung“)

Oben im Reiter „Prüfung“ schaltest du zwischen **Abschlussprüfung** (bisheriger Inhalt) und **Zwischenprüfung** um. Die Zwischenprüfung ist eine Übung für Teil 1 der Abschlussprüfung (Kaufleute für Büromanagement) mit den Stufen Leicht, Mittel, Schwer und Simulation, Zeitlimit, Rechenaufgaben und einer Notenschätzung nach IHK-Schlüssel.

Die Fragen stehen in `data/zwischenpruefung.ts`. Es sind **eigene Übungsfragen**, keine Original-Prüfungsaufgaben (die sind urheberrechtlich geschützt und gehören nicht auf diese öffentliche Seite).

**Eigene Frage ergänzen:** In `fragen` einen Eintrag kopieren und anpassen.

```ts
// Mehrfachauswahl: 4 Antworten, die richtige steht VORN (richtig: 0)
{
  stufe: 'leicht', thema: 'Beschaffung',
  frage: 'Was ist eine Anfrage?',
  antworten: ['Richtige Antwort', 'Falsch 1', 'Falsch 2', 'Falsch 3'],
  richtig: 0,
  erklaerung: 'Kurze Begründung.',
},
// Rechenaufgabe
{
  stufe: 'mittel', thema: 'Rechnen und Kalkulation',
  frage: 'Wie viel sind 19 % von 200 €?',
  zahl: 38, einheit: '€', toleranz: 0.01,
  erklaerung: 'Rechenweg: 200 € × 19 % = 38 €.',
},
```

`stufe` ist `'leicht'`, `'mittel'` oder `'schwer'`, `thema` einer der Namen aus `THEMEN` oben in der Datei. Danach `node lib/hilfen.selbsttest.mts` ausführen: Der Test meldet Fehler im Aufbau (z. B. falsches Thema, keine 4 Antworten).

## Der Partikel-Kopf

Die Startseite lädt `public/kopf/tiefe.png` und `public/kopf/normalen.png` (volle Fotoauflösung) und erzeugt daraus 320.000 Partikel (Fenster schmaler als 820 px: 170.000). Fehlen die Dateien, wird automatisch eine Büste per Code erzeugt (`lib/bueste.ts`).

Das Gesicht ist ein Foto-Relief, kein echter 3D-Scan: Von vorn sieht es gut aus, bei starker Drehung nicht. Deshalb dreht sich die Kamera nur wenig.

## Schnee-Titel

Der Klassenname oben links ist eine verschneite Bubble-Schrift in WebGL2 (`components/Titel.tsx`). Für die Zeichen B, M, 2 und 5 sind eigene Buchstaben aus dicken, runden Linien hinterlegt (`GLYPHEN`). Jeder andere Klassenname wird mit einer schweren runden Schrift (Nunito 900) gezeichnet. Der Text kommt automatisch aus `klasse` in `data/daten.ts`. Ohne WebGL2 erscheint eine weiße CSS-Schrift mit blauem Schatten; bei „Bewegung reduzieren“ steht der Titel still.

## Schneekugel vor dem Kalender

Beim Reiter „Termine“ erscheint statt der Wisch-Animation eine 3D-Schneekugel (`components/Kugel.tsx`, WebGL2, ein einziger Shader: Glas mit Brechung und Spiegelung, Holzsockel mit Goldringen, Haus, Tannen, Lichter und Schnee im Inneren). Scrollen, Wischen, Pfeiltasten/Leertaste oder ein Klick auf die Kugel zoomen hinein, danach blendet der Kalender ein. Ganz oben im Kalender weiter nach oben scrollen zoomt wieder hinaus. Ohne WebGL2 gibt es eine flache 2D-Version; bei „Bewegung reduzieren“ erscheint der Kalender direkt.

## Winter-Tal vor dem Quiz

Beim Reiter „Quiz“ erscheint statt der Wisch-Animation ein nächtliches Winter-Tal (`components/Tal.tsx`, WebGL2, eigener Code). Scrollen, Wischen, Pfeiltasten/Leertaste oder ein Klick bewegen die Kamera etwa 300 m einen geschwungenen Weg entlang: Schneeglöckchen, Blausterne, Kirsch- und Pflaumenbäume, Rosensträucher (alle mit Schneehaube), Gras, Schneefall, Mond und Sterne. Die Blüten wachsen beim Näherkommen und weichen der Maus aus. Entlang des Wegs stehen rund 340 Low-Poly-Tannen, 15 Holzhäuser mit warm leuchtenden Fenstern und 26 Kinderpaare, die sich Schneebälle zuwerfen (auf schwachen Geräten halb so viele Tannen und Kinder). Am Ende lösen sie sich in Lichtpunkte auf und das Quiz blendet ein. Ganz oben im Quiz weiter nach oben scrollen fliegt zurück ins Tal. Ohne WebGL2 oder bei „Bewegung reduzieren“ erscheint das Quiz direkt. Das Tal sieht dank festem Zufalls-Seed bei jedem Besuch gleich aus.

## Frost-Effekt beim Wechsel auf „Start“

Wer von einem anderen Reiter auf „Start“ klickt, sieht den Bildschirm zufrieren (`components/Frost.tsx`, Canvas 2D, eigener Code): Milchglas, Farn-Eiskristalle und Eissterne wachsen von den Rändern zur Mitte. Mit 3 Klicks (oder Enter/Leertaste) bricht das Eis auf: Risse, ausbrechende Stücke, Wackeln, beim dritten Klick zersplittert alles. Esc überspringt den Effekt. Nicht beim ersten Laden der Seite und nicht bei „Bewegung reduzieren“. Wechselt man den Reiter, ist das Eis sofort weg.

## Winter-Hintergrund

`components/Winter.tsx` zeichnet ein Winterwunderland bei Dämmerung als Vektorgrafik (Canvas 2D): Himmel, Sterne, Mond, Berge, Dorf, Fichtenwälder, Schneefeld, große Fichten, Schneebüsche und drei Lichterketten. Darüber fallen Schneeflocken, die Lämpchen flackern. In den Inhaltsreitern ist die Szene abgedunkelt. Bei „Bewegung reduzieren“ fällt kein Schnee und die Lichter stehen still.

**Tageszeit:** Die Szene folgt der Uhrzeit. Sonne und Mond laufen auf einem Bogen, der Himmel blendet zwischen Nacht, Dämmerung und Tag, die Landschaft zwischen einer Nacht- und einer Tag-Palette. Sonnenauf- und -untergang werden aus der Jahreszeit geschätzt (Tageslänge 12,1 + 4,2·sin(2π(Tag−80)/365) Stunden, Mittag 12:36). Die Uhr unten links (am Handy oben rechts) zeigt die Uhrzeit der Szene.

**Reiter „Einstellungen“:** Tageszeit Automatisch, Morgen, Tag, Abend oder Nacht (die Szene läuft im Zeitraffer vorwärts dorthin) und Schneefall an/aus. Die Auswahl wird im Browser gespeichert.

**Neues Foto verwenden** (nur auf einem Mac, nutzt Apples Vision-Framework):

```bash
swift scripts/foto-zu-kopf.swift pfad/zum/foto.jpg public/kopf
```

Das Skript stellt die Person frei, findet Augen, Nase und Hand und schreibt die zwei PNGs. Gut geeignet: Porträt von vorn, gleichmäßiges Licht, ruhiger Hintergrund.
Meldet Swift „this SDK is not supported by the compiler“, ein passendes SDK angeben:

```bash
SDKROOT=/Library/Developer/CommandLineTools/SDKs/MacOSX26.5.sdk swift scripts/foto-zu-kopf.swift foto.jpg public/kopf
```

Wichtig: Die PNGs zeigen ein erkennbares Gesicht und sind nach dem Veröffentlichen öffentlich. Nur Fotos verwenden, deren abgebildete Person zugestimmt hat. Das Original-Foto gehört nicht in den Ordner `public/`.

**Kopf ohne Foto:** `public/kopf/` löschen, dann wird die Büste per Code gezeigt.

**Echten 3D-Kopf-Scan einbauen** (z. B. den Scan von Lee Perry-Smith, Lizenz CC BY 3.0):

1. Modell als `.glb` oder `.obj` herunterladen und nach `public/kopf/` legen.
2. In `lib/bueste.ts` eine dritte Funktion ergänzen, die die Dreiecke des Modells einliest und zufällige Punkte auf ihrer Oberfläche erzeugt (8 Werte pro Punkt wie die anderen Funktionen). In `components/Partikel.tsx` statt `buesteAusFoto` diese Funktion aufrufen. Claude Code kann das für dich übernehmen.
3. Die Lizenz verlangt eine Namensnennung. Lege `public/kopf/CREDITS.txt` an und verlinke sie zusätzlich im Text der Startseite (`startseite.text`):

```
Kopf-Scan: "Lee Perry-Smith head" von Lee Perry-Smith (Infinite Realities)
Lizenz: CC BY 3.0 – https://creativecommons.org/licenses/by/3.0/
Verändert: in eine Punktwolke umgewandelt.
```

## Barrierefreiheit und Bewegung

- Alle Reiter, Buttons und Karten sind mit der Tastatur bedienbar.
- Ist im Betriebssystem „Bewegung reduzieren“ aktiv, stehen die Partikel still und alle Animationen entfallen.
- Ist der Browser-Tab unsichtbar oder ein Inhaltsreiter offen, pausiert die Animation.
- Ohne WebGL2 bleibt ein blauer Farbverlauf, alle Texte bleiben lesbar.

## Online stellen (GitHub Pages, kostenlos)

Die Seite wird als statische Seite exportiert (`next.config.ts`, `output: 'export'`). Die Datei `.github/workflows/pages.yml` baut sie bei jedem Push auf GitHub automatisch und veröffentlicht sie unter

`https://<dein-github-name>.github.io/bm25-klassenseite/`

**Einmalig einrichten**

1. Auf <https://github.com> ein kostenloses Konto anlegen und anmelden.
2. Neues Repository anlegen: Name `bm25-klassenseite`, **Public**, ohne README.
3. Projekt hochladen (z. B. mit GitHub Desktop: „Add existing repository“ → diesen Ordner → „Publish repository“).
4. Im Repository: **Settings → Pages → Source: „GitHub Actions“**.
5. Unter **Actions** warten, bis „Seite veröffentlichen“ grün ist (1–2 Minuten). Dann ist die Seite online.

**Änderungen online bringen** (z. B. neue Termine in `data/daten.ts`)

```bash
git add .
git commit -m "Neue Termine"
git push
```

Oder in GitHub Desktop: Änderungen ansehen → Text unten links eintragen → „Commit to main“ → „Push origin“. Nach 1–2 Minuten ist die Seite aktuell.

**Wichtig:** Die Seite ist öffentlich, jeder mit dem Link kann sie sehen, auch das Gesicht auf der Startseite. Keine privaten Daten (Handynummern, Noten) eintragen. Einen echten Passwortschutz bietet GitHub Pages nicht; dafür bräuchte man z. B. Netlify oder Vercel mit (teils bezahltem) Passwortschutz.

## Selbsttest

Prüft Datumsberechnungen und die Büste per Code:

```bash
node lib/hilfen.selbsttest.mts
```
