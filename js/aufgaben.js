'use strict';
/*
 * Stack Attack – Einlesen der Aufgabendateien.
 *
 * Format einer Aufgabendatei (UTF-8):
 *
 *   Titel der Aufgabe            <- erste Zeile = Titel
 *   Beschreibung ...             <- Rest bis ===CODE=== = Aufgabenstellung
 *   ===CODE===
 *   ... korrekter Java-Code ...
 *   ===FALSCH===                 <- optional
 *   falsches Codestück     // Erklärung, warum es falsch ist
 *
 * Zerlegung des Codes in "Teile" (das, was der Bug herunterwirft):
 *   - jede Zeile ist ein Teil
 *   - ein Datentyp am Zeilenanfang (int, double, String[], ...) wird als eigenes Teil abgetrennt
 *   - Modifizierer (public static ...) sowie öffnende/schließende Klammern { } werden fest vorgegeben
 *   - mit dem Marker /*|*\/ kann man eine Zeile selbst beliebig zerteilen (dann entfällt die Automatik)
 */
window.SA = window.SA || {};
(function (SA) {
  const TYPEN = ['int', 'long', 'double', 'float', 'char', 'boolean', 'byte', 'short', 'String'];
  const TYP_RE = /^((?:(?:public|private|protected|static|final|abstract)\s+)*)((?:int|long|double|float|char|boolean|byte|short|String|void)(?:\s*\[\s*\])*)\s+(\S.*)$/;
  const NUR_TYP = /^(int|long|double|float|char|boolean|byte|short|String|void)((?:\[\])*)$/;
  const MARKER = '/*|*/';
  const SCHLUESSELWOERTER = new Set(('abstract boolean break byte case catch char class continue default do double else ' +
    'extends final finally float for if implements import int interface long new null package private protected ' +
    'public return short static super switch this throw throws true false try void while String System').split(' '));

  /** Normalform zum Vergleichen: Leerraum um Sonderzeichen ignorieren. */
  const norm = (s) => s.replace(/\s+/g, ' ').trim().replace(/\s*([^\w\s])\s*/g, '$1');
  SA.norm = norm;

  function lev(a, b) {
    const d = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      let vorher = d[0];
      d[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const tmp = d[j];
        d[j] = Math.min(d[j] + 1, d[j - 1] + 1, vorher + (a[i - 1] === b[j - 1] ? 0 : 1));
        vorher = tmp;
      }
    }
    return d[b.length];
  }
  const aehnlich = (a, b) => 1 - lev(a, b) / Math.max(a.length, b.length, 1);

  /**
   * Zerlegt ein Codestück feiner:
   *   for (int i = 0; i < n; i++)  ->  "for (int i = 0;" | "i < n;" | "i++)"
   *   max = a[i];                  ->  "max =" | "a[i];"   (auch +=, -=, *=, /=, %=)
   */
  function feinZerlegen(txt) {
    const f = txt.match(/^(for\s*\()([^;:]*;)([^;]*;)(.*\))$/);
    if (f) return [f[1] + f[2].trim(), f[3].trim(), f[4].trim()];
    if (/^(return|if|while|else|do|switch|case)\b/.test(txt)) return [txt];
    let tiefe = 0, str = null;
    for (let i = 0; i < txt.length; i++) {
      const ch = txt[i];
      if (str) { if (ch === '\\') i++; else if (ch === str) str = null; continue; }
      if (ch === '"' || ch === "'") str = ch;
      else if ('([{'.includes(ch)) tiefe++;
      else if (')]}'.includes(ch)) tiefe--;
      else if (ch === '=' && tiefe === 0 && txt[i + 1] !== '=' && !'=!<>'.includes(txt[i - 1])) {
        const links = txt.slice(0, i + 1).trim(), rechts = txt.slice(i + 1).trim();
        if (rechts && /^[\w.[\]]+\s*[-+*/%]?=$/.test(links)) return [links, rechts];
        return [txt];
      }
    }
    return [txt];
  }

  /** Zerlegt eine Codezeile in Segmente {text, fix, luecke}. luecke = Leerzeichen vor dem Segment. */
  function zerlegeZeile(roh) {
    const indent = roh.match(/^\s*/)[0];
    const t = roh.trim();
    if (!t) return { indent, segs: [] };
    const hatMarker = t.includes(MARKER);
    if ((!hatMarker && /^(\/\/|\/\*|\*)/.test(t)) || /^[{}();\s]+$/.test(t)) {
      return { indent, segs: [{ text: t, fix: true, luecke: '' }] };
    }
    let chunks;
    if (hatMarker) {
      const teile = t.split(MARKER);
      chunks = [];
      teile.forEach((p, i) => {
        const txt = p.trim();
        if (!txt) return;
        const luecke = i > 0 && (/\s$/.test(teile[i - 1]) || /^\s/.test(p)) ? ' ' : '';
        chunks.push({ text: txt, fix: false, luecke });
      });
    } else {
      const tm = t.match(TYP_RE);
      if (tm) {
        chunks = [];
        if (tm[1].trim()) chunks.push({ text: tm[1].trim(), fix: true, luecke: '' });
        chunks.push({ text: tm[2].replace(/\s+/g, ''), fix: false, luecke: ' ' });
        chunks.push({ text: tm[3], fix: false, luecke: ' ' });
      } else {
        chunks = [{ text: t, fix: false, luecke: '' }];
      }
    }
    // Klammern am Anfang/Ende werden fest vorgegeben
    const out = [];
    for (const c of chunks) {
      if (c.fix) { out.push(c); continue; }
      let txt = c.text;
      let luecke = c.luecke;
      const vorn = txt.match(/^\}\s*/);
      if (vorn && txt.length > vorn[0].length) {
        out.push({ text: '}', fix: true, luecke });
        luecke = vorn[0].length > 1 ? ' ' : '';
        txt = txt.slice(vorn[0].length);
      }
      let suffix = null;
      const hinten = txt.match(/\s*\{$/);
      if (hinten && txt.length > hinten[0].length) {
        suffix = { text: '{', fix: true, luecke: hinten[0].length > 1 ? ' ' : '' };
        txt = txt.slice(0, -hinten[0].length);
      }
      if (hatMarker) out.push({ text: txt, fix: false, luecke });
      else feinZerlegen(txt).forEach((t, i) => out.push({ text: t, fix: false, luecke: i ? ' ' : luecke }));
      if (suffix) out.push(suffix);
    }
    if (out.length) out[0].luecke = '';
    return { indent, segs: out };
  }

  /** Erzeugt automatisch typische Fehler-Varianten eines korrekten Teils. */
  function mutationen(text, kontext) {
    const res = [];
    const m = (neu, warum) => {
      if (neu && norm(neu) !== norm(text) && !res.some((r) => norm(r.text) === norm(neu))) res.push({ text: neu, warum });
    };

    const tm = text.match(NUR_TYP);
    if (tm) {
      const basis = tm[1];
      const arr = tm[2] || '';
      if (kontext === 'methode') {
        if (basis === 'void') {
          for (const t of ['int', 'boolean', 'String']) m(t, `Die Methode gibt nichts zurück – der Rückgabetyp ist deshalb void, nicht ${t}.`);
        } else {
          m('void', 'void heißt: Die Methode gibt nichts zurück. Hier muss aber ein Wert zurückgegeben werden.');
        }
      }
      if (basis !== 'void') {
        for (const t of TYPEN) if (t !== basis) m(t + arr, `${t}${arr} ist hier der falsche Datentyp.`);
        if (basis === 'String') m('string' + arr, 'Java unterscheidet Groß- und Kleinschreibung: Der Typ heißt String – mit großem S.');
        if (arr) m(basis, 'Hier wird ein Array gebraucht, nicht nur ein einzelner Wert.');
        else m(basis + '[]', 'Hier wird ein einzelner Wert gebraucht, kein Array.');
      }
      return res;
    }

    const schleifenBedingung = /^\w+ (<|<=|>|>=|!=) [^;]+;$/.test(text); // mittlerer Teil eines for-Kopfs
    const bedingung = /^(if|while|else if)\b/.test(text) || /^return\b/.test(text) || schleifenBedingung;

    if (/ < [^;]*(length|size\(\))/.test(text)) m(text.replace(' < ', ' <= '), 'Off-by-one! Mit <= läuft die Schleife einen Schritt zu weit → ArrayIndexOutOfBoundsException.');
    if ((/^for\b/.test(text) || schleifenBedingung) && / <= /.test(text)) m(text.replace(' <= ', ' < '), 'Off-by-one! Mit < fehlt der letzte Schleifendurchlauf.');
    if (/^\w+\+\+\)$/.test(text) || /^for\b.*\w\+\+/.test(text)) m(text.replace(/(\w)\+\+/, '$1--'), 'Die Zählvariable läuft in die falsche Richtung.');
    else if (/^\w+--\)$/.test(text) || /^for\b.*\w--/.test(text)) m(text.replace(/(\w)--/, '$1++'), 'Die Zählvariable läuft in die falsche Richtung.');
    if (/^for \((int|long) /.test(text)) m(text.replace(/^for \((int|long) /, 'for ('), 'Die Zählvariable muss in der Schleife deklariert werden, z. B. for (int i = …');
    if (/^for \(/.test(text) && /;$/.test(text)) m(text.replace(/;$/, ','), 'Die drei Teile des for-Kopfs werden mit Semikolons getrennt, nicht mit Kommas.');
    if (/^\w+ \+=$/.test(text)) m(text.replace('+=', '='), 'Mit = wird der Wert überschrieben statt aufaddiert.');
    if (/^\w+ \*=$/.test(text)) m(text.replace('*=', '='), 'Mit = wird der Wert überschrieben statt multipliziert.');
    if (/^\w+ =$/.test(text)) m(text.replace('=', '=='), '== vergleicht nur – für eine Zuweisung braucht man ein einfaches =.');
    if (bedingung) {
      if (/ > /.test(text)) m(text.replace(' > ', ' < '), 'Vergleich verdreht: Der Operator zeigt in die falsche Richtung.');
      else if (/ < /.test(text)) m(text.replace(' < ', ' > '), 'Vergleich verdreht: Der Operator zeigt in die falsche Richtung.');
      if (/ == /.test(text)) m(text.replace(' == ', ' = '), '= ist eine Zuweisung, kein Vergleich. Zum Vergleichen braucht man ==.');
      if (/ != /.test(text)) m(text.replace(' != ', ' == '), 'Bedingung umgedreht: == statt != prüft genau das Gegenteil.');
      if (/ >= /.test(text)) m(text.replace(' >= ', ' > '), 'Grenzfall vergessen: > schließt die Gleichheit aus.');
    }
    if (/&&/.test(text)) m(text.replace('&&', '||'), 'Und/Oder verwechselt: Hier müssen beide Bedingungen gelten (&&).');
    else if (/\|\|/.test(text)) m(text.replace('||', '&&'), 'Und/Oder verwechselt: Hier reicht es, wenn eine Bedingung gilt (||).');
    if (/;$/.test(text)) m(text.slice(0, -1), 'Da fehlt das Semikolon am Ende der Anweisung → Compilerfehler.');
    if (/\.length\(\)/.test(text)) m(text.replace('.length()', '.length'), 'Bei Strings ist length() eine Methode – die Klammern fehlen.');
    else if (/\.length\b(?!\s*\()/.test(text)) m(text.replace(/\.length\b/, '.length()'), 'Bei Arrays ist length ein Attribut, keine Methode – also ohne Klammern.');
    const ret = text.match(/^return\s+(.+);$/);
    if (ret) m(`System.out.println(${ret[1]});`, 'Ausgeben ist nicht zurückgeben! Die Methode muss den Wert mit return liefern.');
    if (/\[0\]/.test(text)) m(text.replace('[0]', '[1]'), 'Arrays beginnen bei Index 0 – mit [1] wird das erste Element übersehen.');
    if (/\btrue\b/.test(text)) m(text.replace(/\btrue\b/, 'false'), 'true und false vertauscht.');
    else if (/\bfalse\b/.test(text)) m(text.replace(/\bfalse\b/, 'true'), 'true und false vertauscht.');
    if (/'[^'\\]'/.test(text)) m(text.replace(/'([^'\\])'/, '"$1"'), "Ein einzelnes Zeichen (char) steht in einfachen Anführungszeichen, z. B. 'a'.");
    if (/ \+= /.test(text)) m(text.replace(' += ', ' = '), 'Mit = wird der Wert überschrieben statt aufaddiert.');
    if (/ \*= /.test(text)) m(text.replace(' *= ', ' = '), 'Mit = wird der Wert überschrieben statt multipliziert.');
    const zuw = text.match(/^(\w+(?:\[\w+\])?) = ([\w.[\]]+);$/);
    if (zuw && !/^\d/.test(zuw[2])) m(`${zuw[2]} = ${zuw[1]};`, 'Zuweisung verkehrt herum: Links steht die Variable, die den neuen Wert bekommt.');
    const eq = text.match(/([\w[\]().]+?)\.equals\(([^()]+)\)/);
    if (eq) m(text.replace(eq[0], `${eq[1]} == ${eq[2]}`), 'Strings vergleicht man mit equals(), nicht mit == (das vergleicht nur Referenzen).');
    const sig = text.match(/^(\w+)\((.+)\)$/);
    if (sig) {
      m(`${sig[1]}(${sig[2].replace(/\b(?:int|long|double|float|char|boolean|byte|short|String)(?:\[\])*\s+(\w+)/g, '$1')})`, 'Bei Parametern muss immer der Datentyp angegeben werden.');
      if (/\[\]/.test(sig[2])) m(text.replace('[]', ''), 'Der Parameter muss ein Array sein – die [] fehlen.');
    }
    const inc = text.match(/^(\w+)\+\+;$/);
    if (inc) m(`${inc[1]}--;`, 'Falsche Richtung: Hier muss hochgezählt werden.');
    const dec = text.match(/^(\w+)--;$/);
    if (dec) m(`${dec[1]}++;`, 'Falsche Richtung: Hier muss heruntergezählt werden.');

    if (!res.length) {
      // Notnagel: Groß-/Kleinschreibung eines Bezeichners
      const ids = text.match(/\b[a-z]\w*\b/g) || [];
      const id = ids.find((w) => !SCHLUESSELWOERTER.has(w));
      if (id) {
        const neu = id[0].toUpperCase() + id.slice(1);
        m(text.replace(new RegExp(`\\b${id}\\b`), neu), `Java unterscheidet Groß- und Kleinschreibung: ${neu} ist nicht ${id}.`);
      }
    }
    return res;
  }

  /** Liest eine Aufgabendatei ein und bereitet sie für das Spiel auf. */
  SA.parseAufgabe = function (quelltext, datei) {
    const zeilen = quelltext.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
    const abschnitte = { text: [], code: [], falsch: [] };
    let akt = 'text';
    for (const z of zeilen) {
      const m = z.match(/^\s*={3,}\s*([^=]+?)\s*={3,}\s*$/);
      if (m) {
        const k = m[1].toLowerCase();
        akt = k.startsWith('code') ? 'code' : k.startsWith('falsch') ? 'falsch' : 'text';
        continue;
      }
      abschnitte[akt].push(z);
    }
    if (!abschnitte.code.some((z) => z.trim())) throw new Error(`${datei}: Abschnitt ===CODE=== fehlt oder ist leer.`);

    // Aufgabenstellung
    const textZeilen = abschnitte.text.join('\n').trim().split('\n');
    let titel, beschreibung;
    if (textZeilen.length > 1) {
      titel = textZeilen[0].trim();
      beschreibung = textZeilen.slice(1).join('\n').trim();
    } else {
      titel = datei.replace(/\.[^.]+$/, '');
      beschreibung = textZeilen[0] || '';
    }

    // Code: Tabs ersetzen, Leerzeilen am Rand weg, gemeinsame Einrückung entfernen
    let code = abschnitte.code.map((z) => z.replace(/\t/g, '    ').replace(/\s+$/, ''));
    while (code.length && !code[0].trim()) code.shift();
    while (code.length && !code[code.length - 1].trim()) code.pop();
    const minIndent = Math.min(...code.filter((z) => z.trim()).map((z) => z.match(/^ */)[0].length));
    code = code.map((z) => z.slice(minIndent));

    const zeilenObj = code.map(zerlegeZeile);
    const teile = [];
    zeilenObj.forEach((z, zi) => {
      const offen = z.segs.filter((s) => !s.fix);
      offen.forEach((s, k) => {
        let kontext = '';
        if (NUR_TYP.test(s.text)) kontext = offen[k + 1] && /^\w+\s*\(/.test(offen[k + 1].text) ? 'methode' : 'typ';
        s.teil = teile.length;
        teile.push({ text: s.text, norm: norm(s.text), zeile: zi, kontext });
      });
    });
    if (!teile.length) throw new Error(`${datei}: Im Code wurden keine Teile gefunden.`);

    // Ablenker je Teil (Index)
    const ablenker = teile.map(() => []);
    const add = (ziel, text, warum, explizit) => {
      const n = norm(text);
      if (n === teile[ziel].norm) return;
      const liste = ablenker[ziel];
      const da = liste.find((a) => a.norm === n);
      if (da) { if (explizit) Object.assign(da, { text, warum: warum || da.warum, explizit }); return; }
      liste.push({ text, norm: n, warum, explizit });
    };

    // 1) explizite falsche Teile aus ===FALSCH===
    const zeilenNorm = zeilenObj
      .map((z, i) => ({
        i,
        norm: norm(z.segs.map((s) => s.luecke + s.text).join('')),
        teile: z.segs.filter((s) => !s.fix).map((s) => s.teil),
      }))
      .filter((z) => z.teile.length);
    const warnungen = [];
    for (const zeile of abschnitte.falsch) {
      if (!zeile.trim()) continue;
      const i = zeile.indexOf('//');
      const codeTeil = i >= 0 ? zeile.slice(0, i) : zeile;
      const warum = i >= 0 ? zeile.slice(i + 2).trim() : '';
      const zz = zerlegeZeile(codeTeil);
      const segs = zz.segs.filter((s) => !s.fix);
      if (!segs.length) continue;
      const dn = norm(zz.segs.map((s) => s.luecke + s.text).join(''));
      let beste = null;
      let besteA = -1;
      const erstesWort = (s) => (s.match(/^[A-Za-z_]\w*/) || [''])[0];
      for (const cz of zeilenNorm) {
        if (cz.norm === dn) continue;
        const a = aehnlich(dn, cz.norm) + (erstesWort(dn) && erstesWort(dn) === erstesWort(cz.norm) ? 0.3 : 0);
        if (a > besteA) { besteA = a; beste = cz; }
      }
      if (!beste) { warnungen.push(`Konnte "${codeTeil.trim()}" keiner Zeile zuordnen.`); continue; }
      segs.forEach((s, j) => {
        let ziel;
        if (segs.length === beste.teile.length) ziel = beste.teile[j];
        else {
          const sn = norm(s.text);
          ziel = beste.teile.reduce((b, t) => (aehnlich(sn, teile[t].norm) > aehnlich(sn, teile[b].norm) ? t : b), beste.teile[0]);
        }
        add(ziel, s.text, warum, true);
      });
    }

    // 2) automatische Fehler-Varianten
    teile.forEach((t, i) => mutationen(t.text, t.kontext).forEach((mu) => add(i, mu.text, mu.warum, false)));

    return { datei, titel, beschreibung, zeilen: zeilenObj, teile, ablenker, warnungen };
  };

  /** Kompletter Lösungscode als Text. */
  SA.codeText = (a) => a.zeilen.map((z) => z.indent + z.segs.map((s) => s.luecke + s.text).join('')).join('\n');
})(window.SA);
