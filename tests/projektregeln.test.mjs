/* Die Regeln aus CLAUDE.md, soweit eine Maschine sie nachsehen kann.
   Zweck: Was in jeder Übergabe behauptet wird („Gestaltungsschicht
   unberührt", „VERSION erhöht", „kein Code im Quelltext"), soll nicht
   behauptet, sondern nachgesehen werden. */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { lies, listet, inlineSkript } from "./hilfe/dateien.mjs";

const HTML = ["public/index.html", "public/leitung.html"];

describe("Dateien in public/", () => {
  test("genau vier, keine ausgelagerte CSS-Datei", () => {
    assert.deepEqual(listet("public").sort(),
      ["icon.png", "index.html", "leitung.html", "sw.js"]);
  });

  test("keine Seite hängt an einem externen Stylesheet", () => {
    /* Erwähnungen innerhalb der <style>-Blöcke sind Kommentare aus der
       tokens.css-Zeit und werden vom Browser nicht gelesen — gesucht ist
       ein echtes <link> im Kopf. */
    for (const d of HTML) {
      const ohneStil = lies(d).replace(/<style>[\s\S]*?<\/style>/g, "");
      assert.equal(/<link[^>]+rel=["']?stylesheet/i.test(ohneStil), false,
        d + ": fehlt die Datei, steht die Seite nackt da");
    }
  });
});

describe("Geteilte Gestaltungsschicht", () => {
  const ANFANG = "ACHTUNG · geteilte Gestaltungsschicht";
  const ENDE = "clip:rect(0 0 0 0);white-space:nowrap}";
  const block = d => {
    const t = lies(d);
    const a = t.indexOf(ANFANG);
    const e = t.indexOf(ENDE, a);
    assert.ok(a > 0 && e > a, d + ": Gestaltungsschicht nicht gefunden");
    return t.slice(a, e + ENDE.length);
  };

  test("steht wortgleich in index.html und leitung.html", () => {
    const a = block("public/index.html"), b = block("public/leitung.html");
    if (a !== b) {
      const za = a.split("\n"), zb = b.split("\n");
      const i = za.findIndex((z, n) => z !== zb[n]);
      assert.fail(`Erste Abweichung in Zeile ${i + 1} der Gestaltungsschicht:\n`
        + `index.html:   ${za[i]}\nleitung.html: ${zb[i]}`);
    }
    assert.ok(a.split("\n").length > 150, "der Block ist unerwartet kurz");
  });
});

describe("Service Worker", () => {
  const sw = lies("public", "sw.js");

  test("VERSION ist gesetzt und hat die Form v<Zahl>", () => {
    const m = /const VERSION = "(v\d+)"/.exec(sw);
    assert.ok(m, "VERSION nicht gefunden");
    assert.match(m[1], /^v\d+$/);
  });

  test("alle ausgelieferten Seiten liegen im Vorrat", () => {
    for (const p of ["/index.html", "/leitung.html", "/icon.png"])
      assert.ok(sw.includes(`"${p}"`), p + " fehlt im Vorrat");
  });

  test("/api/ wird nie zwischengespeichert", () => {
    assert.match(sw, /pathname\.startsWith\("\/api\/"\)\s*\)\s*return/,
      "der Ausstieg für /api/ fehlt oder wurde umgebaut");
  });
});

describe("Regeln 2 und 3: nichts läuft gegen die Live-Datenbank", () => {
  const skripte = JSON.parse(lies("package.json")).scripts || {};

  test("kein Skript fasst die Live-D1 an", () => {
    /* In Runde 1 stand hier `wrangler d1 execute fassung --remote
       --file=./schema.sql` — beide verbotenen Dinge in einer Zeile.
       Ein `npm run` ist schnell getippt; die Prüfung fängt den Rückfall.
       `npm run deploy` steht weiter im Backlog (hoch) und ist bewusst
       eine Entscheidung des Betreibers, nicht meine. */
    for (const [name, b] of Object.entries(skripte))
      assert.equal(/--remote|d1\s+execute/.test(b), false,
        `Skript "${name}" geht an die Live-Datenbank: ${b}`);
  });

  test("schema.sql wird von keinem Skript und keiner Prüfung ausgeführt", () => {
    for (const [name, b] of Object.entries(skripte))
      assert.equal(/schema\.sql/.test(b), false,
        `Regel 3: Skript "${name}" führt schema.sql aus: ${b}`);
  });
});

describe("Regel 9: kein Code im Quelltext", () => {
  const verdaechtig = /\b(PIN|CODE|PASS|PASSWORT|GEHEIM|SECRET)\w*\s*[:=]\s*["'`]\d{3,8}["'`]/i;

  /* Nicht nur der ausgelieferte Quelltext: Ein Code rutscht am ehesten in
     eine Übergabe, eine Notiz oder eine Commit-Nachricht. Die Prüfungen
     unter `tests/` sind ausgenommen — sie brauchen erfundene Codes, um
     den echten Weg durch `/api/anlage` zu gehen, und werden nicht
     ausgeliefert. */
  const MD = [...listet(".").filter(n => n.endsWith(".md")),
              ...listet("review").filter(n => n.endsWith(".md")).map(n => "review/" + n)];

  for (const d of [...HTML, "public/sw.js", "src/index.js", "src/gnparse.js",
                   "src/gnmap.js", ...MD]) {
    test(d, () => {
      const m = verdaechtig.exec(lies(d));
      assert.equal(m, null, m ? "sieht aus wie ein Code im Klartext: " + m[0] : "");
    });
  }

  test("die Anmeldung vergleicht keine Codeliste in der App", () => {
    const s = inlineSkript();
    assert.match(s, /const USER=\{\}/, "USER muss leer bleiben");
    assert.equal(/USER\s*\[\s*code\s*\]/.test(s), false,
      "die App darf nicht mehr selbst gegen eine Codeliste prüfen");
  });
});

describe("Was ausgeliefert wird, muss übersetzbar sein", () => {
  for (const d of HTML) {
    test(d + ": der Inline-Block hat keinen Syntaxfehler", () => {
      /* Nur übersetzt, nicht ausgeführt — ein doppeltes `const` oder eine
         fehlende Klammer fällt sonst erst im Keller auf. */
      assert.doesNotThrow(() => new vm.Script(inlineSkript(d), { filename: d }));
    });

    test(d + ": jeder <style>-Block ist geschlossen", () => {
      const t = lies(d);
      const bloecke = [...t.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]);
      assert.ok(bloecke.length >= 1, d + ": kein <style>-Block gefunden");
      bloecke.forEach((b, i) => {
        const auf = (b.match(/\{/g) || []).length, zu = (b.match(/\}/g) || []).length;
        assert.equal(auf, zu, `${d}: Block ${i + 1} hat ${auf} { und ${zu} }`);
      });
    });
  }
});

describe("Rollen (Regel 4)", () => {
  test("der Worker kennt genau service, wirtschaft, leitung", () => {
    const w = lies("src", "index.js");
    const rollen = new Set([...w.matchAll(/darf\(p,\s*([^)]*)\)/g)]
      .flatMap(m => m[1].split(",").map(s => s.trim().replace(/^["']|["']$/g, ""))));
    /* Ohne diese Zeile ist die Prüfung grün, sobald `darf(` verschwindet
       oder anders geschrieben wird — sie liefe dann über eine leere
       Menge und bestätigte sich selbst. */
    assert.ok(rollen.size > 0, "keine einzige Rechteprüfung im Worker gefunden");
    for (const r of rollen)
      assert.ok(["service", "wirtschaft", "leitung"].includes(r),
        "unbekannte Rolle im Worker: " + r);
  });

  test("das Backoffice bietet keine Rolle an, die der Worker nicht kennt", () => {
    const l = lies("public", "leitung.html");
    const m = /const ROLLNAME=\{([^}]*)\}/.exec(l);
    assert.ok(m, "ROLLNAME nicht gefunden");
    const namen = [...m[1].matchAll(/(\w+)\s*:/g)].map(x => x[1]);
    assert.deepEqual(namen.sort(), ["leitung", "service", "wirtschaft"]);
  });
});

/* Was der Worker vergibt, muss die App eintippen können — sonst sperrt
   eine Umstellung das Haus aus, ohne dass irgendwo ein Fehler erscheint.
   Runde 15 (18.09.2026) dreht die Länge von sechs bis acht zurück auf
   genau vier: im Keller wird mit kalten Fingern getippt. Die Zahl steht
   jetzt an EINER Stelle je Datei (`PIN_LAENGE`), und diese Prüfungen
   halten die drei Dateien aufeinander. */
describe("Codelänge: was der Worker vergibt, muss die App annehmen", () => {
  const app = lies("public", "index.html");
  const leitung = lies("public", "leitung.html");
  const worker = lies("src", "index.js");
  const LAENGE = 4;

  test("der Worker nennt die Länge genau einmal", () => {
    const m = /const PIN_LAENGE = (\d+);/.exec(worker);
    assert.ok(m, "PIN_LAENGE fehlt in src/index.js");
    assert.equal(+m[1], LAENGE);
    assert.match(worker, /PIN_MUSTER\.test\(code\)/,
      "personSchreiben prüft die Länge nicht mehr über PIN_MUSTER");
    assert.doesNotMatch(worker, /\^\\d\{\d,\d\}\$/,
      "es steht noch eine zweite, fest eingetragene Länge im Worker");
  });

  test("die App nennt dieselbe Länge", () => {
    const m = /const PIN_LAENGE=(\d+);/.exec(app);
    assert.ok(m, "PIN_LAENGE fehlt in public/index.html");
    assert.equal(+m[1], LAENGE, "App und Worker sind sich uneinig");
  });

  /* Runde 16 (B5): Das Backoffice trug vier harte Vieren. Jetzt nennt es
     die Zahl wie die beiden anderen Dateien genau einmal, als
     `PIN_LAENGE`, und leitet Muster, Feldlänge und Vorschlag daraus ab. */
  test("das Backoffice nennt dieselbe Länge — und nur einmal", () => {
    const m = /const PIN_LAENGE=(\d+);/.exec(leitung);
    assert.ok(m, "PIN_LAENGE fehlt in public/leitung.html");
    assert.equal(+m[1], LAENGE, "Backoffice und Worker sind sich uneinig");
    assert.match(leitung, /PIN_MUSTER\.test\(code\)/,
      "das Backoffice prüft die Länge nicht über PIN_MUSTER");
    assert.doesNotMatch(leitung, /\^\\d\{\d+\}\$/,
      "es steht noch eine fest eingetragene Länge im Backoffice");
    assert.doesNotMatch(leitung, /maxlength="\d+"[^>]*id="nCode"|id="nCode"[^>]*maxlength="\d+"/,
      "das Codefeld deckelt auf eine fest eingetragene Zahl");
  });

  test("die Taste zum Vorschlagen bietet einen Code der richtigen Länge", () => {
    assert.match(leitung, /\$\("#nCode"\)\.value=wuerfelPin\(\);/,
      "der Vorschlag ist weg oder umgebaut");
    assert.match(leitung, /spanne=Math\.pow\(10,PIN_LAENGE\)/,
      "der Vorschlag würfelt nicht über die ganze Spanne");
    assert.match(leitung, /padStart\(PIN_LAENGE,"0"\)/,
      "der Vorschlag füllt nicht auf PIN_LAENGE auf");
  });

  test("jedes Codefeld der App nimmt genau diese Länge", () => {
    const felder = [...app.matchAll(/<input[^>]*class="[^"]*input--pin[^"]*"[^>]*>/gs)];
    assert.ok(felder.length >= 3, "erwartet: Anmeldung, Verwaltung, Freigabe");
    for (const f of felder) {
      const m = /maxlength="([^"]+)"/.exec(f[0]);
      assert.ok(m, "Codefeld ohne maxlength: " + f[0].slice(0, 80));
      assert.equal(m[1], "${PIN_LAENGE}",
        "dieses Codefeld nennt die Länge selbst statt PIN_LAENGE: " + f[0].slice(0, 80));
    }
  });

  /* Runde 15: Bei fester Länge weiss die App, wann der Code zu Ende ist —
     die vierte Ziffer sendet. Das war bei wechselnder Länge genau falsch
     (es verbrannte die Versuche bis zur Sperre) und ist jetzt richtig. */
  test("die Anmeldung schickt nach der letzten Ziffer von selbst ab", () => {
    const s = inlineSkript();
    assert.match(s, /\[data-ok\]/, "die Bestätigungstaste fehlt als zweiter Weg");
    assert.match(s, /vielleichtSenden=\(\)=>\{ if\(inp\.value\.length===PIN_LAENGE\)pruefe\(\); \}/,
      "das Absenden nach der letzten Ziffer fehlt");
  });

  test("die Anmeldung lässt sich mit der Tastatur bedienen", () => {
    const s = inlineSkript();
    assert.match(s, /renderLogin\._tastatur/, "der Horcher für die Tastatur fehlt");
    assert.match(s, /e\.key==="Backspace"/, "die Rücktaste fehlt");
    assert.match(s, /a\.pruefe\(\)/, "die Eingabetaste sendet nicht");
    assert.match(s, /renderLogin\._akt=/,
      "der Horcher klebt an den Funktionen eines einzelnen Aufbaus");
  });

  test("die Löschtaste fragt nicht auf Wahrheit ab (dataset liefert \"\")", () => {
    const s = inlineSkript();
    assert.equal(/if\(b\.dataset\.weg\)/.test(s), false,
      "`data-weg` ohne Wert ist \"\" und damit falsch — die Löschtaste "
      + "hängte so ein undefined an den Code");
    assert.match(s, /"weg" in b\.dataset/);
  });
});
