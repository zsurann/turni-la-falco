/* Parser dei PDF dei turni (griglia: data | giorno | colonne orarie con i nomi).
   Lavora su elementi di testo con coordinate: {str, x, y, w} (y dall'alto verso il basso).

   Note riconosciute accanto ai nomi:
   - "NOME 18"  -> il turno finisce alle 18:00 (se segue un altro turno della stessa persona, i due si uniscono)
   - "18 NOME"  -> il turno inizia alle 18:00
   Sono riconosciute anche colonne aggiuntive (es. "Turno Extra 22:00 - 06:00"). */
(function (root) {
  'use strict';

  var MONTHS = { gen: 0, feb: 1, mar: 2, apr: 3, mag: 4, giu: 5, lug: 6, ago: 7, set: 8, ott: 9, nov: 10, dic: 11 };
  var TIME_RE = /^\d{1,2}:\d{2}$/;
  var MONTH_TOKEN = /^([a-zà-ù]{3})-(\d{2})$/i;

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function byX(a, b) { return a.x0 - b.x0; }
  function byRowThenX(a, b) {
    var ra = Math.round(a.y / 6), rb = Math.round(b.y / 6);
    return ra - rb || a.x0 - b.x0;
  }

  /* ---------- lettura delle parole ---------- */

  // Divide token "incollati": "C.18" -> "C." + "18", "18SBRIZZI" -> "18" + "SBRIZZI", "06:00-14:00" -> due orari
  function pieces(tok) {
    var m;
    if (MONTH_TOKEN.test(tok)) return [[0, tok.length]];
    if (/^-?\d{1,2}:\d{2}-\d{1,2}:\d{2}$/.test(tok)) {
      var i = tok.lastIndexOf('-');
      return [[0, i], [i + 1, tok.length]];
    }
    m = /^([^\d]*[A-Za-zÀ-ÿ.][^\d]*)(\d{1,2}(?:[:.]\d{2})?)$/.exec(tok);
    if (m) return [[0, m[1].length], [m[1].length, tok.length]];
    m = /^(\d{1,2}(?:[:.]\d{2})?)([A-Za-zÀ-ÿ][^\d]*)$/.exec(tok);
    if (m) return [[0, m[1].length], [m[1].length, tok.length]];
    return [[0, tok.length]];
  }

  function explode(items) {
    var words = [];
    items.forEach(function (it) {
      var s = it.str;
      if (!s || !s.trim()) return;
      var len = s.length, re = /\S+/g, m;
      while ((m = re.exec(s))) {
        var tok = m[0], base = m.index;
        pieces(tok).forEach(function (seg) {
          var raw = tok.slice(seg[0], seg[1]);
          if (!raw) return;
          var x0 = it.x + it.w * ((base + seg[0]) / len);
          var x1 = it.x + it.w * ((base + seg[1]) / len);
          var t = /^-?\d{1,2}:\d{2}-?$/.test(raw) ? raw.replace(/-/g, '') : raw;
          words.push({ t: t, x0: x0, x1: x1, c: (x0 + x1) / 2, y: it.y });
        });
      }
    });
    return words;
  }

  function clusterRows(ws, tol) {
    var sorted = ws.slice().sort(function (a, b) { return a.y - b.y; }), groups = [];
    sorted.forEach(function (w) {
      var g = groups[groups.length - 1];
      if (g && Math.abs(w.y - g.y) <= tol) g.items.push(w);
      else groups.push({ y: w.y, items: [w] });
    });
    return groups;
  }

  /* ---------- lettura di una pagina ---------- */

  function parsePage(items, ctx) {
    var words = explode(items);
    var timeWords = words.filter(function (w) { return TIME_RE.test(w.t); });
    var groups = clusterRows(timeWords, 4).filter(function (g) { return g.items.length >= 2; });
    var cols = ctx && ctx.cols, mainY = Infinity, mainRight = Infinity;

    if (groups.length) {
      // riga di intestazione principale = quella con più orari; le altre sono colonne extra
      var main = groups.reduce(function (b, g) {
        return (g.items.length > b.items.length || (g.items.length === b.items.length && g.y > b.y)) ? g : b;
      });
      mainY = main.y;
      mainRight = Math.max.apply(null, main.items.map(function (w) { return w.x1; })) + 10;
      cols = [];
      groups.forEach(function (g) {
        var its = g.items.slice().sort(byX), label = '';
        if (g !== main) {
          label = words.filter(function (w) {
            return !TIME_RE.test(w.t) && w.t !== '-' && w.y < g.y - 1 && w.y > g.y - 30 &&
              w.c >= its[0].x0 - 10 && w.c <= its[its.length - 1].x1 + 10;
          }).sort(byRowThenX).map(function (w) { return w.t; }).join(' ');
        }
        for (var i = 0; i + 1 < its.length; i += 2) {
          cols.push({ start: its[i].t, end: its[i + 1].t, c: (its[i].x0 + its[i + 1].x1) / 2, label: label });
        }
      });
      cols.sort(function (a, b) { return a.c - b.c; });
    }
    if (!cols || !cols.length) return null;

    var spacing = cols.length > 1 ? (cols[cols.length - 1].c - cols[0].c) / (cols.length - 1) : 100;
    var leftBound = cols[0].c - spacing / 2;

    // mese/anno ("nov-26") e titolo (es. "CAMPO SUD ROM")
    var year = ctx && ctx.year, title = ctx && ctx.title, titleWords = [];
    words.forEach(function (w) {
      if (!(w.y < mainY - 3)) return;
      var m = MONTH_TOKEN.exec(w.t);
      if (m && MONTHS[m[1].toLowerCase()] !== undefined) { year = 2000 + parseInt(m[2], 10); return; }
      if (TIME_RE.test(w.t) || w.t === '-') return;
      if (w.c < leftBound || w.x1 > mainRight) return;
      titleWords.push(w);
    });
    if (titleWords.length) title = titleWords.sort(byRowThenX).map(function (w) { return w.t; }).join(' ');
    if (!year) year = new Date().getFullYear();

    var rows = [];
    words.forEach(function (d) {
      var m = /^(\d{1,2})-([a-zà-ù]{3})$/i.exec(d.t);
      if (!m || MONTHS[m[2].toLowerCase()] === undefined) return;
      var month = MONTHS[m[2].toLowerCase()], day = parseInt(m[1], 10);
      var cells = cols.map(function () { return []; });
      words.filter(function (w) { return w !== d && Math.abs(w.y - d.y) <= 5 && w.c >= leftBound; })
        .sort(byX)
        .forEach(function (w) {
          var best = 0, bd = Infinity;
          cols.forEach(function (col, i) {
            var dist = Math.abs(w.c - col.c);
            if (dist < bd) { bd = dist; best = i; }
          });
          cells[best].push(w.t);
        });
      rows.push({ date: year + '-' + pad(month + 1) + '-' + pad(day), cells: cells.map(function (c) { return c.join(' '); }) });
    });

    return { cols: cols, year: year, title: title, rows: rows };
  }

  function parseDocument(pages) {
    var ctx = null, rows = [], cols = null, title = '';
    pages.forEach(function (items) {
      var r = parsePage(items, ctx);
      if (!r) return;
      ctx = { cols: r.cols, year: r.year, title: r.title };
      cols = r.cols; title = r.title || title;
      rows = rows.concat(r.rows);
    });
    if (!rows.length) throw new Error('Formato del PDF non riconosciuto');
    return {
      title: title,
      cols: cols.map(function (c) { return { start: c.start, end: c.end, label: c.label || '' }; }),
      rows: rows
    };
  }

  /* ---------- riconoscimento del nome e delle note ---------- */

  function normTok(s) {
    return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  }
  function nameTokens(name) {
    return String(name).split(/\s+/).map(normTok).filter(Boolean);
  }
  function cellTokens(cell) {
    return cell.split(/\s+/).filter(Boolean).map(function (r) { return { raw: r, n: normTok(r) }; })
      .filter(function (t) { return t.n; });
  }
  // "18" -> 1080 (minuti), "17.30" -> 1050; non è un orario -> null
  function hourMin(raw) {
    var m = /^(\d{1,2})(?:[:.](\d{2}))?$/.exec(raw);
    if (!m) return null;
    var h = +m[1], mi = m[2] ? +m[2] : 0;
    if (h > 24 || mi > 59) return null;
    return h * 60 + mi;
  }
  function toMin(t) { var p = t.split(':'); return +p[0] * 60 + +p[1]; }
  function fmt(min) { min = ((min % 1440) + 1440) % 1440; return pad(Math.floor(min / 60)) + ':' + pad(min % 60); }

  // Due parti di nome sono "uguali" se identiche, oppure se una è l'altra accorciata dal PDF
  // (es. GIANNELAVIGN / GIANNELAVIG per GIANNELAVIGNA). Servono almeno 10 lettere e al massimo 3 tagliate,
  // così nomi diversi (e iniziali come "V.") non si confondono.
  function tokEq(a, b) {
    if (a === b) return true;
    var s = a.length <= b.length ? a : b, l = s === a ? b : a;
    return s.length >= 10 && l.length - s.length <= 3 && l.indexOf(s) === 0;
  }

  function locate(toks, want) {
    if (!want.length) return -1;
    for (var s = 0; s + want.length <= toks.length; s++) {
      var ok = true;
      for (var k = 0; k < want.length; k++) if (!tokEq(toks[s + k].n, want[k])) { ok = false; break; }
      // "GIANNELAVIG V." è un'altra persona rispetto a "GIANNELAVIGNA": una lettera sola dopo il nome è l'iniziale di un altro cognome
      var nx = toks[s + want.length];
      if (ok && nx && /^[A-Z]$/.test(nx.n) && !/^[A-Z]$/.test(want[want.length - 1])) ok = false;
      if (ok) return s;
    }
    return -1;
  }

  function unique(a) { return a.filter(function (x, k) { return a.indexOf(x) === k; }); }

  // Chi inizia nel momento in cui finisce un turno (endMin > 1440 = finisce il giorno dopo)
  function successors(doc, ri, endMin, mine) {
    var row = doc.rows[ri], target = endMin, rel = row, out = [];
    if (target > 1440) {
      rel = doc.rows[ri + 1];
      target -= 1440;
      if (rel && Date.parse(rel.date) - Date.parse(row.date) !== 86400000) rel = null;
    }
    if (!rel) return out;
    rel.cells.forEach(function (o, j) {
      if (!o || (rel === row && mine[j])) return;
      var toks = cellTokens(o);
      var lead = toks.length ? hourMin(toks[0].raw) : null;
      var st = lead !== null ? lead : toMin(doc.cols[j].start);
      if (st % 1440 !== target % 1440) return;
      var t = toks.filter(function (x) { return hourMin(x.raw) === null; })
        .map(function (x) { return x.raw; }).join(' ');
      if (t && out.indexOf(t) === -1) out.push(t);
    });
    return out;
  }

  // Segmento di una cella: orario di inizio/fine (dalle note, altrimenti dalla colonna)
  function mkSeg(doc, i, so, eo, name) {
    var col = doc.cols[i], cs = toMin(col.start), ce = toMin(col.end);
    var s = so !== null ? so : cs, e = eo !== null ? eo : ce;
    if (e <= s) e += 1440;
    return { i: i, s: s, e: e, so: so, eo: eo, name: name, base: (ce <= cs ? ce + 1440 : ce) - cs };
  }

  // Unisce i segmenti consecutivi/sovrapposti della stessa persona e costruisce i turni
  function buildEntries(doc, ri, segs) {
    var row = doc.rows[ri], out = [], merged = [];
    segs.sort(function (a, b) { return a.s - b.s; });
    segs.forEach(function (sg) {
      var cur = merged[merged.length - 1];
      if (cur && sg.s <= cur.e) { cur.e = Math.max(cur.e, sg.e); cur.parts.push(sg); }
      else merged.push({ s: sg.s, e: sg.e, parts: [sg] });
    });
    merged.forEach(function (m) {
      var mine = {}, notes = [], baseDur = 0;
      m.parts.forEach(function (p) {
        var col = doc.cols[p.i];
        mine[p.i] = true;
        // se l'orario è scritto per intero ("06 NOME 18") è già visibile: nota solo per le estensioni
        if (!(p.so !== null && p.eo !== null)) {
          if (p.so !== null && p.so !== toMin(col.start)) notes.push('Dalle ' + fmt(p.so));
          if (p.eo !== null && p.eo !== toMin(col.end)) notes.push('Fino alle ' + fmt(p.eo));
        }
        baseDur = Math.max(baseDur, p.base);
      });
      var fc = doc.cols[m.parts[0].i];
      out.push({
        date: row.date, name: m.parts[0].name || '',
        start: fmt(m.s), end: fmt(m.e),
        kindStart: fc.start, label: fc.label || '', zone: doc.title,
        note: unique(notes).join(' · '),
        extended: (m.e - m.s) > baseDur,
        mates: successors(doc, ri, m.e, mine)
      });
    });
    return out;
  }

  // Turni della persona "name" in un documento già letto
  function findShifts(doc, name) {
    var want = nameTokens(name), out = [];
    if (!want.length) return out;
    var wantRev = want.slice().reverse();
    doc.rows.forEach(function (row, ri) {
      var segs = [];
      row.cells.forEach(function (cell, i) {
        if (!cell) return;
        var toks = cellTokens(cell);
        var s = locate(toks, want);
        if (s < 0 && want.length > 1) s = locate(toks, wantRev);
        if (s < 0) return;
        var before = toks[s - 1], after = toks[s + want.length];
        segs.push(mkSeg(doc, i,
          before ? hourMin(before.raw) : null,
          after ? hourMin(after.raw) : null, String(name).trim()));
      });
      if (segs.length) out = out.concat(buildEntries(doc, ri, segs));
    });
    return out;
  }

  // Tutti gli operatori in turno in un certo giorno (YYYY-MM-DD), con orario
  function dayOperators(doc, date) {
    var ri = -1, byKey = {}, order = [], out = [];
    doc.rows.forEach(function (r, k) { if (r.date === date) ri = k; });
    if (ri < 0) return out;
    doc.rows[ri].cells.forEach(function (cell, i) {
      if (!cell) return;
      var toks = cellTokens(cell), so = null, eo = null;
      if (toks.length && hourMin(toks[0].raw) !== null) { so = hourMin(toks[0].raw); toks = toks.slice(1); }
      if (toks.length && hourMin(toks[toks.length - 1].raw) !== null) { eo = hourMin(toks[toks.length - 1].raw); toks = toks.slice(0, -1); }
      if (!toks.length) return;
      var key = toks.map(function (t) { return t.n; }).join('');
      if (!byKey[key]) { byKey[key] = []; order.push(key); }
      byKey[key].push(mkSeg(doc, i, so, eo, toks.map(function (t) { return t.raw; }).join(' ')));
    });
    order.forEach(function (k) { out = out.concat(buildEntries(doc, ri, byKey[k])); });
    out.sort(function (a, b) { return toMin(a.start) - toMin(b.start); });
    return out;
  }

  // "full" è il testo estratto dal PDF, "name" è il nome cercato dall'utente
  function nameMatches(full, name) {
    var want = nameTokens(name), toks = cellTokens(String(full));
    if (!want.length || toks.length !== want.length) return false;
    return locate(toks, want) === 0 || locate(toks, want.slice().reverse()) === 0;
  }

  var api = { parseDocument: parseDocument, findShifts: findShifts, dayOperators: dayOperators, nameMatches: nameMatches };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TurniParser = api;
})(typeof self !== 'undefined' ? self : this);
