// Gemeinsame Termine: Lesen, Eintragen und Löschen über die Supabase-REST-Schnittstelle (nur fetch, keine Bibliothek).
import { SUPABASE_KEY, SUPABASE_URL } from './config';

export type OnlineTermin = {
  id: number;
  datum: string; // JJJJ-MM-TT
  fach: string;
  thema: string;
  notiz: string | null;
};

export const onlineAktiv = Boolean(SUPABASE_URL && SUPABASE_KEY);

function kopf(): HeadersInit {
  // Neue Supabase-Schlüssel ("sb_publishable_...") gehören nur in "apikey", alte anon-Keys (JWT) zusätzlich in "Authorization".
  const k: Record<string, string> = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' };
  if (!SUPABASE_KEY.startsWith('sb_')) k.Authorization = `Bearer ${SUPABASE_KEY}`;
  return k;
}

// Antwort in eine verständliche deutsche Fehlermeldung übersetzen
async function fehler(r: Response): Promise<Error> {
  let text = '';
  try {
    const j = await r.json();
    text = `${j.message ?? ''} ${j.hint ?? ''}`;
  } catch {}
  if (text.includes('Klassencode')) return new Error('Falscher Klassencode.');
  if (text.includes('Admin-Code')) return new Error('Falscher Admin-Code.');
  if (text.includes('Zu viele')) return new Error('Gerade wurden sehr viele Termine eingetragen. Bitte später noch einmal versuchen.');
  if (text.includes('check constraint')) return new Error('Bitte die Eingaben prüfen (Fach höchstens 60, Thema höchstens 200 Zeichen).');
  if (r.status >= 500) return new Error('Die Termin-Datenbank antwortet gerade nicht. Vielleicht ist das Supabase-Projekt pausiert.');
  return new Error(`Das hat nicht geklappt (Fehler ${r.status}).`);
}

async function anfrage(pfad: string, init?: RequestInit): Promise<Response> {
  let r: Response;
  try {
    r = await fetch(`${SUPABASE_URL}${pfad}`, { ...init, headers: kopf(), cache: 'no-store' });
  } catch {
    throw new Error('Keine Verbindung zur Termin-Datenbank. Internet prüfen, oder das Supabase-Projekt ist pausiert.');
  }
  if (!r.ok) throw await fehler(r);
  return r;
}

export async function termineLaden(): Promise<OnlineTermin[]> {
  const r = await anfrage('/rest/v1/termine?select=id,datum,fach,thema,notiz&order=datum.asc');
  return r.json();
}

export async function terminAnlegen(code: string, t: { datum: string; fach: string; thema: string; notiz: string }) {
  await anfrage('/rest/v1/rpc/termin_anlegen', {
    method: 'POST',
    body: JSON.stringify({ p_code: code, p_datum: t.datum, p_fach: t.fach, p_thema: t.thema, p_notiz: t.notiz || null }),
  });
}

export async function terminLoeschen(code: string, id: number) {
  await anfrage('/rest/v1/rpc/termin_loeschen', {
    method: 'POST',
    body: JSON.stringify({ p_code: code, p_id: id }),
  });
}
