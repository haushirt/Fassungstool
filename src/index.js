/* ══════════════════════════════════════════════════════════════════
   Fassungstool · Worker
   Alles unter /api/* läuft hier, alles andere kommt aus public/.
   ══════════════════════════════════════════════════════════════════ */

import { gnParse, gnErkennt } from "./gnparse.js";
import { gnMap, verbrauch } from "./gnmap.js";

const json = (d, s = 200) =>
  new Response(JSON.stringify(d), {
    status: s,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });

/* ── Passwörter ────────────────────────────────────────────────────
   PBKDF2-SHA256, 150 000 Runden, Salt je Person. Web Crypto, keine
   Abhängigkeit. Der Code selbst wird nie gespeichert. */
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
const roh = h => new Uint8Array(h.match(/../g).map(x => parseInt(x, 16)));

async function ableiten(code, salt) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(code), "PBKDF2", false, ["deriveBits"]);
  const b = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: roh(salt), iterations: 150000 }, k, 256);
  return hex(b);
}

/* Zeitkonstanter Vergleich — sonst verrät die Laufzeit den Hash. */
function gleich(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/* ── Token ─────────────────────────────────────────────────────────
   HMAC-SHA256 über "id.rolle.ablauf". Kein JWT, keine Bibliothek. */
async function schluessel(secret) {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
async function tokenBauen(p, secret, stunden = 12) {
  const kern = `${p.id}.${p.rolle}.${Date.now() + stunden * 3600e3}`;
  const sig = await crypto.subtle.sign("HMAC", await schluessel(secret), new TextEncoder().encode(kern));
  return `${kern}.${hex(sig)}`;
}
async function tokenPruefen(t, secret) {
  if (!t) return null;
  const i = t.lastIndexOf(".");
  if (i < 0) return null;
  const kern = t.slice(0, i), sig = t.slice(i + 1);
  const ok = await crypto.subtle.verify("HMAC", await schluessel(secret), roh(sig), new TextEncoder().encode(kern));
  if (!ok) return null;
  const [id, rolle, ablauf] = kern.split(".");
  if (Number(ablauf) < Date.now()) return null;
  return { id, rolle };
}

function keksLesen(request, name) {
  const c = request.headers.get("cookie") || "";
  const m = new RegExp("(?:^|;\\s*)" + name + "=([^;]*)").exec(c);
  return m ? decodeURIComponent(m[1]) : null;
}

async function wer(request, env) {
  return tokenPruefen(keksLesen(request, "ft"), env.TOKEN_SECRET);
}

/* ── Anmelden ──────────────────────────────────────────────────────
   Fünf Fehlversuche je IP in 15 Minuten, dann zu. Die Antwort verrät
   nie, ob ein Code existiert. */
async function anmelden(request, env) {
  const ip = request.headers.get("cf-connecting-ip") || "unbekannt";
  const jetzt = Date.now(), fenster = jetzt - 15 * 60e3;

  const { results: alt } = await env.DB
    .prepare("select count(*) as n from anmeldeversuch where ip=? and ts>? and erfolg=0")
    .bind(ip, fenster).all();
  if ((alt[0]?.n || 0) >= 5) return json({ fehler: "gesperrt" }, 429);

  const { code } = await request.json().catch(() => ({}));
  if (!code) return json({ fehler: "kein Code" }, 400);

  const { results } = await env.DB.prepare("select * from person where aktiv=1").all();
  let treffer = null;
  for (const p of results) {
    const h = await ableiten(String(code), p.salt);
    if (gleich(h, p.code_hash)) { treffer = p; break; }
  }

  await env.DB.prepare("insert into anmeldeversuch (ip,ts,erfolg) values (?,?,?)")
    .bind(ip, jetzt, treffer ? 1 : 0).run();

  if (!treffer) return json({ fehler: "unbekannt" }, 401);

  const t = await tokenBauen(treffer, env.TOKEN_SECRET);
  return new Response(JSON.stringify({ name: treffer.name, rolle: treffer.rolle }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "set-cookie": `ft=${encodeURIComponent(t)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200`
    }
  });
}

/* ── Fassungsliste einlesen ────────────────────────────────────────
   Der Bericht wird roh abgelegt und geparst; die Zuordnung passiert
   gegen die Mapping-Tabelle. Offene Positionen blockieren die Ampel. */
async function listeImportieren(request, env, ich) {
  const text = await request.text();
  if (!gnErkennt(text)) return json({ fehler: "kein gastronovi Z-Bericht" }, 400);

  const b = gnParse(text);
  if (!b.meta.tag) return json({ fehler: "kein Betriebstag erkennbar" }, 400);

  const stamm = await stammLesen(env);
  const { results: mrows } = await env.DB.prepare("select * from mapping").all();
  const bestand = {};
  for (const m of mrows) bestand[m.fremd] = { status: m.status, artikel: m.artikel, gebinde_ml: m.gebinde_ml };

  const z = gnMap(b.positionen, stamm.wines, stamm.getr, bestand);
  const offen = z.offen.filter(o => o.pos.ml);

  const id = crypto.randomUUID();
  await env.DB.prepare(
    `insert into fassungsliste (id,tag,z,kostenstelle,von_ts,bis_ts,importiert,wer,roh)
     values (?,?,?,?,?,?,?,?,?)`)
    .bind(id, b.meta.tag, b.meta.z, b.meta.kostenstelle,
      b.meta.von?.ts || null, b.meta.bis?.ts || null, Date.now(), ich.id, text).run();

  const stmt = env.DB.prepare(
    `insert or replace into fassungszeile (liste,rohbez,kern,anzahl,betrag,ausschankMl,artikel)
     values (?,?,?,?,?,?,?)`);
  const batch = b.positionen.map(p => {
    const t = z.zugeordnet.find(x => x.pos.name === p.name);
    return stmt.bind(id, p.name, p.kern, p.anzahl, p.betrag, p.ml, t ? t.artikel : null);
  });
  if (batch.length) await env.DB.batch(batch);

  return json({
    liste: id,
    tag: b.meta.tag,
    positionen: b.positionen.length,
    zugeordnet: z.zugeordnet.length,
    offen: offen.map(o => ({
      rohbez: o.pos.name, anzahl: o.pos.anzahl, ausschankMl: o.pos.ml,
      vorschlag: o.vorschlag ? { artikel: o.vorschlag.artikel, bez: o.vorschlag.bez } : null
    })),
    soll: verbrauch(z.zugeordnet),
    hinweis: b.storno.length ? "Bericht enthält Stornos — Behandlung noch nicht geklärt" : null
  });
}

/* Stammdaten: aus D1, sonst aus der mitgelieferten Kopie. */
async function stammLesen(env) {
  const { results } = await env.DB.prepare("select * from stamm").all();
  const m = {};
  for (const r of results) { try { m[r.schluessel] = JSON.parse(r.wert); } catch { } }
  if (m.wines && m.getr) return { wines: m.wines, getr: m.getr, plan: m.plan || null };
  const eingebaut = (await import("./stamm.json", { with: { type: "json" } })).default;
  return { wines: eingebaut.WINES, getr: eingebaut.GETR, plan: null };
}

/* ── Bestand ───────────────────────────────────────────────────────
   Letzte Zählung als Anker, danach alle Bewegungen aufsummiert. */
async function bestand(env) {
  const { results } = await env.DB.prepare(`
    with anker as (
      select artikel, ort, max(ts) as ts from ereignis where art='zaehlung' group by artikel, ort
    )
    select e.artikel, e.ort, sum(e.menge) as menge, max(e.ts) as letzte
    from ereignis e
    left join anker a on a.artikel=e.artikel and a.ort=e.ort
    where a.ts is null or e.ts >= a.ts
    group by e.artikel, e.ort
    order by e.artikel`).all();
  return results;
}

/* ── Einstieg ──────────────────────────────────────────────────────*/
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pfad = url.pathname;

    if (!pfad.startsWith("/api/")) return env.ASSETS.fetch(request);
    if (!env.DB) return json({ fehler: "D1-Binding fehlt — database_id in wrangler.jsonc prüfen" }, 500);

    /* Diagnose. Sagt, ob Binding und Schema stehen. */
    if (pfad === "/api/ping") {
      try {
        const r = await env.DB.prepare("select count(*) as n from person").first();
        return json({ ok: true, personen: r.n, secret: !!env.TOKEN_SECRET });
      } catch (e) {
        return json({ ok: false, fehler: String(e) }, 500);
      }
    }

    /* Einmalige Anlagehilfe. Läuft nur, solange das Secret gesetzt ist.
       Nach dem Anlegen der ersten Person im Dashboard löschen. */
    if (pfad === "/api/hash") {
      if (!env.ANLAGE_OFFEN) return json({ fehler: "geschlossen" }, 403);
      const code = url.searchParams.get("code");
      if (!code) return json({ fehler: "code fehlt" }, 400);
      const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
      return json({ salt, hash: await ableiten(code, salt) });
    }

    if (pfad === "/api/anmelden" && request.method === "POST") return anmelden(request, env);
    if (pfad === "/api/abmelden") {
      return new Response("{}", {
        headers: { "content-type": "application/json", "set-cookie": "ft=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0" }
      });
    }

    const ich = await wer(request, env);
    if (!ich) return json({ fehler: "nicht angemeldet" }, 401);

    if (pfad === "/api/ich") return json(ich);
    if (pfad === "/api/stamm" && request.method === "GET") return json(await stammLesen(env));
    if (pfad === "/api/bestand") return json(await bestand(env));

    if (pfad === "/api/fassungsliste" && request.method === "POST") {
      if (ich.rolle !== "leitung") return json({ fehler: "nur Leitung" }, 403);
      return listeImportieren(request, env, ich);
    }

    return json({ fehler: "unbekannter Endpunkt", pfad }, 404);
  }
};
