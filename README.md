# STACK ATTACK

Ein Retro-Browserspiel zum Java-Lernen. Der **Bug** wirft Code-Schnipsel die Rampen der Hochschulflure hinunter.
Unten steht der **Studi im Hoodie**:

- **→ Kicken**: das Teil, das als Nächstes in die Lösung gehört, wandert in den Code (rechts im Editor).
- **↑ / Leertaste Springen**: alle anderen Teile rutschen drunter durch und verbrennen im **Garbage Collector**.
- Falsch gekickt oder umgerannt kostet einen Kaffee ☕. Nach einem falschen Kick erklärt das Spiel den Fehler.
- Ab und zu rutscht ein **Kaffeebecher** herunter: einsammeln (stehen bleiben oder kicken) gibt ein Extraleben (max. 5).
- **P** Pause · **M** Ton an/aus · **Esc** Menü. Auf Touch-Geräten erscheinen Knöpfe.

Läuft komplett im Browser, ohne Backend, ohne Build-Schritt, ohne externe Server (Schriften liegen lokal in `fonts/`).
Highscores werden lokal im Browser gespeichert (localStorage).

## Installation

Den ganzen Ordner auf einen beliebigen Webserver kopieren (Hochschul-Webspace, GitHub Pages, …) – fertig.

Lokal testen (per Doppelklick geht es nicht, der Browser darf dann keine Dateien nachladen):

```bash
cd stack-attack
python3 -m http.server
# dann http://localhost:8000 öffnen
```

## Eigene Aufgaben hinzufügen

1. Textdatei (UTF-8) in `aufgaben/` anlegen, z. B. `06-summe.txt`
2. Dateinamen in `aufgaben/index.json` eintragen – die Reihenfolge dort ist die Reihenfolge im Spiel.

### Format

```
Größte Zahl im Array                       <- erste Zeile: Titel
Schreibe eine Methode max, die ...         <- weitere Zeilen: Aufgabenstellung
===CODE===
public static int max(int[] a) {
    int max = a[0];
    for (int i = 1; i < a.length; i++) {
        if (a[i] > max) {
            max = a[i];
        }
    }
    return max;
}
===FALSCH===
int max = 0;                              // Startwert 0 ist falsch, wenn alle Zahlen negativ sind!
for (int i = 0; i <= a.length; i++) {     // Mit <= wird über das Array-Ende hinaus gelesen.
max = i;                                  // Das ist der Index, nicht der Wert!
```

### Wie der Code in Teile zerlegt wird

- Jede Zeile wird ein Teil.
- **Datentypen am Zeilenanfang werden abgetrennt**: `int max = a[0];` wird zu `int` + `max = a[0];`.
  Dann rollen auch andere Typen (`double`, `String`, `int[]`, `void`, …) als Ablenker an.
- **Zuweisungen werden am `=` geteilt**: `max = a[i];` wird zu `max =` + `a[i];` (ebenso `+=`, `-=`, `*=`, …).
  Aus `int max = a[0];` werden so drei Teile: `int` + `max =` + `a[0];`.
- **for-Köpfe werden an den Semikolons geteilt**: `for (int i = 1;` + `i < a.length;` + `i++)`.
- **Fest vorgegeben** (werden nicht geworfen): Modifizierer wie `public static`, Zeilen, die nur aus Klammern bestehen,
  `{` am Zeilenende, `}` am Zeilenanfang und Kommentare.
- **Eigene Zerlegung**: Mit dem Marker `/*|*/` lässt sich eine Zeile beliebig zerteilen. Dann wird für diese Zeile nichts automatisch zerlegt.
  Beispiel: `for (int i = 0; /*|*/ i < a.length; /*|*/ i++) {` ergibt drei Teile. (Der Marker ist ein Java-Kommentar, die Datei bleibt also gültiger Code.)

### Falsche Teile (`===FALSCH===`)

- Eine Zeile pro Fehler, die Erklärung steht nach `//`. Sie wird nach einem falschen Kick angezeigt.
- Man schreibt einfach die ganze fehlerhafte Zeile. Das Spiel sucht selbst die passende Zeile im korrekten Code und
  wirft nur die Teile, die sich unterscheiden (bei `String c = text.charAt(i);` also nur `String`).
- Zusätzlich erzeugt das Spiel **automatisch typische Fehler**: Off-by-one (`<` ↔ `<=`), vertauschte Vergleiche,
  `=` statt `==`, fehlendes Semikolon, `length` ↔ `length()`, `println` statt `return`, falsche Datentypen,
  `[1]` statt `[0]`, vertauschte Zuweisung, `==` statt `equals`, `'a'` ↔ `"a"`, `++` ↔ `--` usw.
  Die eigenen Fehler aus `===FALSCH===` kommen bevorzugt.
- Ein „richtiges“ Teil, das noch nicht an der Reihe ist, gilt ebenfalls als falsch. Die Reihenfolge zählt!

Wenn eine Datei fehlerhaft ist, zeigt das Startmenü eine Warnung mit dem Dateinamen.

## Für Entwickler

- `js/aufgaben.js` – Einlesen, Zerlegen, automatische Fehler
- `js/spiel.js` – Spiel (Canvas, Pixel-Grafik, Ton per WebAudio, Highscores)
- Test-Parameter: `?start=0` startet Aufgabe 0 direkt, `?start=karriere` alle Aufgaben,
  `&sim=60&bot=1` simuliert 60 s mit einem Bot, der perfekt spielt (praktisch für Screenshots/Tests).
