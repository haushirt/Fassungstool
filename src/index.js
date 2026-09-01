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
import { parseZ } from "./gnparse.js";
import { mappe } from "./gnmap.js";

/* PBKDF2-Runden. Cloudflare erlaubt höchstens 100000, der Free-Plan
   schafft rechnerisch aber nur wenige tausend (10 ms CPU, vier
   Personen je Anmeldung). 1000 reicht hier: die Codes sind
   Identifikation mit Rechten, kein Schutz vor Angreifern — dafür
   sorgt die Sperre nach fünf Fehlversuchen. Zieht das Tool auf einen
   eigenen Server, gehört diese Zahl wieder auf 100000. */
const RUNDEN = 1000;
const SITZUNG = 12 * 60 * 60 * 1000;
const SPERRE = { versuche: 5, fenster: 15 * 60 * 1000 };

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
    `SELECT ok FROM anmeldeversuch WHERE ip = ?1 AND ts > ?2`).bind(ip, seit).all();
  if (letzte.filter(r => !r.ok).length >= SPERRE.versuche)
    return json({ fehler: "zu viele Versuche" }, 429);

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

  if (!treffer) return json({ fehler: "unbekannt" }, 401);

  return json({ name: treffer.name, rolle: treffer.rolle }, 200,
    { "set-cookie": keks(await tokenBauen(env, treffer)) });
}

/* ── Vorgänge ────────────────────────────────────────────────────────── */
async function vorgaengeLesen(env, url) {
  const von = url.searchParams.get("von") || "1970-01-01";
  const bis = url.searchParams.get("bis") || "9999-12-31";
  const { results } = await env.DB.prepare(
    `SELECT id, tag, art, wer, daten, abgeschlossen, ts FROM vorgang
      WHERE tag BETWEEN ?1 AND ?2 ORDER BY tag ASC, ts ASC`
  ).bind(von, bis).all();

  return json({
    vorgaenge: results.map(r => Object.assign(JSON.parse(r.daten || "{}"), {
      id: r.id, tag: r.tag, mode: r.art, name: r.wer,
      finished: !!r.abgeschlossen, archiviert: new Date(r.ts).toISOString()
    }))
  });
}

/* Der Client schickt seine eigene UUID. Doppeltes Senden schadet damit
   nicht — wichtig für die Warteschlange, die offline weiterläuft. */
async function vorgangSchreiben(env, p, id, daten) {
  if (!daten || !daten.mode || !daten.tag) return json({ fehler: "unvollständig" }, 422);
  const jetzt = Date.now();

  await env.DB.prepare(
    `INSERT INTO vorgang (id, tag, art, wer, person, daten, abgeschlossen, ts, geaendert)
     VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?8)
     ON CONFLICT(id) DO UPDATE SET
       daten = excluded.daten, abgeschlossen = excluded.abgeschlossen,
       wer = excluded.wer, geaendert = excluded.geaendert`
  ).bind(id, daten.tag, daten.mode, daten.name || p.name, p.id,
         JSON.stringify(daten), daten.finished ? 1 : 0, jetzt).run();

  /* Ereignisse entstehen erst beim Abschluss. Ein laufender Vorgang darf
     den Bestand nicht bewegen — sonst zählt jeder Zwischenstand mit. */
  if (daten.finished) await ereignisseAbleiten(env, id, daten, p);
  return json({ id, gespeichert: true });
}

async function ereignisseAbleiten(env, vid, d, p) {
  const vorhanden = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM ereignis WHERE vorgang = ?1`).bind(vid).first();
  if (vorhanden && vorhanden.n > 0) return;          // schon abgeleitet

  const zeilen = [];
  const zu = (art, artikel, menge, ort) => {
    menge = +menge || 0;
    if (menge) zeilen.push({ art, artikel, menge, ort: ort || null });
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

  if (!zeilen.length) return;
  const stmt = env.DB.prepare(
    `INSERT INTO ereignis (id, ts, tag, art, quelle, vorgang, artikel, ort, menge, wer)
     VALUES (?1,?2,?3,?4,'vorgang',?5,?6,?7,?8,?9)`);
  const jetzt = Date.now();
  await env.DB.batch(zeilen.map(z => stmt.bind(
    crypto.randomUUID(), jetzt, d.tag, z.art, vid, z.artikel, z.ort, z.menge, d.name || p.name)));
}

/* ── Bestand ─────────────────────────────────────────────────────────── */
async function bestand(env) {
  const { results } = await env.DB.prepare(
    `SELECT artikel, ort, art, menge, ts FROM ereignis
      WHERE artikel IS NOT NULL ORDER BY ts ASC`).all();

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

/* ── Fassungsliste ───────────────────────────────────────────────────── */
async function fassungsliste(env, text, quelle) {
  const z = parseZ(text);
  if (!z.tag) return json({ fehler: "kein Betriebstag erkannt" }, 422);

  await env.DB.prepare(
    `INSERT INTO fassungsliste (id, tag, nr, quelle, roh, ts) VALUES (?1,?2,?3,?4,?5,?6)
     ON CONFLICT(tag) DO UPDATE SET roh=excluded.roh, nr=excluded.nr,
       quelle=excluded.quelle, ts=excluded.ts`
  ).bind(crypto.randomUUID(), z.tag, z.nr || "", quelle, text, Date.now()).run();

  await env.DB.prepare(`DELETE FROM fassungszeile WHERE tag = ?1`).bind(z.tag).run();

  const { results: bek } = await env.DB.prepare(
    `SELECT kassenname, artikel, ignoriert FROM mapping`).all();
  const fest = Object.fromEntries(bek.map(r => [r.kassenname, r.ignoriert ? null : r.artikel]));
  const kennt = new Set(bek.map(r => r.kassenname));

  const stmt = env.DB.prepare(
    `INSERT INTO fassungszeile (tag, kassenname, anzahl, umsatz, artikel, ml)
     VALUES (?1,?2,?3,?4,?5,?6)`);
  await env.DB.batch(z.positionen.map(p => {
    const a = kennt.has(p.name) ? fest[p.name] : mappe(p.name);
    return stmt.bind(z.tag, p.name, p.anzahl, p.umsatz ?? 0, a ?? null, p.ml ?? null);
  }));

  const offen = z.positionen.filter(p => !kennt.has(p.name) && !mappe(p.name)).length;
  return json({ tag: z.tag, positionen: z.positionen.length, offen });
}

async function fassungslistenLesen(env, url) {
  const tag = url.searchParams.get("tag");
  if (tag) {
    const kopf = await env.DB.prepare(
      `SELECT tag, nr, quelle, ts FROM fassungsliste WHERE tag = ?1`).bind(tag).first();
    if (!kopf) return json({ fehler: "nicht vorhanden" }, 404);
    const { results } = await env.DB.prepare(
      `SELECT kassenname, anzahl, umsatz, artikel, ml FROM fassungszeile WHERE tag = ?1`
    ).bind(tag).all();
    return json({ ...kopf, positionen: results });
  }
  const { results } = await env.DB.prepare(
    `SELECT f.tag, f.nr, f.ts, COUNT(z.tag) AS positionen
       FROM fassungsliste f LEFT JOIN fassungszeile z ON z.tag = f.tag
      GROUP BY f.tag ORDER BY f.tag DESC`).all();
  return json({ berichte: results });
}

/* ── Zuordnung ───────────────────────────────────────────────────────── */
async function mappingSchreiben(env, p, body) {
  const { kassenname, artikel, ignoriert, rezept } = body || {};
  if (!kassenname) return json({ fehler: "kassenname fehlt" }, 422);
  await env.DB.prepare(
    `INSERT INTO mapping (kassenname, artikel, ignoriert, rezept, wer, ts)
     VALUES (?1,?2,?3,?4,?5,?6)
     ON CONFLICT(kassenname) DO UPDATE SET artikel=excluded.artikel,
       ignoriert=excluded.ignoriert, rezept=excluded.rezept, wer=excluded.wer, ts=excluded.ts`
  ).bind(kassenname, artikel || null, ignoriert ? 1 : 0,
         rezept ? JSON.stringify(rezept) : null, p.name, Date.now()).run();

  /* Die schon eingelesenen Zeilen ziehen nach — sonst gilt die Zuordnung
     erst ab dem nächsten Bericht. */
  if (artikel) await env.DB.prepare(
    `UPDATE fassungszeile SET artikel = ?1 WHERE kassenname = ?2`).bind(artikel, kassenname).run();
  return json({ ok: true });
}

/* ── Personen ────────────────────────────────────────────────────────── */
async function personSchreiben(env, body) {
  const { id, name, rolle, code, aktiv } = body || {};
  if (!name || !rolle) return json({ fehler: "name und rolle nötig" }, 422);

  if (code) {
    if (!/^\d{4,8}$/.test(code)) return json({ fehler: "Code: vier bis acht Ziffern" }, 422);
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
        return personSchreiben(env, await request.json());
      }

      if (pfad === "/api/anmelden" && m === "POST") return anmelden(request, env);
      if (pfad === "/api/abmelden") return json({ ok: true }, 200, { "set-cookie": keks(null) });

      const p = await ich(request, env);
      if (!p) return json({ fehler: "nicht angemeldet" }, 401);

      if (pfad === "/api/ich") return json({ name: p.name, rolle: p.rolle });

      if (pfad === "/api/stamm") {
        const { results } = await env.DB.prepare(`SELECT schluessel, daten FROM stamm`).all();
        return json(Object.fromEntries(results.map(r => [r.schluessel, JSON.parse(r.daten)])));
      }
      if (pfad === "/api/bestand") return bestand(env);
      if (pfad === "/api/vorgaenge") return vorgaengeLesen(env, url);

      if (pfad.startsWith("/api/vorgang/") && m === "PUT") {
        const id = decodeURIComponent(pfad.slice(13));
        return vorgangSchreiben(env, p, id, await request.json());
      }

      if (pfad === "/api/fassungsliste") {
        if (m === "GET") return fassungslistenLesen(env, url);
        if (m === "POST") {
          if (!darf(p, "leitung")) return json({ fehler: "nur Leitung" }, 403);
          return fassungsliste(env, await request.text(), "hand:" + p.name);
        }
      }

      if (pfad === "/api/mapping") {
        if (m === "GET") {
          const { results } = await env.DB.prepare(
            `SELECT kassenname, artikel, ignoriert, rezept FROM mapping`).all();
          return json({ mapping: results });
        }
        if (m === "POST") {
          if (!darf(p, "leitung")) return json({ fehler: "nur Leitung" }, 403);
          return mappingSchreiben(env, p, await request.json());
        }
      }

      if (pfad === "/api/personen") {
        if (!darf(p, "leitung")) return json({ fehler: "nur Leitung" }, 403);
        if (m === "GET") {
          const { results } = await env.DB.prepare(
            `SELECT id, name, rolle, aktiv FROM person ORDER BY name`).all();
          return json({ personen: results });
        }
        if (m === "POST") return personSchreiben(env, await request.json());
      }

      return json({ fehler: "unbekannter Endpunkt" }, 404);
    } catch (e) {
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
        WHERE tag BETWEEN ?1 AND ?2 AND art = 'tag'
          AND tag NOT IN (SELECT tag FROM fassungsliste)`).bind(t(von), t(bis)).all();
    ctx.waitUntil(notiz(env, "wochenbrief", [
      `Wochenbrief ${t(von)} bis ${t(bis)}`, "",
      ...bew.map(r => `${String(Math.round(r.fl)).padStart(4)}  ${r.artikel}`), "",
      fehlt.length ? "Ohne Z-Bericht: " + fehlt.map(r => r.tag).join(", ")
                   : "Alle Betriebstage haben einen Z-Bericht."
    ].join("\n")));
  }
};

async function notiz(env, quelle, text) {
  await env.DB.prepare(
    `INSERT INTO ereignis (id, ts, tag, art, quelle, notiz) VALUES (?1,?2,?3,'korrektur',?4,?5)`
  ).bind(crypto.randomUUID(), Date.now(), new Date().toISOString().slice(0, 10), quelle, text).run();
}
