/* Befunde vom iPhone · was sich als TEXT prüfen lässt (18.09.2026)

   Drei der elf Befunde lassen sich in Chromium nicht zeigen:

     F4 — dass etwas WEG ist, beweist kein Bild, sondern nur die
          Abwesenheit im Quelltext.
     F5 — dasselbe für „Verwaltung“.
     F6 — die Safe-Area. Chromium hat weder Notch noch Statusleiste;
          `env(safe-area-inset-top)` ist dort immer 0, und ein Bild zeigt
          genau dieselbe Seite wie vorher. Geprüft wird deshalb, dass die
          Regel dasteht UND dass `viewport-fit=cover` im meta-Tag steht —
          ohne das liefert env() auch auf dem iPhone 0.

   Was hier NICHT bewiesen wird: wie es auf einem echten iPhone aussieht.
   Das bleibt UNGEPRÜFT und gehört in den Morgenbrief.                  */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { lies } from "./hilfe/dateien.mjs";

const APP = lies("public/index.html");
const BO  = lies("public/leitung.html");

describe("F4 · der Fotoschritt der Fassungsliste ist weg", () => {
  /* Produktfotos in den Laden (.gshot, GETR.pic) sind etwas anderes und
     bleiben — deshalb wird auf die Namen des Schrittes geprüft, nicht auf
     das Wort „Foto“. */
  const verboten = [
    ["der Aufnahmeknopf", /class="fotobtn/],
    ["der Fotoblock im Abschluss", /rFotos\s*\(/],
    ["die Galerie im Protokoll", /docFotos\s*\(/],
    ["der Bildspeicher", /const FDB\s*=/],
    ["das Nachladen der Bilder", /fillFotos\s*\(/],
    ["das Fach im Vorgangspaket", /fotos:\s*\[\]/],
    ["der offene Punkt", /Fassungsliste noch nicht fotografiert/],
    ["der Kacheltext", /Liste fotografieren/]
  ];
  for (const [was, muster] of verboten)
    test(was + " kommt in index.html nicht mehr vor", () => {
      assert.doesNotMatch(APP, muster);
    });

  test("das Backoffice zählt keine Fotos mehr", () => {
    assert.doesNotMatch(BO, /v\.fotos/);
  });

  test("der Bildspeicher wird beim Start einmal geräumt", () => {
    assert.match(APP, /indexedDB\.deleteDatabase\("hh_fotos"\)/);
    assert.match(APP, /aufraeumenFotospeicher\(\)/);
  });
});

describe("F5 · Verwaltung raus, Backoffice rein", () => {
  test("die Startseite trägt keinen Knopf „Verwaltung“ mehr", () => {
    assert.doesNotMatch(APP, /id="bAdmin"/);
  });
  test("die Startseite trägt einen Link auf leitung.html", () => {
    assert.match(APP, /id="bBackoffice" href="leitung\.html"/);
  });
  test("der Link hängt an der Rolle leitung", () => {
    assert.match(APP, /meineRolle\(\)==="leitung"/);
  });
  test("die Rolle kommt aus /api/ich, nicht aus der Anmeldung", () => {
    assert.match(APP, /fetch\(API\+"\/ich"/);
  });
});

describe("F6 · der Kopf beginnt unter der Statusleiste", () => {
  for (const [name, roh] of [["index.html", APP], ["leitung.html", BO]])
    test(name + " setzt viewport-fit=cover", () => {
      assert.match(roh, /<meta name="viewport"[^>]*viewport-fit=cover/);
    });

  /* Runde 14: Das Polster der Startseite ist mit dem farbigen Kopf
     umgezogen. `.menu` selbst ist seither randlos (der Kopf soll bis an
     die Kante) — das Polster gegen die Statusleiste sitzt in `.mkopf`. */
  test("index.html: Kopf, Startseite und Anmeldung tragen das Polster", () => {
    assert.match(APP, /header\{[^}]*padding:max\(12px,env\(safe-area-inset-top\)\)/);
    assert.match(APP, /\.mkopf\{[^}]*padding:max\(12px,env\(safe-area-inset-top\)\)/);
    assert.match(APP, /\.login\{[^}]*env\(safe-area-inset-top\)/);
  });

  test("leitung.html: der Kopf trägt das Polster, auch am Handy", () => {
    const treffer = [...BO.matchAll(/\.kopf\{[^}]*\}/g)].map(m => m[0]);
    assert.ok(treffer.length >= 2, "erwartet: Grundregel und Handy-Regel");
    for (const r of treffer)
      assert.match(r, /env\(safe-area-inset-top\)/, r.slice(0, 60));
  });
});

describe("F7 · „offen“ gehört der Aufgabe, nicht der Warteschlange", () => {
  /* Runde 14: „Alles übertragen“ war weiterhin zweideutig — darüber stand,
     die Tagesfassung stehe noch aus. Beide Zeilen sagen jetzt ausdrücklich,
     dass es um dieses GERÄT geht, nicht um die Arbeit. */
  test("das grüne Feld spricht nur noch von Übertragung", () => {
    assert.doesNotMatch(APP, /Nichts offen – alles übertragen/);
    assert.doesNotMatch(APP, /t="Alles übertragen"/);
    assert.match(APP, /t="Nichts liegt mehr auf diesem Gerät"/);
  });
  test("die Wartezeile nennt den Vorgang, nicht „offen“", () => {
    assert.doesNotMatch(APP, /warten auf Übertragung/);
    assert.match(APP, /o===1\?"1 Vorgang liegt noch auf diesem Gerät"/);
    assert.match(APP, /o\+" Vorgänge liegen noch auf diesem Gerät"/);
    assert.match(APP, /else if\(o>0\)\{ t=viele; k="wartet"; \}/);
  });
});

describe("F8 · 24 px unter der Lade", () => {
  test("die Zurück/Weiter-Leiste hält 24 px Abstand nach oben", () => {
    assert.match(APP, /\.navrow\{[^}]*margin:24px 0/);
  });
});

describe("F2/F3 · was die Gestaltung tragen muss", () => {
  test("die Lade ist ein Raster, das umbricht", () => {
    assert.match(APP, /grid-template-columns:repeat\(auto-fit,minmax\(72px,1fr\)\)/);
  });
  test("kein Kasten der Lade beschneidet mehr", () => {
    assert.doesNotMatch(APP, /\.drwi\{[^}]*overflow:hidden/);
  });
  test("der Versatz jeder zweiten Spalte ist weg", () => {
    assert.doesNotMatch(APP, /gversetzt/, "bis auf den Kommentar, der ihn erklärt");
  });
  test("der Name hat zwei Zeilen Platz und trennt", () => {
    assert.match(APP, /\.gcap\{[^}]*min-height:2\.6em/);
    assert.match(APP, /\.gcap\{[^}]*hyphens:auto/);
    assert.match(APP, /\.gcap\{[^}]*overflow-wrap:anywhere/);
  });
  test("die Weinzeile ist ein Raster mit fester Ringspalte", () => {
    assert.match(APP, /\.w--zaehl\{[^}]*grid-template-columns:minmax\(0,1fr\) var\(--dotsp\)/);
    assert.match(APP, /\.dots\{[^}]*width:var\(--dotsp\)/);
    assert.match(APP, /\.dots\{[^}]*justify-content:flex-start/);
  });

  /* Jagd 13, A1: Das Raster stand zuerst an `.w` und zerriss damit sieben
     andere Zeilentypen. Die Grundform muss eine Reihe bleiben. */
  test("die Grundform .w bleibt eine Reihe, nicht ein Raster", () => {
    const grund = /\n\.w\{[^}]*\}/.exec(APP);
    assert.ok(grund, ".w nicht gefunden");
    assert.match(grund[0], /display:flex/);
    assert.doesNotMatch(grund[0], /grid-template-columns/);
  });

  test("nur die Zählzeile trägt das Raster", () => {
    /* dotRow() ist die einzige Stelle, die `w--zaehl` vergibt. */
    const treffer = [...APP.matchAll(/className="w w--zaehl"/g)];
    assert.equal(treffer.length, 2, "Aufbau und upd() in dotRow()");
  });
});

/* ══════════════════════════════════════════════════════════════════════
   Runde 14 · die Punkte aus der Durchsicht am iPhone

   Auch hier gilt: geprüft wird, dass die Regel bzw. der Satz dasteht.
   Wie es aussieht, zeigen die Belege unter `review/screens/`.          */

describe("Runde 14 · Startseite", () => {
  test("der Tag steht ohne „Für“ und ohne Jahr", () => {
    assert.match(APP, /function deTagKurz\(iso\)/);
    const f = /function deTagKurz\(iso\)\{[\s\S]{0,240}?toLocaleDateString\([^)]*\{[^}]*\}\)/.exec(APP);
    assert.ok(f, "deTagKurz nicht gefunden");
    assert.match(f[0], /weekday:"long",day:"2-digit",month:"2-digit"/);
    assert.doesNotMatch(f[0], /year:/, "das Jahr kostet die halbe Zeile");
    assert.match(APP, /#datumTxt"\)\.textContent=deTagKurz\(d\.tag\)\+" · ändern"/);
    assert.doesNotMatch(APP, /"Für "\+/);
  });

  test("der Kopf der Startseite setzt sich vom Inhalt ab", () => {
    assert.match(APP, /<header class="mkopf">/);
    assert.match(APP, /\.mkopf\{[^}]*background:var\(--accent\)/);
    assert.match(APP, /\.minhalt\{[^}]*max-width:var\(--maxw\)/);
  });

  test("die Anrede steht ÜBER dem Statusfeld", () => {
    const menu = /\$\("#menu"\)\.innerHTML=`[\s\S]*?`;/.exec(APP);
    assert.ok(menu, "renderMenu nicht gefunden");
    const gruss = menu[0].indexOf("${grussZeile()}");
    const netz  = menu[0].indexOf("netz--block");
    assert.ok(gruss > -1 && netz > -1, "Anrede oder Statusfeld fehlt");
    assert.ok(gruss < netz, "die Anrede muss vor dem Statusfeld kommen");
  });

  /* Runde 15: Das Feld öffnet die Begrüßung weiterhin, ist aber kein
     einzelner Knopf mehr — sonst passte „Gesehen" nicht hinein. */
  test("das Statusfeld öffnet die Begrüßung", () => {
    assert.match(APP, /class="netz netz--block netz--tipp"/);
    assert.match(APP, /nb\.onclick=e=>\{[^}]*grussZeigen\(\); \}/);
    assert.match(APP, /\.netz--tipp\{[^}]*cursor:pointer/);
    assert.match(APP, /\.netz--tipp\{[^}]*box-shadow/, "hebt sich vom Grund ab");
  });

  test("die Überschrift „Außer der Reihe“ ist weg, die Gruppe bleibt", () => {
    assert.doesNotMatch(APP, /Außer der Reihe/);
    assert.match(APP, /<div class="grp grp--ausser">\$\{card\("nach"\)\}<\/div>/);
  });

  test("die Kacheltexte lauten wie abgesprochen", () => {
    assert.match(APP, /t:"Nachfüllen",d:"Am Nachmittag Bar auffüllen\."/);
    assert.match(APP, /t:"Sonderentnahme",d:"Schnell was holen\?"/);
  });
});

describe("Runde 14 · Sonderentnahme braucht einen Grund", () => {
  test("es gibt fünf Gründe zur Auswahl", () => {
    const g = /const GRUENDE=\[[\s\S]*?\]\];/.exec(APP);
    assert.ok(g, "GRUENDE nicht gefunden");
    for (const k of ["kueche", "personal", "bruch", "verkostung", "zimmer"])
      assert.match(g[0], new RegExp('"' + k + '"'));
  });

  test("ohne Grund bleibt der Vorgang offen", () => {
    assert.match(APP, /mode==="nach"&&!d\.grund/);
    assert.match(APP, /Grund fehlt – wofür wurde geholt\?/);
  });

  test("der Grund geht ins Journal, ohne neue Spalte", () => {
    const W = lies("src/index.js");
    assert.match(W, /GRUND_ERLAUBT = \["kueche", "personal", "bruch", "verkostung", "zimmer"\]/);
    assert.match(W, /"grund=" \+ d\.grund/);
    /* Die Notiz-Spalte gibt es live schon — keine Migration nötig. */
    assert.doesNotMatch(W, /ALTER TABLE ereignis/);
  });
});

describe("Runde 14 · Laden und Weinzeile", () => {
  test("Gasteiner 0,25 steht auf acht", () => {
    const S = JSON.parse(lies("src/stamm.json"));
    const treffer = JSON.stringify(S).match(/\["gastklein",\s*(\d+)\]/);
    assert.ok(treffer, "gastklein nicht im Stapel gefunden");
    assert.equal(treffer[1], "8");
  });

  test("alle Flaschenspalten der Lade 1 sind gleich hoch", () => {
    /* Gestreckt wird an der LÄNGSTEN Flaschenspalte; alle bekommen
       dieselbe Zellenhöhe. Sprite/Spritzer muss unten nicht ankommen. */
    assert.match(APP, /flaschen\.forEach\(sp=>sp\.style\.setProperty\("--gcellh",neu\)\)/);
    assert.match(APP, /if\(n>hoch\.n\)hoch=\{n:n,sp:sp\}/);
  });

  test("die Ringe behalten ihre Größe, die Spalte wird breiter", () => {
    const f = /function ringMasse\(m\)\{[\s\S]*?\n\}/.exec(APP);
    assert.ok(f, "ringMasse nicht gefunden");
    assert.match(f[0], /const G=13, D=32;/);
    assert.match(f[0], /setProperty\("--dotd",D\+"px"\)/);
    assert.match(f[0], /setProperty\("--dotsp",\(n\*D\+\(n-1\)\*G\)\+"px"\)/);
  });

  test("die Ringe brechen nie um", () => {
    assert.match(APP, /\.dots\{[^}]*flex-wrap:nowrap/);
  });

  test("die Trefferfläche bleibt 44 px, auch bei 30-px-Ringen", () => {
    assert.match(APP, /\.dot::after\{[^}]*height:var\(--tap-min\)/);
    assert.match(APP, /\.chk::after\{[^}]*height:var\(--tap-min\)/);
  });

  test("die Rebsorte färbt die Überschrift, nicht die Zeile", () => {
    assert.match(APP, /const REBTON=\{/);
    assert.match(APP, /\.reb--farbe\{[^}]*border-left:3px solid var\(--rebton\)/);
    assert.doesNotMatch(APP, /\.reb--b\{/, "die Zebra-Tönung ist ersetzt");
  });
});

describe("Runde 14 · die Zählzeile bleibt eine Zeile", () => {
  /* Am iPad rutschte „voll" unter den Namen: die Regel im Block
     @media(min-width:720px) gab `.w` drei Spalten, die Zählzeile hat aber
     vier Kinder. Derselbe Fehler wie A1 aus Runde 13, nur eine Breite
     höher. */
  test("die 720er-Regel nimmt die Zählzeile aus", () => {
    assert.match(APP, /\.w:not\(\.w--zaehl\)\{display:grid;grid-template-columns:1fr auto auto/);
    assert.doesNotMatch(APP, /\n  \.w\{display:grid;grid-template-columns:1fr auto auto/);
  });
  test("die Zählzeile behält ihre vier Spalten", () => {
    assert.match(APP, /\.w--zaehl\{[^}]*grid-template-columns:minmax\(0,1fr\) var\(--dotsp\) 24px auto/);
  });
});

/* ══════════════════════════════════════════════════════════════════════
   Runde 15 · die drei Funde der Agenten aus Runde 14                    */

describe("Runde 15 · der Grund gilt in beiden Zweigen", () => {
  test("auch der Getränke-Zweig zeigt die Grundknöpfe", () => {
    /* rNach (Wein) und rGetrMenge (Getränke) rufen beide rGrund. */
    const treffer = [...APP.matchAll(/\n  (?:if\(mode==="nach"\))?rGrund\(m\);/g)];
    assert.equal(treffer.length, 2, "rNach und rGetrMenge");
    assert.match(APP, /if\(mode==="nach"\)rGrund\(m\);/,
      "im Getränke-Zweig nur für die Sonderentnahme, nicht für den Wareneingang");
  });
  test("die Pflicht bleibt für den ganzen Modus", () => {
    assert.match(APP, /mode==="nach"&&!d\.grund/);
  });
});

describe("Runde 15 · „Gesehen“ steht wieder auf der Startseite", () => {
  test("der Statusblock ist kein Knopf mehr", () => {
    assert.doesNotMatch(APP, /<button type="button" class="netz netz--block netz--tipp"/);
    assert.match(APP, /<div class="netz netz--block netz--tipp"/);
  });
  test("er trägt den Quittierknopf und einen Knopf zur Begrüßung", () => {
    const block = /<div class="netz netz--block netz--tipp"[\s\S]*?<\/div>/.exec(APP);
    assert.ok(block, "Statusblock nicht gefunden");
    assert.match(block[0], /class="netzok" hidden/);
    assert.match(block[0], /class="netzmehr"/);
  });
  test("ein Tipp auf „Gesehen“ öffnet nicht die Begrüßung", () => {
    assert.match(APP, /if\(e\.target\.closest\("\.netzok"\)\)return; grussZeigen\(\);/);
  });
  test("der Live-Bereich steckt nicht mehr im Knopf", () => {
    assert.match(APP, /<span class="netztext" role="status">/);
  });
});

describe("Runde 15 · Startseite und Vorgang nennen denselben Tag", () => {
  test("Kopf und Tagesstand fragen vorgabeTag(), nicht today()", () => {
    assert.match(APP, /deTagKurz\(vorgabeTag\(\)\)/);
    assert.doesNotMatch(APP, /deTagKurz\(today\(\)\)/);
    const f = /function tagesStand\(\)\{[\s\S]*?const heute=(\w+)\(\);/.exec(APP);
    assert.ok(f, "tagesStand nicht gefunden");
    assert.equal(f[1], "vorgabeTag");
  });
  test("ein gewählter Tag steht als gewählt da", () => {
    assert.match(APP, /vorgabeTag\(\)===today\(\)\?"":" · gewählt"/);
  });
  test("nach der Tagwahl wird die Startseite neu gezeichnet", () => {
    const f = /sel\.onchange=\(\)=>\{[\s\S]*?\n  \};/.exec(APP);
    assert.ok(f, "sel.onchange nicht gefunden");
    assert.match(f[0], /renderMenu\(\)/);
  });
});

describe("Runde 14 · Abschluss", () => {
  test("der Knopf heißt „Fertig – Speichern“", () => {
    assert.match(APP, /"Fertig – Speichern"/);
    assert.doesNotMatch(APP, /Fertig – Protokoll erstellen/);
  });
});
