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

  test("index.html: Kopf, Startseite und Anmeldung tragen das Polster", () => {
    assert.match(APP, /header\{[^}]*padding:max\(12px,env\(safe-area-inset-top\)\)/);
    assert.match(APP, /\.menu\{[^}]*env\(safe-area-inset-top\)/);
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
  test("das grüne Feld spricht nur noch von Übertragung", () => {
    assert.doesNotMatch(APP, /Nichts offen – alles übertragen/);
    assert.match(APP, /t="Alles übertragen"/);
  });
  test("die Wartezeile nennt den Vorgang, nicht „offen“", () => {
    assert.doesNotMatch(APP, /warten auf Übertragung/);
    assert.match(APP, /t=viele\+" wartet"/);
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
    assert.match(APP, /\.w\{[^}]*grid-template-columns:minmax\(0,1fr\) var\(--dotsp\)/);
    assert.match(APP, /\.dots\{[^}]*width:var\(--dotsp\)/);
    assert.match(APP, /\.dots\{[^}]*justify-content:flex-start/);
  });
});
