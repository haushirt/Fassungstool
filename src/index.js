/* ═══════════════════════════════════════════════════════════════════════
   Fassungstool · Haus Hirt · Worker
   Alles unter /api/*. Die Seiten selbst kommen vom Asset-Server.

   Grundsätze, die hier tragen:
     · Codes gibt es nur als PBKDF2-Prüfsumme, nie im Klartext
     · Die Antwort auf eine Anmeldung verrät nie, ob ein Code existiert
     · Das Ereignisjournal ist append-only
     · Zeitstempel niemals mit |0 — Date.now() ist grösser als 2³¹
   ═══════════════════════════════════════════════════════════════════════ */

import PostalMime from "postal-mime";
import { parseZ, kern } from "./gnparse.js";
import { mappe } from "./gnmap.js";

/* PBKDF2-Runden. Cloudflare erlaubt höchstens 100000, der Free-Plan
   schafft rechnerisch aber nur wenige tausend (10 ms CPU, vier
   Personen je Anmeldung). 1000 reicht hier: die Codes sind
   Identifikation mit Rechten, kein Schutz vor Angreifern — dafür
   sorgt die Sperre nach zehn Fehlversuchen. Zieht das Tool auf einen
   eigenen Server, gehört diese Zahl wieder auf 100000. */
const RUNDEN = 1000;
const SITZUNG = 12 * 60 * 60 * 1000;
/* Die Sperre zählt pro IP, und im Haus teilen sich alle Geräte eine. Fünf
   Versuche waren deshalb nicht fünf pro Person, sondern fünf für das ganze
   Team — ein Vertipper an der Bar sperrte den Keller mit aus. Zehn ist der
   Kompromiss: immer noch eine Sperre, aber keine, die im Betrieb zuschnappt. */
const SPERRE = { versuche: 10, fenster: 15 * 60 * 1000 };

const json = (o, s = 200, h = {}) =>
  new Response(JSON.stringify(o), {
    status: s,
    headers: { "content-type": "application/json;charset=utf-8", ...h }
  });

const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const vonB64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const roh = s => new TextEncoder().encode(s);

async function hashe(code, salt) {
  const k = await crypto.subtle.importKey("raw", roh(code), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: vonB64(salt), iterations: RUNDEN }, k, 256);
  return b64(bits);
}

/* Zeitkonstanter Vergleich. Ein früher Ausstieg verrät, wie viele Zeichen
   gestimmt haben. */
function gleich(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/* ── Sitzung: HMAC-signiertes Token im httpOnly-Cookie ────────────────── */
async function hmacKey(env) {
  return crypto.subtle.importKey("raw", roh(env.TOKEN_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
async function tokenBauen(env, person) {
  const nutz = b64(roh(JSON.stringify({ id: person.id, bis: Date.now() + SITZUNG })));
  const sig = b64(await crypto.subtle.sign("HMAC", await hmacKey(env), roh(nutz)));
  return nutz + "." + sig;
}
async function tokenPruefen(env, token) {
  if (!token || !token.includes(".")) return null;
  const [nutz, sig] = token.split(".");
  const ok = await crypto.subtle.verify("HMAC", await hmacKey(env), vonB64(sig), roh(nutz));
  if (!ok) return null;
  try {
    const d = JSON.parse(new TextDecoder().decode(vonB64(nutz)));
    return d.bis > Date.now() ? d : null;
  } catch { return null; }
}
function keks(token) {
  return token
    ? `hh_sitz=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SITZUNG / 1000}`
    : `hh_sitz=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}
async function ich(request, env) {
  const c = (request.headers.get("cookie") || "")
    .split(";").map(s => s.trim()).find(s => s.startsWith("hh_sitz="));
  const d = await tokenPruefen(env, c && c.slice(8));
  if (!d) return null;
  return env.DB.prepare(
    `SELECT id, name, rolle FROM person WHERE id = ?1 AND aktiv = 1`
  ).bind(d.id).first();
}
const darf = (p, ...rollen) => !!p && rollen.includes(p.rolle);

/* ── Anmeldung ───────────────────────────────────────────────────────── */
async function anmelden(request, env) {
  const ip = request.headers.get("cf-connecting-ip") || "?";
  const seit = Date.now() - SPERRE.fenster;

  const { results: letzte } = await env.DB.prepare(
    `SELECT ok, ts FROM anmeldeversuch WHERE ip = ?1 AND ts > ?2`).bind(ip, seit).all();
  const fehl = letzte.filter(r => !r.ok).map(r => +r.ts).sort((a, b) => a - b);

  if (fehl.length >= SPERRE.versuche) {
    /* Die Sperre endet nicht pauschal in 15 Minuten, sondern sobald der
       älteste noch mitzählende Fehlversuch aus dem Fenster fällt. Genau
       diese Uhrzeit zeigt die App an — sonst steht jemand davor und weiss
       nicht, wie lange noch. */
    const wartenBis = fehl[fehl.length - SPERRE.versuche] + SPERRE.fenster;
    return json({ fehler: "zu viele Versuche", wartenBis }, 429);
  }

  let code = "";
  try { code = (await request.json()).code || ""; } catch {}

  /* Jeder Code wird gegen jede Person gerechnet. Das kostet Zeit, aber es
     gibt keinen Weg, aus der Antwort zu lesen, ob es den Code gibt. */
  const { results: leute } = await env.DB.prepare(
    `SELECT id, name, rolle, code_hash, salt FROM person WHERE aktiv = 1`).all();

  let treffer = null;
  for (const p of leute) {
    if (gleich(await hashe(code, p.salt), p.code_hash)) treffer = p;
  }

  await env.DB.prepare(
    `INSERT INTO anmeldeversuch (ip, ts, ok) VALUES (?1, ?2, ?3)`
  ).bind(ip, Date.now(), treffer ? 1 : 0).run();

  /* Wieviele Versuche bleiben? Die Antwort verrät nichts über den Code —
     nur über die Sperre. Ohne diese Zahl merkt niemand, dass er auf sie
     zuläuft, und steht dann ohne Erklärung vor der verschlossenen Tür. */
  if (!treffer) return json(
    { fehler: "unbekannt", uebrig: Math.max(0, SPERRE.versuche - (fehl.length + 1)) }, 401);

  /* Eine geglückte Anmeldung räumt die Fehlversuche dieser IP weg. Sonst
     bleibt das Haus an einer geteilten IP hängen: Wer sich richtig
     anmeldet, beweist, dass hier kein Fremder probiert. */
  await env.DB.prepare(
    `DELETE FROM anmeldeversuch WHERE ip = ?1 AND ok = 0`).bind(ip).run();

  return json({ name: treffer.name, rolle: treffer.rolle }, 200,
    { "set-cookie": keks(await tokenBauen(env, treffer)) });
}

/* ── Vorgänge ──────────────────────────────────────────────────────────
   Spaltennamen nach `docs/live-schema.sql`: die Tabelle heisst die Art
   eines Vorgangs `modus` (nicht `art`), den Zeitstempel der letzten
   Änderung `geaendert` (nicht `ts`), und eine Spalte `person` gibt es
   nicht — wer gefasst hat, steht in `wer`.

   Die Antwort bleibt FLACH: der gespeicherte Zustand `daten` mit den
   Spaltenwerten darübergelegt. Genau das erwarten `public/index.html`
   (`fernNeuer`, Archiv) und `public/leitung.html`. */
async function vorgaengeLesen(env, url) {
  const von = url.searchParams.get("von") || "1970-01-01";
  const bis = url.searchParams.get("bis") || "9999-12-31";
  const { results } = await env.DB.prepare(
    `SELECT id, tag, modus, wer, daten, abgeschlossen, geaendert FROM vorgang
      WHERE tag BETWEEN ?1 AND ?2 ORDER BY tag ASC, geaendert ASC`
  ).bind(von, bis).all();

  return json({
    vorgaenge: results.map(r => Object.assign(JSON.parse(r.daten || "{}"), {
      id: r.id, tag: r.tag, mode: r.modus, name: r.wer,
      finished: !!r.abgeschlossen, archiviert: new Date(r.geaendert).toISOString()
    }))
  });
}

/* Der Client schickt seine eigene UUID. Doppeltes Senden schadet damit
   nicht — wichtig für die Warteschlange, die offline weiterläuft. */
async function vorgangSchreiben(env, p, id, daten) {
   if (!daten || !daten.mode || !daten.tag) return json({ fehler: "unvollständig" }, 422);

  /* Der Client zählt je Vorgang hoch. Ein Gerät, das offline war und
     seinen alten Stand nachreicht, darf den neueren nicht überschreiben:
     im Zweifel gewinnt die höhere Zählnummer, nicht die spätere Ankunft.
     Die App fragt den Benutzer dann beim nächsten Start, ob sie den
     Serverstand übernehmen soll. */
  const alt = await env.DB.prepare(
    `SELECT daten FROM vorgang WHERE id = ?1`).bind(id).first();
  if (alt) {
    const a = JSON.parse(alt.daten || "{}");
    if ((+a.zaehlnr || 0) > (+daten.zaehlnr || 0))
      return json({ konflikt: true, server: a }, 409);
  }

  const jetzt = Date.now();

  /* Die Spalten sind eine Abbildung von `daten`, nicht eine zweite
     Wahrheit daneben. Deshalb werden sie bei jedem Schreiben aus dem
     Zustand neu abgeleitet und können ihm nie widersprechen:
       · `status`  — CHECK (offen|abgeschlossen|freigegeben). Geschrieben
         werden nur die ersten beiden. `freigegeben` bleibt der Freigabe
         durch die Leitung vorbehalten, die es noch nicht gibt; das
         „trotzdem abschliessen" der App (`daten.uebersteuert`) ist etwas
         anderes und darf nicht so aussehen.
       · `abgeschlossen` — INTEGER, also ein Zeitstempel, kein Ja/Nein.
         `vorgaengeLesen` liest ihn als `!!` und kommt mit beidem zurecht.
       · `begonnen`  — NOT NULL, steht nur im INSERT: der Anfang bleibt
         der Anfang, auch wenn später korrigiert wird.
       · `branch`, `schluessel`, `zaehlnr`, `geraet` werden NICHT
         geschrieben (Regel 14; alle vier sind nullable bzw. haben einen
         Vorgabewert). Der 409-Wächter oben hängt am `zaehlnr` IM JSON. */
  const fertig = !!daten.finished;
  const vorgangZeile = env.DB.prepare(
    `INSERT INTO vorgang (id, modus, tag, wer, begonnen, geaendert, abgeschlossen, status, daten)
     VALUES (?1,?2,?3,?4,?5,?5,?6,?7,?8)
     ON CONFLICT(id) DO UPDATE SET
       daten = excluded.daten, abgeschlossen = excluded.abgeschlossen,
       status = excluded.status, wer = excluded.wer,
       geaendert = excluded.geaendert`
  ).bind(id, daten.mode, daten.tag, daten.name || p.name, jetzt,
         fertig ? jetzt : null, fertig ? "abgeschlossen" : "offen",
         JSON.stringify(daten));

  /* Ereignisse entstehen erst beim Abschluss. Ein laufender Vorgang darf
     den Bestand nicht bewegen — sonst zählt jeder Zwischenstand mit.

     Vorgang und Journal gehen in EINEM `batch` hinaus. Zwei getrennte
     `run()` sind in D1 keine Transaktion: scheitert das zweite, ist der
     Vorgang gespeichert und das Journal leer — genau das Auseinanderlaufen
     von Anzeige und Bestand, das Runde 2 beheben sollte. Ein `batch`
     nimmt D1 als Ganzes zurück; der Client schickt dann dasselbe Paket
     erneut und findet einen unveränderten Zustand vor. */
  const journal = fertig ? await ereignisseAbleiten(env, id, daten, p) : [];
  await env.DB.batch([vorgangZeile, ...journal]);
  return json({ id, gespeichert: true });
}

/* Dieselben Spalten, zwei Herkünfte. `quelle` sagt später, ob eine Zeile
   aus dem ersten Abschluss stammt oder aus einer Korrektur danach — ohne
   sie sähe im Journal beides gleich aus. Zwei ausgeschriebene Abfragen
   statt einer zusammengesetzten: SQL wird hier nie gebaut, immer
   gebunden. */
const SQL_EREIGNIS =
  `INSERT INTO ereignis (id, ts, tag, art, quelle, vorgang, artikel, ort, menge, wer)
   VALUES (?1,?2,?3,?4,'vorgang',?5,?6,?7,?8,?9)`;
const SQL_EREIGNIS_KORR =
  `INSERT INTO ereignis (id, ts, tag, art, quelle, vorgang, artikel, ort, menge, wer)
   VALUES (?1,?2,?3,?4,'vorgang-korrektur',?5,?6,?7,?8,?9)`;

/* Ereignisse aus dem Zustand eines abgeschlossenen Vorgangs ableiten.

   Zwei Anforderungen, die sich zu widersprechen scheinen:
   · Dasselbe Paket zweimal darf nichts verdoppeln. Die Warteschlange
     schickt nach einem Netzabbruch gern ein zweites Mal.
   · Eine Korrektur nach dem Abschluss muss im Bestand ankommen. Vorher
     stieg diese Funktion aus, sobald es zum Vorgang schon Ereignisse gab:
     der Vorgang wurde überschrieben, das Journal blieb stehen, Anzeige
     und Bestand liefen still auseinander.

   Beides zusammen geht, wenn nicht die ANWESENHEIT von Ereignissen
   entscheidet, sondern ihr INHALT: gebucht wird die Differenz zwischen
   dem, was das Journal für diesen Vorgang schon sagt, und dem, was der
   neue Zustand sagt. Ist die Differenz null, passiert nichts — das ist
   der Fall „dasselbe noch einmal". Sonst kommt die Gegenbuchung als
   NEUE Zeile dazu; gelöscht oder geändert wird nie (Regel 6).

   Warum nicht die `zaehlnr`? Sie wächst bei jedem Zwischenstand, auch
   wenn sich keine Menge ändert, und zwei Geräte zählen unabhängig
   voneinander hoch. Sie beantwortet „ist das ein neues Paket?", nicht
   „ist das ein anderer Zustand?". Nur der Inhalt beantwortet das. */
async function ereignisseAbleiten(env, vid, d, p) {
  const zeilen = [];
  /* `ereignis.ort` ist NOT NULL. Alle Aufrufer geben „keller" oder
     „lager" mit; der leere String ist nur der Notnagel, damit eine
     vergessene Angabe keine D1-Ausnahme mitten im Abschluss wird. */
  const zu = (art, artikel, menge, ort) => {
    menge = +menge || 0;
    if (menge) zeilen.push({ art, artikel, menge, ort: ort || "" });
  };

  if (d.mode === "tag" || d.mode === "fuellen") {
    const t = {};
    ["barrot", "bar", "backup", "rest"].forEach(k =>
      Object.keys(d[k] || {}).forEach(id => (t[id] = (t[id] || 0) + (+d[k][id] || 0))));
    Object.keys(t).forEach(id =>
      zu("entnahme", id, d.holtN && d.holtN[id] != null ? d.holtN[id] : t[id], "keller"));
    Object.keys(d.zusatz || {}).forEach(id => zu("entnahme", id, d.zusatz[id], "keller"));
  }
  if (d.mode === "nach") Object.keys(d.ent || {}).forEach(id => zu("entnahme", id, d.ent[id], "keller"));
  if (d.mode === "keller") {
    Object.keys(d.zdone || {}).forEach(id =>
      zu("zaehlung", id, (+(d.reihen || {})[id] || 0) * 6 + (+(d.einzel || {})[id] || 0), "keller"));
  }
  if (d.mode === "ware") {
    (d.pos || []).forEach(x => {
      if (!x.id || x.id === "__neu" || !(+x.kisten > 0)) return;
      zu("eingang", x.id, (+x.kisten) * (+x.kg || 6), "keller");
    });
  }
  Object.keys(d.gent || {}).forEach(id => zu("entnahme", id, d.gent[id], "lager"));
  Object.keys(d.gzusatz || {}).forEach(id => zu("entnahme", id, d.gzusatz[id], "lager"));

  /* Was steht für diesen Vorgang schon im Journal?
     `artikel` ist live NOT NULL — Notizzeilen (siehe `notiz()`) tragen
     deshalb den leeren String, nicht NULL. Der Filter fragt genau das ab;
     `artikel IS NOT NULL` wäre hier immer wahr und damit wirkungslos. */
  const { results: alt } = await env.DB.prepare(
    `SELECT art, artikel, ort, menge, ts FROM ereignis
      WHERE vorgang = ?1 AND artikel <> '' ORDER BY ts ASC`).bind(vid).all();

  /* Gibt die fertig gebundenen Anweisungen zurück, statt sie selbst
     abzusetzen — der Aufrufer legt sie mit der `vorgang`-Zeile in EIN
     `batch`. */
  const schreibe = (sql, zn) => {
    if (!zn.length) return [];
    const stmt = env.DB.prepare(sql);
    /* `bestand()` entscheidet bei Zählungen über den Zeitstempel: die
       jüngste gilt. Zwei Anfragen in derselben Millisekunde wären sonst
       eine Münze — deshalb liegt die Korrektur notfalls eine
       Millisekunde nach der jüngsten Zeile, die schon da ist. */
    const jetzt = Math.max(Date.now(), alt.reduce((m, r) => Math.max(m, +r.ts || 0), 0) + 1);
    return zn.map(z => stmt.bind(
      crypto.randomUUID(), jetzt, d.tag, z.art, vid, z.artikel, z.ort, z.menge, d.name || p.name));
  };

  /* Erster Abschluss: nichts zu vergleichen, die Zeilen gehen so hinaus
     wie sie entstanden sind. */
  if (!alt.length) return schreibe(SQL_EREIGNIS, zeilen);

  /* Die Marke fasst zusammen, was dieselbe Buchung ausmacht. Sie wird nie
     wieder zerlegt — die Felder stehen daneben, damit ein Artikelname mit
     einem senkrechten Strich darin nichts durcheinanderbringt. */
  const marke = z => z.art + "|" + z.artikel + "|" + (z.ort || "");
  const felder = new Map();
  /* Eine Zählung ist ein Stand, keine Bewegung: die jüngste Zeile gilt.
     Entnahme und Eingang summieren sich auf. */
  const falte = (map, z, m) => {
    const k = marke(z);
    felder.set(k, { art: z.art, artikel: z.artikel, ort: z.ort || "" });
    map.set(k, z.art === "zaehlung" ? m : (map.get(k) || 0) + m);
  };

  const ist = new Map();
  alt.forEach(r => falte(ist, r, +r.menge || 0));
  const soll = new Map();
  zeilen.forEach(z => falte(soll, z, z.menge));

  const korr = [];
  for (const k of new Set([...ist.keys(), ...soll.keys()])) {
    const { art, artikel, ort } = felder.get(k);
    const a = ist.get(k) || 0, s = soll.has(k) ? soll.get(k) : 0;
    if (art === "zaehlung") {
      /* Eine Zählung wird durch eine neue Zählung berichtigt, nicht durch
         eine Differenz. Und eine Zählung, die im neuen Stand gar nicht
         mehr vorkommt, wird nicht zurückgenommen: gezählt wurde sie
         trotzdem: */
      if (soll.has(k) && Math.abs(s - a) > 1e-9)
        korr.push({ art, artikel, ort, menge: s });
    } else if (Math.abs(s - a) > 1e-9) {
      korr.push({ art, artikel, ort, menge: s - a });
    }
  }
  /* Kein Unterschied: dasselbe Paket ein zweites Mal. Nichts tun. */
  return schreibe(SQL_EREIGNIS_KORR, korr);
}

/* ── Bestand ─────────────────────────────────────────────────────────── */
async function bestand(env) {
  /* Notizzeilen stehen mit leerem Artikel im Journal (siehe `notiz()`)
     und gehören nicht in den Bestand. */
  const { results } = await env.DB.prepare(
    `SELECT artikel, ort, art, menge, ts FROM ereignis
      WHERE artikel <> '' ORDER BY ts ASC`).all();

  const letzteZaehlung = {};
  results.forEach(r => { if (r.art === "zaehlung") letzteZaehlung[r.artikel] = r.ts; });

  const b = {};
  results.forEach(r => {
    const basis = letzteZaehlung[r.artikel];
    if (r.art === "zaehlung") { b[r.artikel] = r.menge; return; }
    if (basis != null && r.ts <= basis) return;      // vor der Zählung zählt nicht
    if (basis == null) return;                        // ohne Zählung kein Bestand
    b[r.artikel] = (b[r.artikel] || 0) + (r.art === "eingang" ? r.menge : -r.menge);
  });
  return json({ bestand: b, gezaehlt: letzteZaehlung });
}

/* ── Fassungsliste ─────────────────────────────────────────────────────
   Die Tabelle heisst live anders, als der Worker sie bisher ansprach:
   `z` statt `nr`, `wer` statt `quelle`, `importiert` statt `ts`; dazu
   `kostenstelle`, `von_ts`, `bis_ts`, die `parseZ` heute nicht liefert
   und die deshalb leer bleiben (Punkt in `review/OFFENE-ENTSCHEIDUNGEN.md`).

   Wichtig: auf `fassungsliste.tag` liegt live KEIN UNIQUE-Index, nur
   `i_liste_tag`. Ein `ON CONFLICT(tag)` gäbe es damit nicht — SQLite
   antwortet „ON CONFLICT clause does not match any PRIMARY KEY or UNIQUE
   constraint". Der Schlüssel der Liste ist deshalb der Betriebstag
   selbst (`id = tag`): ein Z-Bericht je Betriebstag, zweimal derselbe
   Bericht ersetzt sich sauber, und `fassungszeile.liste` zeigt lesbar
   auf den Tag. */
async function fassungsliste(env, text, wer) {
  const z = parseZ(text);
  if (!z.tag) return json({ fehler: "kein Betriebstag erkannt" }, 422);

  await env.DB.prepare(
    `INSERT INTO fassungsliste (id, tag, z, importiert, wer, roh)
     VALUES (?1,?1,?2,?3,?4,?5)
     ON CONFLICT(id) DO UPDATE SET z=excluded.z, roh=excluded.roh,
       importiert=excluded.importiert, wer=excluded.wer`
  ).bind(z.tag, z.nr || null, Date.now(), wer, text).run();

  /* Zeilen gehören zur Liste, nicht zum Tag (PRIMARY KEY (liste, rohbez)).
     Erst räumen: eine Position, die im neuen Bericht fehlt, darf nicht
     aus dem alten stehen bleiben. */
  await env.DB.prepare(`DELETE FROM fassungszeile WHERE liste = ?1`).bind(z.tag).run();

  const { results: bek } = await env.DB.prepare(
    `SELECT fremd, artikel, status FROM mapping`).all();
  const fest = Object.fromEntries(
    bek.map(r => [r.fremd, r.status === "ignoriert" ? null : r.artikel]));
  const kennt = new Set(bek.map(r => r.fremd));

  const stmt = env.DB.prepare(
    `INSERT INTO fassungszeile (liste, rohbez, kern, anzahl, betrag, ausschankMl, artikel)
     VALUES (?1,?2,?3,?4,?5,?6,?7)`);
  await env.DB.batch(z.positionen.map(p => {
    const a = kennt.has(p.name) ? fest[p.name] : mappe(p.name);
    return stmt.bind(z.tag, p.name, kern(p.name), p.anzahl, p.umsatz ?? 0,
                     p.ml ?? null, a ?? null);
  }));

  const offen = z.positionen.filter(p => !kennt.has(p.name) && !mappe(p.name)).length;
  return json({ tag: z.tag, positionen: z.positionen.length, offen });
}

async function fassungslistenLesen(env, url) {
  const tag = url.searchParams.get("tag");
  if (tag) {
    const kopf = await env.DB.prepare(
      `SELECT id, tag, z, kostenstelle, importiert, wer FROM fassungsliste WHERE tag = ?1`
    ).bind(tag).first();
    if (!kopf) return json({ fehler: "nicht vorhanden" }, 404);
    const { results } = await env.DB.prepare(
      `SELECT rohbez, kern, anzahl, betrag, ausschankMl, artikel
         FROM fassungszeile WHERE liste = ?1`
    ).bind(kopf.id).all();
    return json({ ...kopf, positionen: results });
  }
  /* Der Verbund braucht einen anderen Buchstaben als `z`: die Liste hat
     eine Spalte, die so heisst (die Z-Nummer). */
  const { results } = await env.DB.prepare(
    `SELECT f.tag, f.z, f.importiert, COUNT(zl.rohbez) AS positionen
       FROM fassungsliste f LEFT JOIN fassungszeile zl ON zl.liste = f.id
      GROUP BY f.id ORDER BY f.tag DESC`).all();
  return json({ berichte: results });
}

/* ── Zuordnung ─────────────────────────────────────────────────────────
   Live heisst der Kassenname `fremd`, und „ignoriert" ist kein Ja/Nein,
   sondern einer von zwei erlaubten Werten in `status`
   (CHECK zugeordnet|ignoriert). Der Körper darf weiter `kassenname` und
   `ignoriert` sagen — das ist die Sprache der Oberfläche; übersetzt wird
   hier, an einer Stelle.

   Eine Spalte `rezept` gibt es live NICHT. Rezepturen liegen heute allein
   im Gerätespeicher der Leitung (`hh_rezepte_v1` in `leitung.html`);
   kein Client schickt sie an diesen Endpunkt. Statt sie stillschweigend
   fallen zu lassen, sagt der Worker klar, was fehlt — die Migration dazu
   liegt fertig unter `migrations/001_mapping_rezept.sql`. */
async function mappingSchreiben(env, p, body) {
  const { kassenname, artikel, ignoriert, gebinde_ml, rezept } = body || {};
  if (!kassenname) return json({ fehler: "kassenname fehlt" }, 422);
  if (rezept !== undefined && rezept !== null) return json({
    fehler: "Rezepturen kann die Datenbank noch nicht aufnehmen "
          + "(Migration 001_mapping_rezept steht aus)" }, 422);

  await env.DB.prepare(
    `INSERT INTO mapping (fremd, status, artikel, gebinde_ml, wer, angelegt)
     VALUES (?1,?2,?3,?4,?5,?6)
     ON CONFLICT(fremd) DO UPDATE SET status=excluded.status,
       artikel=excluded.artikel, gebinde_ml=excluded.gebinde_ml,
       wer=excluded.wer, angelegt=excluded.angelegt`
  ).bind(kassenname, ignoriert ? "ignoriert" : "zugeordnet", artikel || null,
         +gebinde_ml || null, p.name, Date.now()).run();

  /* Die schon eingelesenen Zeilen ziehen nach — sonst gilt die Zuordnung
     erst ab dem nächsten Bericht. */
  if (artikel) await env.DB.prepare(
    `UPDATE fassungszeile SET artikel = ?1 WHERE rohbez = ?2`).bind(artikel, kassenname).run();
  return json({ ok: true });
}

/* ── Personen ────────────────────────────────────────────────────────── */
async function personSchreiben(env, body) {
  const { id, name, rolle, code, aktiv } = body || {};
  if (!name || !rolle) return json({ fehler: "name und rolle nötig" }, 422);

  if (code) {
    /* Vier Ziffern sind seit dem 17.09. nicht mehr zu vergeben: die vier
       ersten Codes des Hauses standen im Klartext in der Geschichte des
       Anhangs, und 10 000 Möglichkeiten sind an einem Abend durchprobiert.
       Geprüft wird hier nur das Vergeben — bestehende Prüfsummen bleiben
       gültig, sonst käme niemand mehr hinein, um sie zu ersetzen. */
    if (!/^\d{6,8}$/.test(code)) return json({ fehler: "Code: sechs bis acht Ziffern" }, 422);
    const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
    const hash = await hashe(code, salt);
    await env.DB.prepare(
      `INSERT INTO person (id, name, rolle, code_hash, salt, aktiv, angelegt)
       VALUES (?1,?2,?3,?4,?5,?6,?7)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, rolle=excluded.rolle,
         code_hash=excluded.code_hash, salt=excluded.salt, aktiv=excluded.aktiv`
    ).bind(id || crypto.randomUUID(), name, rolle, hash, salt, aktiv === 0 ? 0 : 1, Date.now()).run();
  } else {
    if (!id) return json({ fehler: "ohne Code braucht es eine id" }, 422);
    await env.DB.prepare(
      `UPDATE person SET name = ?2, rolle = ?3, aktiv = ?4 WHERE id = ?1`
    ).bind(id, name, rolle, aktiv === 0 ? 0 : 1).run();
  }
  return json({ ok: true });
}

/* ── Router ──────────────────────────────────────────────────────────── */

/* Ein leerer oder kaputter Körper ist ein Fehler des Aufrufers, kein
   Serverfehler. Ohne diese Unterscheidung kam „Unexpected token … in JSON"
   als 500 zurück — und die App meldete daraufhin „Server antwortet nicht"
   und hielt ihren Ausgang an, obwohl der Server sehr wohl geantwortet hat. */
async function koerper(request) {
  try { return await request.json(); } catch { return null; }
}
const keinJson = () => json({ fehler: "Körper ist kein gültiges JSON" }, 400);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pfad = url.pathname;
    const m = request.method;
    if (!pfad.startsWith("/api/")) return env.ASSETS.fetch(request);

    try {
      if (pfad === "/api/ping") {
        if (!env.DB) return json({ ok: false, fehler: "D1-Binding fehlt" }, 500);
        const n = await env.DB.prepare(`SELECT COUNT(*) AS n FROM person`).first();
        return json({ ok: true, personen: n.n, anlage: !!env.ANLAGE_OFFEN, zeit: Date.now() });
      }

      /* Nur während der Einrichtung. Danach ANLAGE_OFFEN löschen. */
      if (pfad === "/api/hash") {
        if (!env.ANLAGE_OFFEN) return json({ fehler: "geschlossen" }, 403);
        const code = url.searchParams.get("code") || "";
        const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
        return json({ salt, hash: await hashe(code, salt) });
      }
      if (pfad === "/api/anlage" && m === "POST") {
        if (!env.ANLAGE_OFFEN) return json({ fehler: "geschlossen" }, 403);
        const b = await koerper(request);
        return b ? await personSchreiben(env, b) : keinJson();
      }

      if (pfad === "/api/anmelden" && m === "POST") return await anmelden(request, env);
      if (pfad === "/api/abmelden") return json({ ok: true }, 200, { "set-cookie": keks(null) });

      const p = await ich(request, env);
      if (!p) return json({ fehler: "nicht angemeldet" }, 401);

      if (pfad === "/api/ich") return json({ name: p.name, rolle: p.rolle });

      if (pfad === "/api/stamm") {
        /* Die Spalte heisst live `wert`, nicht `daten`. */
        const { results } = await env.DB.prepare(`SELECT schluessel, wert FROM stamm`).all();
        return json(Object.fromEntries(results.map(r => [r.schluessel, JSON.parse(r.wert)])));
      }
      if (pfad === "/api/bestand") return await bestand(env);
      if (pfad === "/api/vorgaenge") return await vorgaengeLesen(env, url);

      if (pfad.startsWith("/api/vorgang/") && m === "PUT") {
        let id;
        try { id = decodeURIComponent(pfad.slice(13)); }
        catch { return json({ fehler: "unlesbarer Vorgangsschlüssel" }, 400); }
        const b = await koerper(request);
        return b ? await vorgangSchreiben(env, p, id, b) : keinJson();
      }

      if (pfad === "/api/fassungsliste") {
        if (m === "GET") return await fassungslistenLesen(env, url);
        if (m === "POST") {
          if (!darf(p, "leitung")) return json({ fehler: "nur Leitung" }, 403);
          return await fassungsliste(env, await request.text(), "hand:" + p.name);
        }
      }

      if (pfad === "/api/mapping") {
        if (m === "GET") {
          /* Nach aussen bleibt es `kassenname`/`ignoriert`, wie die
             Oberfläche es kennt — die Spaltennamen der Datenbank hören
             am Rand des Workers auf. */
          const { results } = await env.DB.prepare(
            `SELECT fremd, artikel, status, gebinde_ml FROM mapping ORDER BY fremd`).all();
          return json({ mapping: results.map(r => ({
            kassenname: r.fremd, artikel: r.artikel,
            ignoriert: r.status === "ignoriert" ? 1 : 0, gebinde_ml: r.gebinde_ml })) });
        }
        if (m === "POST") {
          if (!darf(p, "leitung")) return json({ fehler: "nur Leitung" }, 403);
          const b = await koerper(request);
          return b ? await mappingSchreiben(env, p, b) : keinJson();
        }
      }

      if (pfad === "/api/personen") {
        if (!darf(p, "leitung")) return json({ fehler: "nur Leitung" }, 403);
        if (m === "GET") {
          const { results } = await env.DB.prepare(
            `SELECT id, name, rolle, aktiv FROM person ORDER BY name`).all();
          return json({ personen: results });
        }
        if (m === "POST") {
          const b = await koerper(request);
          return b ? await personSchreiben(env, b) : keinJson();
        }
      }

      return json({ fehler: "unbekannter Endpunkt" }, 404);
    } catch (e) {
      /* Falle 10: „Error 1101" ist keine Diagnose. Was hier ankommt, ist
         fast immer eine D1-Meldung im Klartext („no such column …").
         Ohne diese Zeile in den Logs beginnt die Fehlersuche wieder mit
         einer Hypothese statt mit dem Satz, der dasteht. */
      console.error("api-fehler", m, pfad, (e && e.stack) || String(e));
      return json({ fehler: e.message }, 500);
    }
  },

  /* ── Z-Bericht aus dem Postfach ──────────────────────────────────────
     Ein Postfach ist eine offene Tür. Alles, was hereinkommt, ist erst
     einmal fremder Text: geprüft wird der Absender und die Form. */
  async email(message, env, ctx) {
    const von = (message.from || "").toLowerCase();
    const erlaubt = (env.ABSENDER || "").split(",").map(s => s.trim()).filter(Boolean);
    if (erlaubt.length && !erlaubt.some(d => von.endsWith(d))) {
      message.setReject("Absender nicht freigegeben");
      return;
    }
    const mail = await PostalMime.parse(message.raw);
    let text = null;
    for (const a of (mail.attachments || [])) {
      if (!/\.(csv|txt)$/i.test(a.filename || "") && !/text\//i.test(a.mimeType || "")) continue;
      const t = new TextDecoder("utf-8").decode(a.content);
      if (/\bBis\b/.test(t) && t.includes("\t")) { text = t; break; }
    }
    if (!text && mail.text && /\bBis\b/.test(mail.text)) text = mail.text;
    if (!text) {
      ctx.waitUntil(notiz(env, "email", "kein Z-Bericht im Anhang: " + (mail.subject || "")));
      return;
    }
    ctx.waitUntil((async () => {
      try {
        const j = await (await fassungsliste(env, text, "email:" + von)).json();
        await notiz(env, "email", `Z-Bericht ${j.tag}: ${j.positionen} Positionen, ${j.offen} offen`);
      } catch (e) { await notiz(env, "email", "Fehler: " + e.message); }
    })());
  },

  /* ── Wochenbrief ─────────────────────────────────────────────────── */
  async scheduled(event, env, ctx) {
    const bis = new Date(), von = new Date(); von.setDate(von.getDate() - 7);
    const t = d => d.toISOString().slice(0, 10);
    const { results: bew } = await env.DB.prepare(
      `SELECT artikel, SUM(menge) AS fl FROM ereignis
        WHERE art = 'entnahme' AND tag BETWEEN ?1 AND ?2
        GROUP BY artikel ORDER BY fl DESC LIMIT 15`).bind(t(von), t(bis)).all();
    const { results: fehlt } = await env.DB.prepare(
      `SELECT DISTINCT tag FROM vorgang
        WHERE tag BETWEEN ?1 AND ?2 AND modus = 'tag'
          AND tag NOT IN (SELECT tag FROM fassungsliste)`).bind(t(von), t(bis)).all();
    ctx.waitUntil(notiz(env, "wochenbrief", [
      `Wochenbrief ${t(von)} bis ${t(bis)}`, "",
      ...bew.map(r => `${String(Math.round(r.fl)).padStart(4)}  ${r.artikel}`), "",
      fehlt.length ? "Ohne Z-Bericht: " + fehlt.map(r => r.tag).join(", ")
                   : "Alle Betriebstage haben einen Z-Bericht."
    ].join("\n")));
  }
};

/* Eine Notiz ins Journal: Mailempfang und Wochenbrief hinterlassen hier
   ihre Spur. Das ist keine Buchung.

   Bis Runde 3 schrieb diese Funktion sechs Spalten — `vorgang`, `artikel`,
   `ort`, `menge` und `wer` sind live aber NOT NULL. Jeder Aufruf scheiterte
   damit, also JEDE eingegangene Mail und JEDER Wochenbrief; sichtbar wurde
   das nie, weil beide Wege im `waitUntil` laufen.

   Die fünf Pflichtspalten stehen deshalb mit ihrem leeren Wert da: kein
   Vorgang, kein Artikel, kein Ort, Menge 0. Der leere `artikel` ist die
   Marke, an der Bestand und Ableitung die Notizen wieder aussortieren —
   `artikel IS NULL` kann es bei NOT NULL nicht geben. `art` muss einer
   der vier erlaubten Werte sein (CHECK), `quelle` ist frei. */
async function notiz(env, quelle, text) {
  await env.DB.prepare(
    `INSERT INTO ereignis (id, ts, tag, art, quelle, vorgang, artikel, ort, menge, wer, notiz)
     VALUES (?1,?2,?3,'korrektur',?4,'','','',0,'System',?5)`
  ).bind(crypto.randomUUID(), Date.now(), new Date().toISOString().slice(0, 10), quelle, text).run();
}
