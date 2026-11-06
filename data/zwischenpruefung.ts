// =====================================================================
//  ZWISCHENPRÜFUNG (Teil 1 der Abschlussprüfung) – Kaufleute für Büromanagement
//
//  Das sind EIGENE Übungsfragen im Stil der Prüfung, KEINE Original-Aufgaben
//  der IHK/AkA (die sind urheberrechtlich geschützt und dürfen nicht hierher).
//
//  Eigene Frage ergänzen: unten in "fragen" einen Eintrag kopieren und anpassen.
//  - Mehrfachauswahl: 4 Antworten, die RICHTIGE steht immer VORN (richtig: 0).
//    Die Reihenfolge wird beim Start gemischt.
//  - Rechenaufgabe: "zahl" ist das Ergebnis, "einheit" z. B. '€', '%', 'Stück'.
//  - "stufe": 'leicht', 'mittel' oder 'schwer'.
//  - "thema": einer der Namen aus THEMEN (für die Auswertung je Thema).
//  Selbsttest danach: node lib/hilfen.selbsttest.mts
// =====================================================================

export const THEMEN = [
  'Beschaffung',
  'Kaufvertrag',
  'Zahlung und Verzug',
  'Lager und Bestand',
  'Rechnen und Kalkulation',
  'Textverarbeitung',
  'Tabellenkalkulation',
  'Büroorganisation',
  'Kommunikation',
  'Datenschutz',
  'Recht und Steuern',
] as const;

export type Stufe = 'leicht' | 'mittel' | 'schwer';
type Gemeinsam = { stufe: Stufe; thema: (typeof THEMEN)[number]; frage: string; erklaerung: string };
export type Auswahlaufgabe = Gemeinsam & { antworten: [string, string, string, string]; richtig: 0 };
export type Rechenaufgabe = Gemeinsam & { zahl: number; einheit: string; toleranz: number };
export type ZpAufgabe = Auswahlaufgabe | Rechenaufgabe;

export const ZWISCHENPRUEFUNG = {
  info: {
    teil: 'Teil 1 der gestreckten Abschlussprüfung: „Informationstechnisches Büromanagement“',
    dauer: '120 Minuten',
    gewicht: '25 % der Abschlussnote',
    zeitpunkt: 'etwa Mitte des 2. Ausbildungsjahres; geprüft werden die Inhalte der ersten 15 Monate',
    inhalt:
      'Ein praxisnaher Arbeitsauftrag: Büro- und Beschaffungsprozesse organisieren, Kundenanfragen bearbeiten und dabei mit Textverarbeitung und Tabellenkalkulation recherchieren, dokumentieren und kalkulieren.',
  },
  stufen: {
    leicht: { name: 'Leicht', text: 'Grundbegriffe, einfache Rechnungen', anzahl: 15, minuten: 20 },
    mittel: { name: 'Mittel', text: 'Anwendung, Kalkulation, Fälle', anzahl: 15, minuten: 30 },
    schwer: { name: 'Schwer', text: 'Mehrstufige Rechnungen, Fallfragen', anzahl: 15, minuten: 35 },
    gemischt: { name: 'Simulation', text: 'Alle Stufen gemischt', anzahl: 30, minuten: 45 },
  },
  fragen: [
    // ======================= LEICHT =======================
    {
      stufe: 'leicht', thema: 'Kaufvertrag',
      frage: 'Wodurch kommt ein Kaufvertrag zustande?',
      antworten: ['Durch zwei übereinstimmende Willenserklärungen (Antrag und Annahme)', 'Erst durch die Lieferung der Ware', 'Erst durch die Bezahlung', 'Nur durch einen schriftlichen Vertrag'],
      richtig: 0,
      erklaerung: 'Ein Kaufvertrag entsteht durch Antrag und Annahme. Er ist grundsätzlich formfrei, also auch mündlich oder per E-Mail gültig.',
    },
    {
      stufe: 'leicht', thema: 'Beschaffung',
      frage: 'Welche rechtliche Wirkung hat eine Anfrage an einen Lieferer?',
      antworten: ['Sie ist rechtlich unverbindlich', 'Sie verpflichtet zum Kauf', 'Sie verpflichtet den Lieferer zur Lieferung', 'Sie ist bereits eine Bestellung'],
      richtig: 0,
      erklaerung: 'Eine Anfrage dient nur der Information (Preise, Lieferbedingungen) und verpflichtet niemanden.',
    },
    {
      stufe: 'leicht', thema: 'Kaufvertrag',
      frage: 'Ein Lieferer schickt Ihrem Betrieb ein Angebot ohne Einschränkung. Was gilt?',
      antworten: ['Der Lieferer ist an sein Angebot gebunden', 'Das Angebot ist unverbindlich', 'Das Angebot gilt nur mündlich', 'Das Angebot muss notariell bestätigt werden'],
      richtig: 0,
      erklaerung: 'Ein Angebot an eine bestimmte Person ist verbindlich, wenn es keine Freizeichnungsklausel enthält.',
    },
    {
      stufe: 'leicht', thema: 'Kaufvertrag',
      frage: 'Was bedeutet die Klausel „Angebot freibleibend“?',
      antworten: ['Das Angebot ist unverbindlich', 'Die Lieferung ist kostenlos', 'Die Ware wird frei Haus geliefert', 'Der Käufer darf die Ware zurückgeben'],
      richtig: 0,
      erklaerung: '„Freibleibend“ oder „unverbindlich“ ist eine Freizeichnungsklausel: Der Anbieter ist nicht gebunden.',
    },
    {
      stufe: 'leicht', thema: 'Rechnen und Kalkulation',
      frage: 'Ein Artikel kostet 250,00 € netto. Wie hoch ist die Umsatzsteuer bei 19 %?',
      zahl: 47.5, einheit: '€', toleranz: 0.01,
      erklaerung: '250,00 € × 19 % = 47,50 €.',
    },
    {
      stufe: 'leicht', thema: 'Rechnen und Kalkulation',
      frage: 'Eine Rechnung über 800,00 € wird unter Abzug von 2 % Skonto bezahlt. Wie hoch ist der Überweisungsbetrag?',
      zahl: 784, einheit: '€', toleranz: 0.01,
      erklaerung: 'Skonto: 800,00 € × 2 % = 16,00 €. Überweisung: 800,00 € − 16,00 € = 784,00 €.',
    },
    {
      stufe: 'leicht', thema: 'Rechnen und Kalkulation',
      frage: '3 kg Kaffee kosten 7,50 €. Wie viel kosten 8 kg?',
      zahl: 20, einheit: '€', toleranz: 0.01,
      erklaerung: 'Dreisatz: 7,50 € ÷ 3 = 2,50 € je kg; 2,50 € × 8 = 20,00 €.',
    },
    {
      stufe: 'leicht', thema: 'Tabellenkalkulation',
      frage: 'Mit welcher Formel addieren Sie die Werte in A1 bis A10?',
      antworten: ['=SUMME(A1:A10)', '=ANZAHL(A1:A10)', '=A1+A10', '=SUMME(A1;A10)'],
      richtig: 0,
      erklaerung: 'Der Doppelpunkt steht für einen Bereich. =SUMME(A1;A10) addiert nur die zwei Zellen A1 und A10.',
    },
    {
      stufe: 'leicht', thema: 'Tabellenkalkulation',
      frage: 'Welcher Zellbezug bleibt beim Kopieren in jede Richtung unverändert?',
      antworten: ['$B$1', 'B1', '$B1', 'B$1'],
      richtig: 0,
      erklaerung: 'Mit $ vor Spalte und Zeile ist der Bezug absolut. $B1 und B$1 sind gemischte Bezüge.',
    },
    {
      stufe: 'leicht', thema: 'Tabellenkalkulation',
      frage: 'Was bedeutet die Fehlermeldung #DIV/0!?',
      antworten: ['In der Formel wird durch null oder eine leere Zelle geteilt', 'Die Spalte ist zu schmal', 'Ein Name in der Formel ist unbekannt', 'Ein Suchwert wurde nicht gefunden'],
      richtig: 0,
      erklaerung: 'Teilen durch 0 ist nicht möglich. Eine zu schmale Spalte zeigt dagegen ####, ein nicht gefundener Suchwert #NV.',
    },
    {
      stufe: 'leicht', thema: 'Textverarbeitung',
      frage: 'Was enthält die Datenquelle eines Serienbriefs?',
      antworten: ['Die Empfängerdaten, z. B. Anrede, Name und Anschrift', 'Den gleichbleibenden Brieftext', 'Die Formatvorlagen des Dokuments', 'Das Logo des Unternehmens'],
      richtig: 0,
      erklaerung: 'Der Hauptbrief enthält den festen Text mit Seriendruckfeldern, die Datenquelle (z. B. eine Tabelle) die Empfängerdaten.',
    },
    {
      stufe: 'leicht', thema: 'Textverarbeitung',
      frage: 'Worauf baut ein automatisches Inhaltsverzeichnis auf?',
      antworten: ['Auf Überschriften, die mit Formatvorlagen (Überschrift 1, 2 …) formatiert sind', 'Auf fett gedruckten Zeilen', 'Auf den Seitenzahlen in der Fußzeile', 'Auf Textmarken im Dokument'],
      richtig: 0,
      erklaerung: 'Das Programm erkennt Überschriften an ihren Formatvorlagen und erstellt daraus das Verzeichnis.',
    },
    {
      stufe: 'leicht', thema: 'Büroorganisation',
      frage: 'Eine Aufgabe ist nach dem Eisenhower-Prinzip wichtig und dringend. Was tun Sie?',
      antworten: ['Sofort selbst erledigen', 'Delegieren', 'Terminieren und später erledigen', 'Nicht bearbeiten (Papierkorb)'],
      richtig: 0,
      erklaerung: 'Wichtig und dringend: sofort selbst erledigen. Wichtig, nicht dringend: terminieren. Dringend, nicht wichtig: delegieren.',
    },
    {
      stufe: 'leicht', thema: 'Büroorganisation',
      frage: 'Kundenakten werden nach dem Nachnamen der Kunden abgelegt. Welche Ordnung ist das?',
      antworten: ['Alphabetische Ordnung', 'Numerische Ordnung', 'Chronologische Ordnung', 'Sachliche Ordnung'],
      richtig: 0,
      erklaerung: 'Nach Buchstaben: alphabetisch. Nach Nummern: numerisch. Nach Datum: chronologisch.',
    },
    {
      stufe: 'leicht', thema: 'Kommunikation',
      frage: 'Welche numerische Datumsangabe entspricht der DIN 5008?',
      antworten: ['06.11.2026', '06/11/2026', '11.06.2026', '2026.11.06'],
      richtig: 0,
      erklaerung: 'DIN 5008: Tag und Monat zweistellig mit Punkt (06.11.2026) oder international 2026-11-06 mit Bindestrichen.',
    },
    {
      stufe: 'leicht', thema: 'Kommunikation',
      frage: 'Wozu dient das Feld „BCC“ in einer E-Mail?',
      antworten: ['Die Empfänger sehen nicht, wer die E-Mail noch als BCC erhalten hat', 'Die E-Mail wird verschlüsselt', 'Die E-Mail wird mit hoher Priorität gesendet', 'Es fordert eine Lesebestätigung an'],
      richtig: 0,
      erklaerung: 'BCC = Blindkopie. Bei Rundmails an Kunden schützt BCC die E-Mail-Adressen der anderen Empfänger.',
    },
    {
      stufe: 'leicht', thema: 'Datenschutz',
      frage: 'Welche Angabe ist ein personenbezogenes Datum nach der DSGVO?',
      antworten: ['Die E-Mail-Adresse einer Kundin', 'Der Jahresumsatz des Unternehmens', 'Die Artikelnummer eines Druckers', 'Der Lagerort eines Artikels'],
      richtig: 0,
      erklaerung: 'Personenbezogen sind alle Angaben, die sich einer bestimmten oder bestimmbaren Person zuordnen lassen.',
    },
    {
      stufe: 'leicht', thema: 'Recht und Steuern',
      frage: 'Wie lange müssen Buchungsbelege (z. B. Eingangsrechnungen) seit 2025 grundsätzlich aufbewahrt werden?',
      antworten: ['8 Jahre', '6 Jahre', '10 Jahre', '2 Jahre'],
      richtig: 0,
      erklaerung: 'Durch das Bürokratieentlastungsgesetz IV wurde die Frist für Buchungsbelege ab 2025 von 10 auf 8 Jahre verkürzt (§ 147 AO, § 257 HGB). Bücher und Jahresabschlüsse bleiben bei 10 Jahren, Geschäftsbriefe bei 6 Jahren.',
    },
    {
      stufe: 'leicht', thema: 'Lager und Bestand',
      frage: 'Täglicher Verbrauch 20 Stück, Lieferzeit 5 Tage, Mindestbestand 50 Stück. Wie hoch ist der Meldebestand?',
      zahl: 150, einheit: 'Stück', toleranz: 0.01,
      erklaerung: 'Meldebestand = Tagesverbrauch × Lieferzeit + Mindestbestand = 20 × 5 + 50 = 150 Stück.',
    },
    {
      stufe: 'leicht', thema: 'Lager und Bestand',
      frage: 'Was ist der Mindestbestand (eiserne Bestand)?',
      antworten: ['Ein Vorrat, der für Störungen wie Lieferverzögerungen immer vorhanden sein soll', 'Der Bestand, bei dem bestellt werden muss', 'Der größte Bestand, der ins Lager passt', 'Der Bestand am Jahresende'],
      richtig: 0,
      erklaerung: 'Der Mindestbestand soll nicht unterschritten werden. Beim Meldebestand wird bestellt.',
    },
    {
      stufe: 'leicht', thema: 'Rechnen und Kalkulation',
      frage: 'Der Preis eines Artikels steigt von 40,00 € auf 46,00 €. Um wie viel Prozent ist er gestiegen?',
      zahl: 15, einheit: '%', toleranz: 0.01,
      erklaerung: 'Erhöhung 6,00 €. 6,00 € ÷ 40,00 € × 100 = 15 %.',
    },
    {
      stufe: 'leicht', thema: 'Zahlung und Verzug',
      frage: 'Was bedeutet die Zahlungsbedingung „zahlbar innerhalb 30 Tagen netto Kasse“?',
      antworten: ['Der Betrag ist innerhalb von 30 Tagen ohne Abzug zu zahlen', 'Innerhalb von 30 Tagen dürfen 3 % abgezogen werden', 'Die Umsatzsteuer entfällt', 'Der Betrag ist sofort bar zu zahlen'],
      richtig: 0,
      erklaerung: '„Netto Kasse“ heißt: ohne Abzug von Skonto. Mit Netto ist hier nicht „ohne Umsatzsteuer“ gemeint.',
    },

    // ======================= MITTEL =======================
    {
      stufe: 'mittel', thema: 'Rechnen und Kalkulation',
      frage: 'Listeneinkaufspreis 1.200,00 €, Liefererrabatt 10 %, Liefererskonto 2 %, Bezugskosten 45,00 €. Wie hoch ist der Bezugspreis?',
      zahl: 1103.4, einheit: '€', toleranz: 0.01,
      erklaerung: '1.200,00 − 10 % (120,00) = 1.080,00 € Zieleinkaufspreis; − 2 % Skonto (21,60) = 1.058,40 € Bareinkaufspreis; + 45,00 € = 1.103,40 € Bezugspreis.',
    },
    {
      stufe: 'mittel', thema: 'Rechnen und Kalkulation',
      frage: 'Ein Bruttobetrag von 595,00 € enthält 19 % Umsatzsteuer. Wie hoch ist die enthaltene Umsatzsteuer?',
      zahl: 95, einheit: '€', toleranz: 0.01,
      erklaerung: 'Netto = 595,00 € ÷ 1,19 = 500,00 €. Umsatzsteuer = 595,00 € − 500,00 € = 95,00 €. (Nicht 19 % von 595 €!)',
    },
    {
      stufe: 'mittel', thema: 'Lager und Bestand',
      frage: 'Jahresanfangsbestand 300 Stück, Summe der 12 Monatsendbestände 4.900 Stück. Wie hoch ist der durchschnittliche Lagerbestand?',
      zahl: 400, einheit: 'Stück', toleranz: 0.01,
      erklaerung: '(Anfangsbestand + 12 Monatsendbestände) ÷ 13 = (300 + 4.900) ÷ 13 = 400 Stück.',
    },
    {
      stufe: 'mittel', thema: 'Lager und Bestand',
      frage: 'Jahresverbrauch 3.600 Stück, durchschnittlicher Lagerbestand 400 Stück. Wie hoch ist die Umschlagshäufigkeit?',
      zahl: 9, einheit: '', toleranz: 0.01,
      erklaerung: 'Umschlagshäufigkeit = Jahresverbrauch ÷ durchschnittlicher Lagerbestand = 3.600 ÷ 400 = 9.',
    },
    {
      stufe: 'mittel', thema: 'Lager und Bestand',
      frage: 'Die Umschlagshäufigkeit beträgt 9. Wie viele Tage beträgt die durchschnittliche Lagerdauer (Jahr = 360 Tage)?',
      zahl: 40, einheit: 'Tage', toleranz: 0.01,
      erklaerung: 'Durchschnittliche Lagerdauer = 360 ÷ Umschlagshäufigkeit = 360 ÷ 9 = 40 Tage.',
    },
    {
      stufe: 'mittel', thema: 'Kaufvertrag',
      frage: 'Ihr Betrieb (Kaufmann) erhält von einem Großhändler eine Lieferung. Was verlangt § 377 HGB?',
      antworten: ['Die Ware unverzüglich prüfen und erkennbare Mängel unverzüglich rügen', 'Mängel innerhalb von zwei Jahren melden', 'Mängel innerhalb von 14 Tagen schriftlich melden', 'Die Ware muss nicht geprüft werden'],
      richtig: 0,
      erklaerung: 'Beim zweiseitigen Handelskauf gilt die Untersuchungs- und Rügepflicht. Wer zu spät rügt, verliert seine Rechte aus dem Mangel.',
    },
    {
      stufe: 'mittel', thema: 'Kaufvertrag',
      frage: 'Welches Recht hat der Käufer bei einer mangelhaften Lieferung zuerst?',
      antworten: ['Nacherfüllung: Nachbesserung oder Ersatzlieferung', 'Sofortiger Rücktritt vom Vertrag', 'Schadensersatz ohne Fristsetzung', 'Minderung ohne Fristsetzung'],
      richtig: 0,
      erklaerung: 'Vorrangig ist die Nacherfüllung (§ 439 BGB). Rücktritt, Minderung und Schadensersatz kommen meist erst nach erfolgloser Frist infrage.',
    },
    {
      stufe: 'mittel', thema: 'Zahlung und Verzug',
      frage: 'Wann kommt ein Unternehmer mit einer Rechnung spätestens in Zahlungsverzug, wenn kein Termin vereinbart ist und nicht gemahnt wurde?',
      antworten: ['30 Tage nach Fälligkeit und Zugang der Rechnung', 'Sofort mit Zugang der Rechnung', '14 Tage nach Lieferung', 'Erst nach der dritten Mahnung'],
      richtig: 0,
      erklaerung: '§ 286 Abs. 3 BGB: spätestens 30 Tage nach Fälligkeit und Zugang einer Rechnung. Mit einer Mahnung kann der Verzug früher eintreten.',
    },
    {
      stufe: 'mittel', thema: 'Zahlung und Verzug',
      frage: 'Wie hoch ist der gesetzliche Verzugszins, wenn kein Verbraucher beteiligt ist (Entgeltforderung zwischen Unternehmen)?',
      antworten: ['9 Prozentpunkte über dem Basiszinssatz', '5 Prozentpunkte über dem Basiszinssatz', '9 % pro Jahr fest', 'Genau der Basiszinssatz'],
      richtig: 0,
      erklaerung: '§ 288 Abs. 2 BGB: 9 Prozentpunkte über dem Basiszinssatz. Ist ein Verbraucher beteiligt, sind es 5 Prozentpunkte (§ 288 Abs. 1 BGB).',
    },
    {
      stufe: 'mittel', thema: 'Rechnen und Kalkulation',
      frage: 'Zahlungsbedingung: „Innerhalb 10 Tagen 2 % Skonto, 30 Tage netto“. Wie hoch ist der Jahreszinssatz des Skontos (Näherungsformel, 360 Tage)?',
      zahl: 36, einheit: '%', toleranz: 0.01,
      erklaerung: 'Skontosatz × 360 ÷ (Zahlungsziel − Skontofrist) = 2 × 360 ÷ 20 = 36 %. Skonto zu nutzen lohnt sich fast immer.',
    },
    {
      stufe: 'mittel', thema: 'Tabellenkalkulation',
      frage: 'In B2 steht 1000. Was zeigt =WENN(B2>=1000;"Rabatt";"kein Rabatt")?',
      antworten: ['Rabatt', 'kein Rabatt', 'WAHR', '#WERT!'],
      richtig: 0,
      erklaerung: '1000 >= 1000 ist wahr, also wird der Dann-Wert „Rabatt“ ausgegeben.',
    },
    {
      stufe: 'mittel', thema: 'Tabellenkalkulation',
      frage: 'Was bewirkt FALSCH als letztes Argument von SVERWEIS?',
      antworten: ['Es wird nur eine genaue Übereinstimmung gesucht', 'Es wird der nächstkleinere Wert gesucht', 'Die Suche läuft von unten nach oben', 'Die Spaltennummer wird ignoriert'],
      richtig: 0,
      erklaerung: 'FALSCH (oder 0) = genaue Übereinstimmung. Bei WAHR wird ein ungefährer Wert gesucht; dann muss die erste Spalte sortiert sein.',
    },
    {
      stufe: 'mittel', thema: 'Tabellenkalkulation',
      frage: 'Was liefert =ZÄHLENWENN(C2:C20;"offen")?',
      antworten: ['Die Anzahl der Zellen in C2:C20, die „offen“ enthalten', 'Die Summe aller offenen Beträge', 'Den Wert WAHR, wenn „offen“ vorkommt', 'Die Zeilennummer des ersten „offen“'],
      richtig: 0,
      erklaerung: 'ZÄHLENWENN zählt Zellen, die das Kriterium erfüllen. Für Summen mit Bedingung gibt es SUMMEWENN.',
    },
    {
      stufe: 'mittel', thema: 'Tabellenkalkulation',
      frage: 'In C2 steht =B2*$E$1. Welche Formel steht nach dem Kopieren in C3?',
      antworten: ['=B3*$E$1', '=B3*$E$2', '=B2*$E$1', '=C3*$E$1'],
      richtig: 0,
      erklaerung: 'Der relative Bezug B2 passt sich an (B3), der absolute Bezug $E$1 bleibt.',
    },
    {
      stufe: 'mittel', thema: 'Textverarbeitung',
      frage: 'Ein neues Kapitel soll immer auf einer neuen Seite beginnen. Wie lösen Sie das sauber?',
      antworten: ['Mit einem Seitenumbruch (oder „Seitenumbruch oberhalb“ in der Formatvorlage)', 'Mit so vielen Leerzeilen, bis eine neue Seite beginnt', 'Mit einem Zeilenumbruch (Umschalt + Enter)', 'Mit einem Tabstopp'],
      richtig: 0,
      erklaerung: 'Leerzeilen verschieben sich bei jeder Änderung. Ein Seitenumbruch bleibt zuverlässig.',
    },
    {
      stufe: 'mittel', thema: 'Büroorganisation',
      frage: 'Welche Aussage beschreibt A-Güter in der ABC-Analyse?',
      antworten: ['Geringer Mengenanteil, hoher Wertanteil', 'Hoher Mengenanteil, hoher Wertanteil', 'Hoher Mengenanteil, geringer Wertanteil', 'Geringer Mengenanteil, geringer Wertanteil'],
      richtig: 0,
      erklaerung: 'Typisch: A-Güter etwa 10–20 % der Menge, aber 70–80 % des Wertes. Sie verdienen die meiste Aufmerksamkeit.',
    },
    {
      stufe: 'mittel', thema: 'Datenschutz',
      frage: 'Ein Kunde möchte wissen, welche Daten Ihr Betrieb über ihn gespeichert hat. Welches Recht macht er geltend?',
      antworten: ['Das Recht auf Auskunft', 'Das Widerrufsrecht', 'Das Recht auf Gewährleistung', 'Das Hausrecht'],
      richtig: 0,
      erklaerung: 'Art. 15 DSGVO: Betroffene haben ein Recht auf Auskunft über ihre gespeicherten Daten.',
    },
    {
      stufe: 'mittel', thema: 'Zahlung und Verzug',
      frage: 'Eine Forderung über 6.000,00 € wird 45 Tage zu spät bezahlt. Zinssatz 12 % pro Jahr (Jahr = 360 Tage). Wie hoch sind die Verzugszinsen?',
      zahl: 90, einheit: '€', toleranz: 0.01,
      erklaerung: 'Zinsen = Kapital × Zinssatz × Tage ÷ (100 × 360) = 6.000 × 12 × 45 ÷ 36.000 = 90,00 €.',
    },
    {
      stufe: 'mittel', thema: 'Rechnen und Kalkulation',
      frage: '4 Mitarbeitende brauchen für eine Inventur 6 Tage. Wie viele Tage brauchen 3 Mitarbeitende?',
      zahl: 8, einheit: 'Tage', toleranz: 0.01,
      erklaerung: 'Umgekehrter Dreisatz: 4 × 6 = 24 Arbeitstage; 24 ÷ 3 = 8 Tage.',
    },
    {
      stufe: 'mittel', thema: 'Beschaffung',
      frage: 'Was gehört zum qualitativen Angebotsvergleich?',
      antworten: ['Die Lieferzuverlässigkeit des Lieferers', 'Der Listeneinkaufspreis', 'Der Liefererrabatt', 'Die Bezugskosten'],
      richtig: 0,
      erklaerung: 'Qualitativ: Qualität, Zuverlässigkeit, Service, Umweltschutz. Quantitativ: alles, was den Bezugspreis bestimmt.',
    },
    {
      stufe: 'mittel', thema: 'Kommunikation',
      frage: 'Wie wird der Betreff in einem Geschäftsbrief nach DIN 5008 geschrieben?',
      antworten: ['Ohne das Wort „Betreff“ und ohne Schlusspunkt', 'Mit dem Wort „Betreff:“ davor', 'In Großbuchstaben mit Ausrufezeichen', 'Unterstrichen und mit Schlusspunkt'],
      richtig: 0,
      erklaerung: 'Der Betreff steht ohne Leitwort und ohne Punkt; er darf hervorgehoben (z. B. fett) werden.',
    },
    {
      stufe: 'mittel', thema: 'Recht und Steuern',
      frage: 'Was ist die Vorsteuer?',
      antworten: ['Die Umsatzsteuer, die ein Unternehmen beim Einkauf an seine Lieferer zahlt', 'Die Umsatzsteuer, die ein Unternehmen seinen Kunden berechnet', 'Eine Steuer auf den Gewinn', 'Eine Vorauszahlung der Einkommensteuer'],
      richtig: 0,
      erklaerung: 'Die Vorsteuer kann mit der Umsatzsteuer aus den Verkäufen verrechnet werden. Der Rest ist die Zahllast.',
    },
    {
      stufe: 'mittel', thema: 'Recht und Steuern',
      frage: 'Umsatzsteuer aus Verkäufen: 3.800,00 €. Vorsteuer aus Einkäufen: 2.150,00 €. Wie hoch ist die Zahllast an das Finanzamt?',
      zahl: 1650, einheit: '€', toleranz: 0.01,
      erklaerung: 'Zahllast = Umsatzsteuer − Vorsteuer = 3.800,00 € − 2.150,00 € = 1.650,00 €.',
    },

    // ======================= SCHWER =======================
    {
      stufe: 'schwer', thema: 'Rechnen und Kalkulation',
      frage: 'Sie bestellen 250 Ordner zu je 8,40 €. Rabatt 15 %, Skonto 3 %, Fracht insgesamt 60,00 €. Wie hoch ist der Bezugspreis je Ordner (auf Cent gerundet)?',
      zahl: 7.17, einheit: '€', toleranz: 0.01,
      erklaerung: '250 × 8,40 = 2.100,00 €; − 15 % (315,00) = 1.785,00 €; − 3 % (53,55) = 1.731,45 €; + 60,00 € = 1.791,45 €; ÷ 250 = 7,17 € je Ordner.',
    },
    {
      stufe: 'schwer', thema: 'Beschaffung',
      frage: 'Angebot A: 2.000,00 €, 10 % Rabatt, 2 % Skonto, frei Haus. Angebot B: 1.900,00 €, 5 % Rabatt, kein Skonto, Fracht 40,00 €. Um wie viel Euro ist das günstigere Angebot billiger?',
      zahl: 81, einheit: '€', toleranz: 0.01,
      erklaerung: 'A: 2.000 − 200 = 1.800; − 2 % (36) = 1.764,00 €. B: 1.900 − 95 = 1.805; + 40 = 1.845,00 €. A ist um 81,00 € günstiger.',
    },
    {
      stufe: 'schwer', thema: 'Zahlung und Verzug',
      frage: 'Ein Geschäftskunde zahlt eine Rechnung über 12.400,00 € 60 Tage zu spät. Basiszinssatz angenommen 1,27 %. Wie hoch sind die gesetzlichen Verzugszinsen (360 Tage, auf Cent gerundet)?',
      zahl: 212.25, einheit: '€', toleranz: 0.01,
      erklaerung: 'Zinssatz = 1,27 % + 9 Prozentpunkte = 10,27 % (§ 288 Abs. 2 BGB). 12.400 × 10,27 × 60 ÷ 36.000 = 212,25 €. Hinweis: Den aktuellen Basiszinssatz veröffentlicht die Deutsche Bundesbank halbjährlich.',
    },
    {
      stufe: 'schwer', thema: 'Rechnen und Kalkulation',
      frage: 'Ein Kunde hat 1.499,40 € brutto (inkl. 19 % USt) bezahlt. Wie hoch ist der Nettobetrag?',
      zahl: 1260, einheit: '€', toleranz: 0.01,
      erklaerung: 'Brutto = 119 %. Netto = 1.499,40 € ÷ 1,19 = 1.260,00 €.',
    },
    {
      stufe: 'schwer', thema: 'Zahlung und Verzug',
      frage: 'Rechnung 15.000,00 €, 3 % Skonto bei Zahlung in 10 Tagen, sonst 40 Tage Ziel. Für die Skontozahlung nehmen Sie für 30 Tage einen Kredit zu 9 % p. a. auf. Wie hoch ist der Finanzierungsgewinn (360 Tage, auf Cent)?',
      zahl: 340.88, einheit: '€', toleranz: 0.01,
      erklaerung: 'Skonto 450,00 €. Kredit über 14.550,00 € für 30 Tage: 14.550 × 9 × 30 ÷ 36.000 = 109,125 €. Gewinn 450,00 − 109,125 = 340,875 ≈ 340,88 €.',
    },
    {
      stufe: 'schwer', thema: 'Lager und Bestand',
      frage: 'Tagesverbrauch 35 Stück, Lieferzeit 8 Tage. Der Mindestbestand soll den Verbrauch von 4 Tagen decken. Wie hoch ist der Meldebestand?',
      zahl: 420, einheit: 'Stück', toleranz: 0.01,
      erklaerung: 'Mindestbestand = 35 × 4 = 140 Stück. Meldebestand = 35 × 8 + 140 = 420 Stück.',
    },
    {
      stufe: 'schwer', thema: 'Lager und Bestand',
      frage: 'Marktzinssatz 6 % p. a., durchschnittliche Lagerdauer 48 Tage. Wie hoch ist der Lagerzinssatz (360 Tage)?',
      zahl: 0.8, einheit: '%', toleranz: 0.01,
      erklaerung: 'Lagerzinssatz = Jahreszinssatz × Lagerdauer ÷ 360 = 6 × 48 ÷ 360 = 0,8 %.',
    },
    {
      stufe: 'schwer', thema: 'Lager und Bestand',
      frage: 'Wareneinsatz im Jahr 540.000,00 €, durchschnittlicher Lagerbestand 60.000,00 €. Wie viele Tage beträgt die durchschnittliche Lagerdauer (360 Tage)?',
      zahl: 40, einheit: 'Tage', toleranz: 0.01,
      erklaerung: 'Umschlagshäufigkeit = 540.000 ÷ 60.000 = 9. Lagerdauer = 360 ÷ 9 = 40 Tage.',
    },
    {
      stufe: 'schwer', thema: 'Kaufvertrag',
      frage: 'Vereinbart ist „Lieferung am 15.03. fix“. Der Lieferer liefert an diesem Tag nicht. Was kann Ihr Betrieb tun?',
      antworten: ['Ohne Nachfrist vom Vertrag zurücktreten', 'Erst nach einer angemessenen Nachfrist zurücktreten', 'Nur Schadensersatz verlangen, aber nicht zurücktreten', 'Nichts, denn der Lieferer ist erst nach einer Mahnung im Verzug'],
      richtig: 0,
      erklaerung: 'Beim Fixkauf ist der Termin wesentlicher Vertragsbestandteil. Eine Nachfrist ist nicht nötig (§ 323 Abs. 2 BGB, beim Handelskauf § 376 HGB).',
    },
    {
      stufe: 'schwer', thema: 'Kaufvertrag',
      frage: 'Beim zweiseitigen Handelskauf zeigt sich ein versteckter Mangel erst nach drei Wochen. Wann muss Ihr Betrieb rügen?',
      antworten: ['Unverzüglich nach der Entdeckung', 'Innerhalb von drei Tagen nach Lieferung', 'Gar nicht mehr, die Rügefrist ist abgelaufen', 'Innerhalb von zwei Jahren nach Lieferung, ohne Eile'],
      richtig: 0,
      erklaerung: '§ 377 Abs. 3 HGB: Versteckte Mängel müssen unverzüglich nach der Entdeckung gerügt werden, sonst gilt die Ware als genehmigt.',
    },
    {
      stufe: 'schwer', thema: 'Zahlung und Verzug',
      frage: 'Wann gilt die 30-Tage-Regel des § 286 Abs. 3 BGB gegenüber einem Verbraucher?',
      antworten: ['Nur wenn in der Rechnung besonders auf diese Folge hingewiesen wurde', 'Immer, genau wie bei Unternehmen', 'Nie, Verbraucher kommen nie in Verzug', 'Nur bei Beträgen über 1.000 €'],
      richtig: 0,
      erklaerung: 'Verbraucher kommen nach 30 Tagen nur in Verzug, wenn die Rechnung darauf hinweist. Eine Mahnung führt unabhängig davon zum Verzug.',
    },
    {
      stufe: 'schwer', thema: 'Zahlung und Verzug',
      frage: 'Welche Pauschale kann ein Gläubiger zusätzlich verlangen, wenn ein Unternehmen (kein Verbraucher) mit einer Entgeltforderung in Verzug ist?',
      antworten: ['40 Euro', '5 Euro', '100 Euro', '1 % der Forderung'],
      richtig: 0,
      erklaerung: '§ 288 Abs. 5 BGB: Verzugspauschale von 40 Euro, wenn der Schuldner kein Verbraucher ist.',
    },
    {
      stufe: 'schwer', thema: 'Tabellenkalkulation',
      frage: '=SVERWEIS(A2;$F$2:$H$50;3;FALSCH) zeigt #NV. Was ist die wahrscheinlichste Ursache?',
      antworten: ['Der Wert aus A2 steht nicht in der ersten Spalte F des Suchbereichs', 'Der Bereich hat weniger als 3 Spalten', 'In A2 steht eine Formel', 'Die Spalte H ist zu schmal'],
      richtig: 0,
      erklaerung: '#NV = Wert nicht verfügbar. SVERWEIS sucht nur in der ersten Spalte des Bereichs. Ist der Index größer als die Spaltenzahl, kommt #BEZUG!.',
    },
    {
      stufe: 'schwer', thema: 'Tabellenkalkulation',
      frage: 'Provision: 5 % bei einem Umsatz über 10.000 €, sonst 2 %. Der Umsatz steht in B2. Welche Formel ist richtig?',
      antworten: ['=WENN(B2>10000;B2*5%;B2*2%)', '=WENN(B2>10000;5%;2%)', '=WENN(B2<10000;B2*5%;B2*2%)', '=WENN(B2>10000;B2*2%;B2*5%)'],
      richtig: 0,
      erklaerung: 'Bedingung B2>10000; Dann-Wert B2*5 %; Sonst-Wert B2*2 %. Die zweite Formel liefert nur den Prozentsatz, nicht die Provision.',
    },
    {
      stufe: 'schwer', thema: 'Tabellenkalkulation',
      frage: 'Für eine Einmaleins-Tabelle stehen die Zahlen in Spalte A und Zeile 1. Welche Formel in B2 kann nach rechts UND unten kopiert werden?',
      antworten: ['=$A2*B$1', '=A2*B1', '=$A$2*$B$1', '=A$2*$B1'],
      richtig: 0,
      erklaerung: 'Die Spalte A muss fest bleiben ($A2), die Zeile 1 ebenfalls (B$1). Das nennt man gemischte Bezüge.',
    },
    {
      stufe: 'schwer', thema: 'Textverarbeitung',
      frage: 'Im Serienbrief soll automatisch „Sehr geehrte Frau …“ oder „Sehr geehrter Herr …“ stehen. Wie lösen Sie das?',
      antworten: ['Mit einem Bedingungsfeld (Wenn … Dann … Sonst) auf das Feld Anrede', 'Mit zwei getrennten Hauptdokumenten', 'Mit einer Fußnote', 'Mit der Silbentrennung'],
      richtig: 0,
      erklaerung: 'Das Bedingungsfeld prüft z. B. „Anrede = Frau“ und setzt den passenden Text ein.',
    },
    {
      stufe: 'schwer', thema: 'Büroorganisation',
      frage: 'Ein Artikel macht 8 % der Lagermenge, aber 72 % des Lagerwerts aus. Wie gehen Sie mit ihm um?',
      antworten: ['A-Gut: genaue Bedarfsplanung, häufig kleine Mengen bestellen, Preise intensiv vergleichen', 'C-Gut: selten in großen Mengen bestellen, wenig Aufwand', 'B-Gut: keine besondere Behandlung', 'A-Gut: möglichst große Vorräte anlegen'],
      richtig: 0,
      erklaerung: 'Hoher Wertanteil bei kleiner Menge = A-Gut. Große Vorräte würden viel Kapital binden.',
    },
    {
      stufe: 'schwer', thema: 'Datenschutz',
      frage: 'Ein Laptop mit unverschlüsselten Kundendaten wurde gestohlen. Bis wann muss der Betrieb das in der Regel der Aufsichtsbehörde melden?',
      antworten: ['Möglichst innerhalb von 72 Stunden nach Bekanntwerden', 'Innerhalb von 14 Tagen', 'Erst wenn ein Kunde sich beschwert', 'Gar nicht, Diebstahl ist Sache der Polizei'],
      richtig: 0,
      erklaerung: 'Art. 33 DSGVO: Datenschutzverletzungen sind unverzüglich und möglichst binnen 72 Stunden zu melden, außer es besteht voraussichtlich kein Risiko für die Betroffenen.',
    },
    {
      stufe: 'schwer', thema: 'Recht und Steuern',
      frage: 'Bis zu welchem Gesamtbetrag (brutto) gilt eine Rechnung als Kleinbetragsrechnung mit weniger Pflichtangaben?',
      antworten: ['250 Euro', '150 Euro', '500 Euro', '1.000 Euro'],
      richtig: 0,
      erklaerung: '§ 33 UStDV: Kleinbetragsrechnungen bis 250 Euro brutto brauchen z. B. keine Anschrift des Empfängers und keinen getrennten Steuerbetrag.',
    },
    {
      stufe: 'schwer', thema: 'Kommunikation',
      frage: 'Aus wie vielen Zeilen besteht das Anschriftfeld eines Geschäftsbriefs nach DIN 5008?',
      antworten: ['9 Zeilen (3 Zusatz- und Vermerkzone, 6 Anschriftzone)', '6 Zeilen', '5 Zeilen', '12 Zeilen'],
      richtig: 0,
      erklaerung: 'Das Anschriftfeld hat 9 Zeilen: 3 für Zusätze und Vermerke (z. B. Einschreiben), 6 für die Anschrift.',
    },
    {
      stufe: 'schwer', thema: 'Rechnen und Kalkulation',
      frage: 'Bezugspreis 80,00 €, Handlungskostenzuschlag 25 %, Gewinnzuschlag 10 %. Wie hoch ist der Barverkaufspreis?',
      zahl: 110, einheit: '€', toleranz: 0.01,
      erklaerung: '80,00 € + 25 % = 100,00 € Selbstkosten; + 10 % Gewinn = 110,00 € Barverkaufspreis.',
    },
    {
      stufe: 'schwer', thema: 'Rechnen und Kalkulation',
      frage: 'Nach Abzug von 20 % Rabatt zahlt ein Kunde 640,00 €. Wie hoch war der Listenpreis?',
      zahl: 800, einheit: '€', toleranz: 0.01,
      erklaerung: '640,00 € sind 80 % des Listenpreises. 640,00 € ÷ 0,8 = 800,00 €. (Nicht 640 + 20 % = 768!)',
    },
    {
      stufe: 'schwer', thema: 'Beschaffung',
      frage: 'Ihr Betrieb bestellt auf ein freibleibendes Angebot. Wann ist der Kaufvertrag geschlossen?',
      antworten: ['Erst wenn der Lieferer die Bestellung annimmt, z. B. durch Auftragsbestätigung oder Lieferung', 'Sofort mit dem Absenden der Bestellung', 'Schon mit dem freibleibenden Angebot', 'Erst mit der Bezahlung'],
      richtig: 0,
      erklaerung: 'Das freibleibende Angebot ist kein Antrag. Die Bestellung ist hier der Antrag; die Annahme durch den Lieferer schließt den Vertrag.',
    },
  ] as ZpAufgabe[],
};
