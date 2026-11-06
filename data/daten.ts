// =====================================================================
//  ALLE INHALTE DER WEBSITE STEHEN IN DIESER DATEI.
//  Du musst nur hier etwas ändern. Nach dem Speichern aktualisiert sich
//  die Seite im Entwicklungsmodus (npm run dev) automatisch.
//
//  Regeln:
//  - Texte immer in Anführungszeichen: 'Text' oder "Text".
//  - Einträge in Listen [ ... ] mit Komma trennen.
//  - Datum immer als 'JJJJ-MM-TT', z. B. '2027-03-15'.
//  - Keine privaten Daten (Namen, Noten, Telefonnummern) eintragen!
// =====================================================================

// ---------- Typen (beschreiben, wie ein Eintrag aussehen muss) ----------
// Diesen Teil musst du normalerweise nicht ändern.

export type Material = {
  titel: string; // angezeigter Name des Links
  link: string; // vollständige Adresse, beginnt mit https://
};

export type Test = {
  fach: string;
  thema: string; // muss genau so heißen wie das "thema" der passenden Quizfragen
  datum: string; // 'JJJJ-MM-TT'
  stunde?: number; // optional: Unterrichtsstunde, z. B. 4 für "4. Stunde"
  lernstoff: string[]; // "Das musst du können"
  material: Material[]; // "Arbeitsmittel"
};

export type Pruefung = {
  titel: string;
  datum: string; // 'JJJJ-MM-TTTHH:MM', z. B. '2027-05-12T08:30' – leer lassen, solange unbekannt
  ort: string;
  hinweise: string[];
};

export type Frage = {
  thema: string; // muss zum "thema" eines Tests passen
  frage: string;
  antworten: string[]; // mindestens 2 Antworten
  richtig: number; // Position der richtigen Antwort, gezählt ab 0 (erste Antwort = 0)
  erklaerung: string; // wird nach dem Antworten angezeigt
};

export type Karte = {
  vorne: string; // Begriff oder Frage
  hinten: string; // Erklärung oder Antwort
};

export type Startseite = {
  headline: string; // kurze Zeile unter dem Klassennamen
  text: string; // kleiner Text unten links
  knopf: string; // Beschriftung des Buttons oben rechts
  aussagen: string[]; // wechselnde Sätze unten rechts
};

export type Daten = {
  klasse: string;
  untertitel: string;
  startseite: Startseite;
  tests: Test[];
  pruefung: Pruefung;
  themen: string[];
  fragen: Frage[];
  karten: Karte[];
};

// ---------------------------- Inhalte ----------------------------------

export const daten: Daten = {
  // Wird groß auf der Startseite angezeigt.
  klasse: 'BM25',
  untertitel: 'Termine, Lernstoff und Prüfungsvorbereitung',

  // Texte der Startseite.
  startseite: {
    headline: 'Alles für die Klasse an einem Ort',
    text: 'Termine, Lernstoff, Quiz und Prüfungsvorbereitung für BM25.',
    knopf: "Los geht's",
    // Jeder Satz wird ca. 3 Sekunden gezeigt, dann kommt der nächste.
    aussagen: ['Alle Termine im Blick.', 'Lernstoff an einem Ort.', 'Üben mit dem Quiz.', 'Bereit für die Prüfung.'],
  },

  // Tests und Klassenarbeiten. Reihenfolge egal, die Seite sortiert nach Datum.
  // So sieht ein Eintrag aus:
  // {
  //   fach: 'Fachname',
  //   thema: 'Name des Themas',
  //   datum: '2027-03-15',
  //   stunde: 3,                      // optional
  //   lernstoff: ['Erster Punkt, den man können muss', 'Zweiter Punkt'],
  //   material: [{ titel: 'Arbeitsblatt', link: 'https://...' }],
  // },
  tests: [
    {
      fach: 'LF6',
      thema: 'Bilanzen und Inventar',
      datum: '2026-11-06',
      stunde: 4,
      lernstoff: [],
      material: [],
    },
  ],

  // Die Abschlussprüfung. Datum mit Uhrzeit, z. B. '2027-05-12T08:30'.
  // Solange das Datum leer ist (''), steht dort "Noch kein Prüfungstermin eingetragen."
  pruefung: {
    titel: 'Abschlussprüfung',
    datum: '',
    ort: '',
    // Beispiel: hinweise: ['Erster Hinweis', 'Zweiter Hinweis'],
    hinweise: [],
  },

  // Themen für die Checkliste in der Prüfungsvorbereitung.
  // Beispiel: themen: ['Thema A', 'Thema B'],
  themen: [],

  // Quizfragen. Erscheinen im Quiz (beim passenden Thema) und im Prüfungsmodus.
  // So sieht ein Eintrag aus:
  // {
  //   thema: 'Name des Themas',          // genau wie beim Test
  //   frage: 'Wie lautet die Frage?',
  //   antworten: ['Antwort A', 'Antwort B', 'Antwort C'],
  //   richtig: 1,                        // hier wäre "Antwort B" richtig
  //   erklaerung: 'Warum B richtig ist.',
  // },
  fragen: [],

  // Karteikarten zum Umdrehen.
  // So sieht ein Eintrag aus: { vorne: 'Begriff', hinten: 'Erklärung' },
  karten: [],
};
