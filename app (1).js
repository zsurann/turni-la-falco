import * as pdfjsLib from './pdf.min.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('./pdf.worker.min.mjs', import.meta.url).href;

const P = window.TurniParser;
const LS_DOCS = 'turni.docs.v2';
const LS_NAME = 'turni.name.v1';
const LS_OV = 'turni.overrides.v1';
const LS_ONB = 'turni.onboarded.v1';
const LS_GUIDE = 'turni.guide.v1';

const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
const GIORNI = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const PENCIL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"/></svg>';
const MOON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';

const $ = (s) => document.querySelector(s);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
};

let docs = store.get(LS_DOCS, []);
let name = store.get(LS_NAME, '');
let overrides = store.get(LS_OV, {});
let view = 'next';
let wiz = null; // stato della schermata Modifica

/* ---------- utilità ---------- */
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
function dateOf(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); }
const fmtLong = (d) => GIORNI[d.getDay()] + ' ' + d.getDate() + ' ' + MESI[d.getMonth()];
const fmtH = (h) => (Number.isInteger(h) ? h : h.toFixed(1).replace('.', ',')) + ' ore';

/* ---------- campo / ruolo in base al PDF ---------- */
function classifyText(raw) {
  const t = String(raw || '').toUpperCase().replace(/[_.]+/g, ' ');
  const r = {};
  if (/\bCAMPO\s+SUD\s+ROM\b/.test(t)) return { campo: 'Sud', ruolo: 'Sud Rom' };
  if (/\bROND[AE]\b/.test(t)) r.ruolo = 'Ronda';
  else if (/\bTERR[AE]\s+DEL\s+SOLE\b/.test(t)) r.ruolo = 'Gabbiotto';
  const lato = /\bLATO\s+(NORD|SUD)\b/.exec(t);
  if (lato) r.lato = lato[1] === 'NORD' ? 'Nord' : 'Sud';
  let c = /\bCAMPO\s+(NORD|SUD)\b/.exec(t);
  if (!c) c = /\b(NORD|SUD)\b/.exec(t.replace(/\bLATO\s+(NORD|SUD)\b/g, ' '));
  if (c) r.campo = c[1] === 'NORD' ? 'Nord' : 'Sud';
  return r;
}
function infoOf(zone, src) {
  const a = classifyText(zone), b = classifyText(src);
  return { campo: a.campo || b.campo || '', ruolo: a.ruolo || b.ruolo || '', lato: a.lato || b.lato || '' };
}
function labelOf(c) {
  if (c.ruolo === 'Sud Rom') return 'Sud Rom';
  if (!c.ruolo) return '';
  if (c.ruolo === 'Ronda' && c.campo === 'Nord' && c.lato) return 'Ronda Lato ' + c.lato;
  return c.ruolo + (c.campo ? ' ' + c.campo : '');
}
const roleOf = (s) => labelOf(infoOf(s.zone, s.src));

/* ---------- turni ---------- */
function decorate(s) {
  const day = dateOf(s.date);
  const [sh, sm] = s.start.split(':').map(Number);
  const [eh, em] = s.end.split(':').map(Number);
  const startAt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), sh, sm);
  const endAt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), eh, em);
  if (endAt <= startAt) endAt.setDate(endAt.getDate() + 1);
  const nextMidnight = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
  let type;
  if (/extra/i.test(s.label || '')) type = { k: 'x', label: 'Extra' };
  else if (endAt > nextMidnight) type = { k: 'n', label: 'Notte' };
  else if (startAt.getHours() < 12) type = { k: 'm', label: 'Mattina' };
  else type = { k: 'p', label: 'Pomeriggio' };
  const out = { ...s, day, startAt, endAt, hours: (endAt - startAt) / 36e5, type, night: endAt > nextMidnight, role: roleOf(s) };
  if (out.night && !s.rest) {
    const info = infoOf(s.zone, s.src);
    // Campo Sud: dopo la notte al Gabbiotto il cambio al mattino lo dà la Ronda (non un altro Gabbiotto)
    if (info.campo === 'Sud' && info.ruolo === 'Gabbiotto') out.mates = rondaSudCambio(nextMidnight, s.end);
  }
  return out;
}
function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function rondaSudCambio(day, at) {
  const names = [];
  docs.forEach((d) => {
    const i = infoOf(d.title, d.id);
    if (i.ruolo !== 'Ronda' || i.campo !== 'Sud') return;
    P.dayOperators(d, iso(day)).forEach((op) => {
      if (op.start === at && !P.nameMatches(op.name, name) && !names.includes(op.name)) names.push(op.name);
    });
  });
  return names;
}
// Applica l'eventuale modifica dell'utente (cambio turno / riposo) a un turno di base
function build(base, orig) {
  const ov = overrides[base.key];
  if (!ov) return decorate(base);
  const m = { ...base, ...ov, orig, mod: true };
  m.rest = !!ov.rest;
  m.mates = (m.mates || []).filter((x) => !P.nameMatches(x, name)); // il "Cambio" non può essere se stessi
  return decorate(m);
}
function allShifts() {
  const out = [], have = new Set();
  docs.forEach((d) => P.findShifts(d, name).forEach((s) => {
    have.add(s.date);
    const base = { ...s, src: d.id };
    base.key = [name, s.date, d.id, s.start].join('|');
    out.push(build(base, { start: s.start, end: s.end, role: roleOf(base) }));
  }));
  // Giorni presenti nei PDF in cui non ho nessun turno = Riposo
  // (solo se il nome compare almeno una volta, altrimenti probabilmente è scritto male)
  if (out.length) {
    const dates = new Set();
    docs.forEach((d) => d.rows.forEach((r) => dates.add(r.date)));
    dates.forEach((date) => {
      if (have.has(date)) return;
      const base = { date, start: '00:00', end: '00:00', zone: '', src: '', label: '', note: '', extended: false, mates: [], rest: true, auto: true };
      base.key = [name, date, 'riposo'].join('|');
      out.push(build(base, { rest: true }));
    });
  }
  out.sort((a, b) => a.startAt - b.startAt);
  return out;
}
function startOfToday() { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
function relLabel(s, now) {
  if (s.startAt <= now && s.endAt >= now) return 'In corso';
  const diff = Math.round((s.day - startOfToday()) / 864e5);
  if (diff === 0) return 'Oggi';
  if (diff === 1) return 'Domani';
  return 'Tra ' + diff + ' giorni';
}

/* ---------- rendering ---------- */
function render() {
  $('#whoName').textContent = name;
  $('#nameInput').value = name;

  const now = new Date();
  const shifts = allShifts();
  const upcoming = shifts.filter((s) => s.endAt >= now && !s.rest);

  renderHero(upcoming[0], now);
  renderStats(shifts);
  renderList(shifts, now);
  renderDocs();

  const empty = $('#empty');
  if (!docs.length) {
    empty.hidden = false;
    empty.replaceChildren(el('b', '', 'Nessun turno da mostrare'), el('p', '', 'Carica il PDF dei turni qui sotto: troverò io i tuoi.'));
  } else if (!shifts.length) {
    empty.hidden = false;
    empty.replaceChildren(el('b', '', 'Nessun turno per ' + name), el('p', '', 'Nei PDF caricati non compare questo nome. Controlla come è scritto qui sotto.'));
  } else {
    empty.hidden = true;
  }
  $('#shiftsSection').hidden = !shifts.length;
}

function renderHero(s, now) {
  const h = $('#hero');
  if (!s) { h.hidden = true; return; }
  h.hidden = false;
  const meta = el('div', 'meta');
  meta.append(el('span', 'chip ' + s.type.k, s.type.label));
  if (s.mod) meta.append(el('span', 'chip mod', 'Modificato'));
  if (s.extended) meta.append(el('span', 'chip ext', 'Prolungato'));
  meta.append(el('span', '', fmtH(s.hours)));
  if (s.note) meta.append(el('span', '', s.note));
  if (s.role) meta.append(el('span', 'role', s.role));
  h.replaceChildren(
    el('div', 'eyebrow', 'Prossimo turno'),
    el('div', 'when', relLabel(s, now)),
    el('div', 'date', fmtLong(s.day)),
    el('div', 'time', s.start + ' – ' + s.end),
    meta
  );
}

// Riepilogo MENSILE: tutti i turni del mese (anche quelli già passati); i giorni di Riposo non contano
const monthKey = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
const fmtNum = (h) => { const r = Math.round(h * 10) / 10; return Number.isInteger(r) ? String(r) : r.toFixed(1).replace('.', ','); };
let statsKey = null;   // mese mostrato (null = automatico: il mese corrente)
let statsKeys = [];    // mesi presenti nei PDF
function renderStats(shifts) {
  const box = $('#stats');
  statsKeys = [...new Set(shifts.map((s) => monthKey(s.day)))].sort();
  if (!statsKeys.length) { box.hidden = true; return; }
  if (!statsKeys.includes(statsKey)) {
    const cur = monthKey(new Date());
    statsKey = statsKeys.includes(cur) ? cur : (statsKeys.find((k) => k > cur) || statsKeys[statsKeys.length - 1]);
  }
  box.hidden = false;
  const [y, m] = statsKey.split('-').map(Number);
  $('#statsMonth').textContent = 'Riepilogo ' + MESI[m - 1] + ' ' + y;
  const i = statsKeys.indexOf(statsKey);
  $('#statsNav').hidden = statsKeys.length < 2;
  $('#statsPrev').disabled = i <= 0;
  $('#statsNext').disabled = i >= statsKeys.length - 1;
  const mine = shifts.filter((s) => !s.rest && monthKey(s.day) === statsKey);
  const hours = mine.reduce((a, s) => a + s.hours, 0);
  const nights = mine.filter((s) => s.night).length;
  const mk = (v, l) => { const d = el('div', 'stat'); d.append(el('b', '', String(v)), el('span', '', l)); return d; };
  $('#statsGrid').replaceChildren(mk(mine.length, 'Turni'), mk(fmtNum(hours), 'Ore'), mk(nights, 'Notti'));
  updatePay(hours, y, m);
}
/* ---------- stipendio ---------- */
const RATE = 6; // euro all'ora per tutti gli operatori
const eur = (v) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v);
let payOpen = false, payVal = 0, payRaf = 0;
function animatePay(to) {
  cancelAnimationFrame(payRaf);
  const from = payVal, t0 = performance.now(), dur = 900;
  const done = () => { payVal = to; $('#payAmt').textContent = eur(to); };
  if (from === to || matchMedia('(prefers-reduced-motion: reduce)').matches) { done(); return; }
  const tick = (t) => {
    const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    payVal = from + (to - from) * e;
    $('#payAmt').textContent = eur(payVal);
    if (k < 1) payRaf = requestAnimationFrame(tick); else done();
  };
  payRaf = requestAnimationFrame(tick);
}
function updatePay(hours, y, m) {
  const total = Math.round(hours * RATE * 100) / 100;
  const ended = new Date(y, m, 1) <= startOfToday(); // il mese m (0-based = mese successivo) è già iniziato => mese concluso
  $('#payTitle').textContent = 'Stipendio ' + MESI[m - 1] + ' ' + y;
  $('#payCalc').textContent = fmtNum(hours) + ' ore × ' + eur(RATE).replace(',00', '') + ' all\'ora';
  $('#payNote').textContent = ended
    ? 'Mese concluso: calcolato su tutte le ore del mese.'
    : 'Mese in corso: calcolato sulle ore attuali del riepilogo.';
  if (payOpen) animatePay(total); else { payVal = 0; $('#payAmt').textContent = eur(0); }
  payTarget = total;
}
let payTarget = 0;
function togglePay() {
  payOpen = !payOpen;
  $('#pay').classList.toggle('open', payOpen);
  $('#payBtn').setAttribute('aria-expanded', String(payOpen));
  $('#payBtnTxt').textContent = payOpen ? 'Nascondi' : 'Calcola';
  if (payOpen) { payVal = 0; animatePay(payTarget); } else cancelAnimationFrame(payRaf);
}
$('#payBtn').addEventListener('click', togglePay);

function stepMonth(dir) {
  const k = statsKeys[statsKeys.indexOf(statsKey) + dir];
  if (k) { statsKey = k; render(); }
}

function renderList(shifts, now) {
  const list = $('#list');
  const src = view === 'next' ? shifts.filter((s) => s.endAt >= now) : shifts;
  list.replaceChildren();
  if (!src.length) {
    list.append(el('p', 'hint', view === 'next' ? 'Nessun turno in programma.' : 'Nessun turno.'));
    return;
  }
  let curMonth = '';
  const today = startOfToday().getTime();
  src.forEach((s) => {
    const mk = s.day.getFullYear() + '-' + s.day.getMonth();
    if (mk !== curMonth) {
      curMonth = mk;
      list.append(el('div', 'month', MESI[s.day.getMonth()] + ' ' + s.day.getFullYear()));
    }
    const isToday = s.day.getTime() === today;
    const card = el('div', 'shift' + (isToday ? ' today' : '') + (s.endAt < now ? ' past' : '') + (s.rest ? ' rest' : ''));

    const dbox = el('div', 'dbox');
    dbox.append(el('b', '', String(s.day.getDate())), el('span', '', MESI[s.day.getMonth()].slice(0, 3)));

    const body = el('div');
    const main = el('div', 's-main');
    const dayEl = el('span', 's-day', GIORNI[s.day.getDay()] + (isToday ? ' · oggi' : ''));
    if (s.role && !s.rest) dayEl.append(el('span', 'role', ' · ' + s.role));
    main.append(dayEl, el('span', 's-time', s.rest ? 'Riposo' : s.start + ' – ' + s.end));

    const sub = el('div', 's-sub');
    if (s.rest) {
      sub.append(el('span', 'chip r', 'Riposo'));
    } else {
      sub.append(el('span', 'chip ' + s.type.k, s.type.label));
      if (s.mod) sub.append(el('span', 'chip mod', 'Modificato'));
      if (s.extended) sub.append(el('span', 'chip ext', 'Prolungato'));
      sub.append(el('span', '', fmtH(s.hours)));
      if (s.note) sub.append(el('span', 'note', s.note));
      if (s.mod && s.swap) sub.append(el('span', '', 'Scambio con ' + s.swap));
      sub.append(el('span', '', s.mates.length ? 'Cambio ' + s.mates.join(', ') : 'Cambio da definire'));
    }
    if (s.mod) sub.append(el('span', 'was', 'Prima: ' + (s.orig.rest ? 'Riposo' : s.orig.start + ' – ' + s.orig.end + (s.orig.role ? ' · ' + s.orig.role : ''))));

    const edit = el('button', 'edit');
    edit.type = 'button';
    edit.innerHTML = PENCIL + 'Modifica';
    edit.addEventListener('click', () => openSheet(s, edit));
    sub.append(edit);

    body.append(main, sub);
    card.append(dbox, body);
    list.append(card);
  });
}

function renderDocs() {
  const ul = $('#docs');
  ul.replaceChildren();
  docs.forEach((d) => {
    const li = el('li');
    const nm = el('div', 'nm');
    const n = P.findShifts(d, name).length;
    nm.append(el('b', '', d.id.replace(/\.pdf$/i, '').replace(/_/g, ' ').trim()), el('span', '', n + (n === 1 ? ' turno tuo' : ' turni tuoi') + ' · ' + d.rows.length + ' giorni'));
    const btn = el('button', 'x', '✕');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Rimuovi ' + d.id);
    btn.title = 'Rimuovi';
    btn.addEventListener('click', () => {
      docs = docs.filter((x) => x.id !== d.id);
      store.set(LS_DOCS, docs);
      setMsg('', '');
      render();
    });
    li.append(nm, btn);
    ul.append(li);
  });
}

/* ---------- Modifica turno (cambio) ---------- */
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2400);
}

function openSheet(shift, opener) {
  wiz = { shift, step: 1, campo: '', ruolo: '', opener };
  $('#sheet').hidden = false;
  document.body.classList.add('lock');
  renderSheet();
  $('#shPanel').focus();
}
function closeSheet() {
  if (!wiz) return;
  const op = wiz.opener;
  wiz = null;
  $('#sheet').hidden = true;
  document.body.classList.remove('lock');
  if (op && op.isConnected) op.focus();
}

function opt(title, sub, onClick, cls, right) {
  const b = el('button', 'opt' + (cls ? ' ' + cls : ''));
  b.type = 'button';
  const l = el('span', 'opt-l');
  l.append(el('b', '', title));
  if (sub) l.append(el('span', '', sub));
  b.append(l);
  if (right) b.append(el('span', 'opt-r', right));
  b.addEventListener('click', onClick);
  return b;
}
function backBtn(step) {
  const b = el('button', 'back', '‹ Indietro');
  b.type = 'button';
  b.addEventListener('click', () => { wiz.step = step; renderSheet(); });
  return b;
}
function docsFor(campo, ruolo) {
  return docs.map((d) => ({ d, c: infoOf(d.title, d.id) })).filter((x) => x.c.campo === campo && x.c.ruolo === ruolo);
}

function commit(entry, msg) {
  if (entry) overrides[wiz.shift.key] = entry; else delete overrides[wiz.shift.key];
  store.set(LS_OV, overrides);
  closeSheet();
  render();
  toast(msg);
}

function renderSheet() {
  const s = wiz.shift;
  const body = $('#shBody');
  const cur = s.rest ? 'Riposo' : s.start + ' – ' + s.end + (s.role ? ' · ' + s.role : '');
  $('#shSub').textContent = fmtLong(s.day) + ' · ' + cur;
  $('#shSteps').replaceChildren(...[1, 2, 3].map((n) => el('i', n <= wiz.step ? 'on' : '')));
  body.replaceChildren();

  if (wiz.step === 1) {
    body.append(el('p', 'q', 'Campo o riposo?'));
    ['Sud', 'Nord'].forEach((c) => body.append(opt('Campo ' + c, '', () => { wiz.campo = c; wiz.step = 2; renderSheet(); }, 'big')));
    if (!(s.auto && !s.mod)) { // su un giorno già di Riposo l'opzione non serve
      const rest = opt('Riposo', 'Quel giorno sei libero', () => commit(s.auto ? null : { rest: true }, 'Riposo impostato'), 'big rest');
      rest.insertAdjacentHTML('afterbegin', '<span aria-hidden="true">' + MOON + '</span>');
      body.append(rest);
    }
    if (s.mod) {
      const g = el('button', 'ghost', s.orig && s.orig.rest ? 'Torna a Riposo' : 'Ripristina turno originale');
      g.type = 'button';
      g.addEventListener('click', () => commit(null, 'Turno ripristinato'));
      body.append(g);
    }
    return;
  }

  if (wiz.step === 2) {
    body.append(backBtn(1), el('p', 'q', 'Che ruolo? · Campo ' + wiz.campo));
    const roles = wiz.campo === 'Sud' ? ['Ronda', 'Gabbiotto', 'Sud Rom'] : ['Ronda', 'Gabbiotto'];
    roles.forEach((r) => body.append(opt(r, '', () => { wiz.ruolo = r; wiz.step = 3; renderSheet(); }, 'big')));
    return;
  }

  body.append(backBtn(2), el('p', 'q', 'Con chi hai fatto il cambio? · Campo ' + wiz.campo + ' · ' + wiz.ruolo));
  const matched = docsFor(wiz.campo, wiz.ruolo);
  if (!matched.length) {
    body.append(el('p', 'none', 'Non hai caricato il PDF di Campo ' + wiz.campo + ' · ' + wiz.ruolo + '. Caricalo e riprova.'));
    return;
  }
  let shown = 0;
  matched.forEach(({ d, c }) => {
    const ops = P.dayOperators(d, s.date).filter((o) => !P.nameMatches(o.name, name));
    if (!ops.length) return;
    shown += ops.length;
    if (matched.length > 1) body.append(el('p', 'grp', labelOf(c)));
    ops.forEach((o) => {
      const t = decorate({ ...o, src: d.id });
      const sub = t.type.label + (o.note ? ' · ' + o.note : '');
      body.append(opt(o.name, sub, () => commit({
        swap: o.name, start: o.start, end: o.end, kindStart: o.kindStart, label: o.label,
        note: o.note, extended: o.extended, mates: o.mates, zone: d.title, src: d.id,
      }, 'Turno aggiornato'), '', o.start + ' – ' + o.end));
    });
  });
  if (!shown) body.append(el('p', 'none', 'Nessun operatore in questo giorno nel PDF.'));
}

/* ---------- lettura PDF ---------- */
async function readPdf(file) {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    pages.push(tc.items.filter((i) => 'str' in i).map((i) => ({ str: i.str, x: i.transform[4], y: vp.height - i.transform[5], w: i.width })));
  }
  return P.parseDocument(pages);
}

function setMsg(text, cls) {
  const m = $('#msg');
  m.textContent = text;
  m.className = 'msg ' + (cls || '');
}

async function handleFiles(files) {
  const list = [...files].filter((f) => /\.pdf$/i.test(f.name) || f.type === 'application/pdf');
  if (!list.length) { setMsg('Seleziona un file PDF.', 'err'); return; }
  setMsg('Lettura in corso…', '');
  const errors = [];
  let added = 0, found = 0;
  for (const f of list) {
    try {
      const doc = await readPdf(f);
      doc.id = f.name;
      docs = docs.filter((d) => d.id !== doc.id).concat(doc);
      added++;
      found += P.findShifts(doc, name).length;
    } catch (e) {
      errors.push(f.name);
    }
  }
  store.set(LS_DOCS, docs);
  render();
  if (added) endGuide(true);
  if (errors.length) setMsg('Non sono riuscito a leggere: ' + errors.join(', '), 'err');
  else if (added && !found) setMsg('PDF letto, ma non ho trovato "' + name + '".', 'err');
  else setMsg('Aggiunti ' + found + (found === 1 ? ' turno' : ' turni') + '.', 'ok');
}

/* ---------- eventi ---------- */
$('#file').addEventListener('change', (e) => { handleFiles(e.target.files); e.target.value = ''; });
const drop = $('#drop');
['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files));
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => e.preventDefault());

$('#nameForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = $('#nameInput').value.trim().toUpperCase();
  if (!v) return;
  name = v;
  store.set(LS_NAME, name);
  setMsg('', '');
  render();
});

function setView(v) {
  view = v;
  $('#tabNext').classList.toggle('on', v === 'next');
  $('#tabAll').classList.toggle('on', v === 'all');
  render();
}
$('#tabNext').addEventListener('click', () => setView('next'));
$('#tabAll').addEventListener('click', () => setView('all'));

$('#statsPrev').addEventListener('click', () => stepMonth(-1));
$('#statsNext').addEventListener('click', () => stepMonth(1));
$('#shClose').addEventListener('click', closeSheet);
$('#shBg').addEventListener('click', closeSheet);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

/* ---------- Installazione, benvenuto e guida ---------- */
const UA = navigator.userAgent;
const isStandalone = ['standalone', 'fullscreen', 'minimal-ui'].some((m) => matchMedia('(display-mode: ' + m + ')').matches) || navigator.standalone === true;
const isIOS = /iPhone|iPad|iPod/i.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isSafariIOS = isIOS && /Safari\//.test(UA) && !/CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|GSA\/|DuckDuckGo|YaBrowser|Brave|FBAN|FBAV|Instagram|Line\//i.test(UA);
const SHARE = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 3v12M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';
const setMode = (m) => {
  [...document.body.classList].filter((c) => c.startsWith('mode-')).forEach((c) => document.body.classList.remove(c));
  if (m) document.body.classList.add('mode-' + m);
};

// Schermata di installazione (unica cosa visibile finché l'app non è installata)
let installEvt = null;
let arrowEl = null;
function gateSteps(items) {
  const box = $('#gateSteps');
  box.replaceChildren();
  items.forEach((it, n) => {
    const row = el('div', 'gs');
    row.style.setProperty('--d', (n * 0.12) + 's');
    const num = el('i', '', String(n + 1));
    const t = el('span');
    t.innerHTML = it;
    row.append(num, t);
    box.append(row);
  });
  box.hidden = false;
}
function showArrow(on) {
  if (on && !arrowEl) { arrowEl = el('div', 'arrow', '↓'); document.body.append(arrowEl); }
  if (!on && arrowEl) { arrowEl.remove(); arrowEl = null; }
}
function gateInstalled() {
  $('#gate').classList.add('done');
  $('#gateSteps').hidden = true;
  showArrow(false);
  $('#gateBtn').hidden = true;
  $('#gate h1').innerHTML = 'App installata<br>✓';
  $('#gateLead').textContent = 'Ora chiudi questa pagina e apri "Turni" dalla schermata Home.';
  $('#gateNote').textContent = '';
}
function showGate() {
  setMode('');
  $('#gate').hidden = false;
  $('#welcome').hidden = true;
  const btn = $('#gateBtn'), note = $('#gateNote');
  let mode = isIOS ? (isSafariIOS ? 'ios-safari' : 'ios-other') : 'auto';
  if (mode === 'ios-other') {
    btn.textContent = 'Apri con Safari';
    $('#gateLead').textContent = "Per scaricare l'app devi aprire questo link con Safari.";
    note.textContent = 'Il link si apre da Safari, poi segui le istruzioni.';
  }
  btn.addEventListener('click', async () => {
    if (mode === 'ios-safari') {
      const box = $('#gateSteps');
      if (!box.hidden) { box.hidden = true; showArrow(false); btn.textContent = "Scarica l'app"; return; }
      gateSteps(['Tocca <b>Condividi</b> ' + SHARE + ' nella barra di Safari', 'Scorri e scegli <b>Aggiungi alla schermata Home</b>', 'Tocca <b>Aggiungi</b>, poi apri <b>Turni</b> dalla Home']);
      showArrow(true);
      btn.textContent = 'Ho capito';
      return;
    }
    if (mode === 'ios-other') {
      let copied = true;
      try { await navigator.clipboard.writeText(location.href.split('#')[0]); } catch { copied = false; }
      gateSteps([copied ? 'Link copiato ✓' : 'Copia il link dalla barra degli indirizzi', 'Apri <b>Safari</b> e incolla il link', 'Segui le istruzioni per installare l\'app']);
      btn.textContent = copied ? 'Copiato ✓' : 'Copia il link';
      return;
    }
    if (installEvt) {
      installEvt.prompt();
      try { await installEvt.userChoice; } catch { /* ignore */ }
      installEvt = null;
      return;
    }
    gateSteps(['Apri il <b>menu</b> del browser (⋮ in alto a destra)', 'Scegli <b>Installa app</b> oppure <b>Aggiungi a schermata Home</b>', 'Conferma, poi apri <b>Turni</b> dalla Home']);
  });
}
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); if (!isIOS) installEvt = e; });
window.addEventListener('appinstalled', () => { if (!isStandalone) gateInstalled(); });

// Benvenuto animato (prima apertura dell'app installata)
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function setStep(n) { $('#welcome').dataset.step = String(n); }
async function startWelcome() {
  setMode('');
  $('#gate').hidden = true;
  const w = $('#welcome');
  w.hidden = false;
  setStep(0);
  $('#welName').value = name || '';
  await wait(2000);
  setStep(1);
  setTimeout(() => { try { $('#welName').focus({ preventScroll: true }); } catch { /* ignore */ } }, 650);
}
$('#welForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const inp = $('#welName');
  const v = inp.value.trim().toUpperCase().replace(/\s+/g, ' ');
  if (!v) { inp.classList.remove('bad'); void inp.offsetWidth; inp.classList.add('bad'); return; }
  inp.blur();
  name = v;
  store.set(LS_NAME, name);
  store.set(LS_ONB, true);
  $('#welHi').textContent = name;
  setStep(2);
  await wait(2300);
  const w = $('#welcome');
  w.classList.add('out');
  await wait(550);
  w.hidden = true;
  w.classList.remove('out');
  enterMain(true);
});

// Schermata principale + guida per aggiungere i PDF
function enterMain(animate) {
  setMode('app');
  if (animate) { document.body.classList.add('enter'); setTimeout(() => document.body.classList.remove('enter'), 900); }
  $('#gate').hidden = true;
  render();
  if (!docs.length && !store.get(LS_GUIDE, false)) setTimeout(startGuide, animate ? 900 : 400);
}
function placeTip() {
  const drop = $('#drop'), tip = $('#coachTip');
  if (!drop || $('#coach').hidden) return;
  const r = drop.getBoundingClientRect();
  const h = tip.offsetHeight;
  let top = r.top - h - 22;
  if (top < 8) top = Math.min(r.bottom + 22, innerHeight - h - 8);
  tip.style.top = top + 'px';
}
function startGuide() {
  if (docs.length) return;
  document.body.classList.add('guiding');
  $('#coach').hidden = false;
  $('#drop').scrollIntoView({ block: 'center', behavior: 'smooth' });
  setTimeout(placeTip, 50);
  setTimeout(placeTip, 450);
}
function endGuide(done) {
  if (done) store.set(LS_GUIDE, true);
  document.body.classList.remove('guiding');
  $('#coach').hidden = true;
}
$('#coachSkip').addEventListener('click', () => endGuide(true));
window.addEventListener('resize', placeTip);
window.addEventListener('scroll', placeTip, { passive: true });

function boot() {
  const onboarded = store.get(LS_ONB, false) || !!store.get(LS_NAME, '') || docs.length > 0;
  if (!isStandalone) { showGate(); return; }
  if (!onboarded) { startWelcome(); return; }
  enterMain(false);
}

// App installabile + uso offline
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}

boot();
