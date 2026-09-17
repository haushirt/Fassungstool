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

/* Auflage 2 vor dem Livegang: Die vier ersten Codes des Hauses sind aus
   der Geschichte des Anhangs bekannt und werden durch längere ersetzt.
   Das ist keine Einstellung im Dashboard, sondern eine Zusage des Codes:
   Wer einen sechsstelligen Code vergibt, muss ihn auch eintippen können.
   Bis v21 hörte jedes Codefeld nach vier Ziffern auf — die Umstellung
   hätte das Haus ausgesperrt, ohne dass irgendwo ein Fehler erscheint. */
describe("Codelänge: was der Worker vergibt, muss die App annehmen", () => {
  const app = lies("public", "index.html");
  const leitung = lies("public", "leitung.html");
  const worker = lies("src", "index.js");

  test("der Worker vergibt keine vierstelligen Codes mehr", () => {
    const m = /!\/\^\\d\{(\d),(\d)\}\$\/\.test\(code\)/.exec(worker);
    assert.ok(m, "die Prüfung der Codelänge in personSchreiben() ist weg oder umgebaut");
    assert.equal(m[1], "6", "Mindestlänge ist nicht sechs Ziffern");
    assert.equal(m[2], "8", "Höchstlänge ist nicht acht Ziffern");
  });

  test("das Backoffice prüft dieselbe Länge wie der Worker", () => {
    assert.match(leitung, /\/\^\\d\{6,8\}\$\//,
      "das Backoffice liesse eine Länge durch, die der Worker ablehnt");
  });

  test("die Taste zum Vorschlagen bietet keinen vierstelligen Code an", () => {
    const m = /#nCode"\)\.value=String\((\d+)\+/.exec(leitung);
    assert.ok(m, "der Vorschlag ist weg oder umgebaut");
    assert.ok(String(m[1]).length >= 6,
      "der Vorschlag ist wieder vierstellig: " + m[1]);
  });

  test("jedes Codefeld der App nimmt acht Ziffern", () => {
    const felder = [...app.matchAll(/<input[^>]*class="[^"]*input--pin[^"]*"[^>]*>/gs)];
    assert.ok(felder.length >= 3, "erwartet: Anmeldung, Verwaltung, Freigabe");
    for (const f of felder) {
      const m = /maxlength="(\d+)"/.exec(f[0]);
      assert.ok(m, "Codefeld ohne maxlength: " + f[0].slice(0, 80));
      assert.equal(m[1], "8",
        "dieses Codefeld nimmt nur " + m[1] + " Ziffern: " + f[0].slice(0, 80));
    }
  });

  test("die Anmeldung schickt erst auf Tastendruck ab", () => {
    const s = inlineSkript();
    assert.match(s, /\[data-ok\]/, "die Bestätigungstaste fehlt");
    assert.equal(/inp\.oninput=\(\)=>\{male\(\);pruefe\(\);\}/.test(s), false,
      "die Anmeldung schickt wieder bei jeder Ziffer ab — bei wechselnder "
      + "Länge verbrennt das die Versuche bis zur Sperre");
  });

  test("die Löschtaste fragt nicht auf Wahrheit ab (dataset liefert \"\")", () => {
    const s = inlineSkript();
    assert.equal(/if\(b\.dataset\.weg\)/.test(s), false,
      "`data-weg` ohne Wert ist \"\" und damit falsch — die Löschtaste "
      + "hängte so ein undefined an den Code");
    assert.match(s, /"weg" in b\.dataset/);
  });
});
