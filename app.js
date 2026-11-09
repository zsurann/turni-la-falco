import './polyfill.js';
import * as pdfjsLib from './pdf.min.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('./pdf.worker.min.mjs', import.meta.url).href;

const P = window.TurniParser;
const LS_DOCS = 'turni.docs.v2';
const LS_NAME = 'turni.name.v1';
const LS_OV = 'turni.overrides.v1';
const LS_ONB = 'turni.onboarded.v1';
const LS_REVEAL = 'turni.reveal.v1'; // schermata "Bentornato" del nuovo design già vista
const LS_GUIDE = 'turni.guide.v1';

const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
const GIORNI = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const PENCIL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"/></svg>';
const PEOPLE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM21 20v-1a4 4 0 0 0-3-3.9M15.5 4.2a3.5 3.5 0 0 1 0 6.6"/></svg>';
const MOON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';

const $ = (s) => document.querySelector(s);
const store = {
 get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
 // false se la memoria del telefono è piena: chi chiama può avvisare
 set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
};

let docs = store.get(LS_DOCS, []);
let name = store.get(LS_NAME, '');
let overrides = store.get(LS_OV, {});
let view = 'next';
let wiz = null;
let lastRender = 0;

function el(tag, cls, text) {
 const e = document.createElement(tag);
 if (cls) e.className = cls;
 if (text !== undefined) e.textContent = text;
 return e;
}
function dateOf(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); }
const fmtLong = (d) => GIORNI[d.getDay()] + ' ' + d.getDate() + ' ' + MESI[d.getMonth()];
const fmtH = (h) => (Number.isInteger(h) ? h : h.toFixed(1).replace('.', ',')) + ' ore';

function classifyText(raw) {
 const t = String(raw || '').toUpperCase().replace(/[_.]+/g, ' ');
 const r = {};
 if (/\bCAMPO\s+SUD\s+ROM\b/.test(t)) return { campo: 'Sud', ruolo: 'Sud Rom' };
 if (/\bCAFASSO\b/.test(t)) return { campo: 'Cafasso', ruolo: 'Parco Cafasso' };
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
 if (c.ruolo === 'Sud Rom' || c.ruolo === 'Parco Cafasso') return c.ruolo;
 if (!c.ruolo) return '';
 if (c.ruolo === 'Ronda' && c.campo === 'Nord' && c.lato) return 'Ronda Lato ' + c.lato;
 return c.ruolo + (c.campo ? ' ' + c.campo : '');
}
const roleOf = (s) => labelOf(infoOf(s.zone, s.src));

function decorate(s) {
 const day = dateOf(s.date);
 const [sh, sm] = s.start.split(':').map(Number);
 const [eh, em] = s.end.split(':').map(Number);
 const startAt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), sh, sm);
 const endAt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), eh, em);
 if (endAt <= startAt) endAt.setDate(endAt.getDate() + 1);
 const nextMidnight = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
 let type;
 if (/extra/i.test(s.label || '') || /^\s*EXTRA\b/i.test(s.zone || '')) type = { k: 'x', label: 'Extra' };
 else if (endAt > nextMidnight) type = { k: 'n', label: 'Notte' };
 else if (startAt.getHours() < 12) type = { k: 'm', label: 'Mattina' };
 else type = { k: 'p', label: 'Pomeriggio' };
 const out = { ...s, day, startAt, endAt, hours: (endAt - startAt) / 36e5, type, night: endAt > nextMidnight, role: roleOf(s) };
 if (out.night && !s.rest) {
 const info = infoOf(s.zone, s.src);
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
function build(base, orig) {
 const ov = overrides[base.key];
 if (!ov) return decorate(base);
 const m = { ...base, ...ov, orig, mod: true };
 m.rest = !!ov.rest;
 m.mates = (m.mates || []).filter((x) => !P.nameMatches(x, name));
 return decorate(m);
}
function allShifts() {
 const out = [], have = new Set();
 const mine = new Set();
 docs.forEach((d) => P.findShifts(d, name).forEach((s) => {
 mine.add(d);
 have.add(s.date);
 const base = { ...s, src: d.id };
 base.key = [name, s.date, d.id, s.start].join('|');
 out.push(build(base, { start: s.start, end: s.end, role: roleOf(base) }));
 }));
 if (out.length) {
 // Fin dove i turni sono stabiliti, mese per mese: contano solo i PDF in cui compari tu
 // (un altro posto di lavoro, pianificato più avanti, non deve far diventare "Riposo" i giorni ancora da stabilire).
 const dates = new Set(), horizon = {}, horizonAll = {};
 const lastOf = (d) => d.rows.reduce((m, r) => (r.cells.some((c) => c) && r.date > m ? r.date : m), '');
 docs.forEach((d) => {
 d.rows.forEach((r) => dates.add(r.date));
 const last = lastOf(d);
 if (!last) return;
 const ms = new Set(d.rows.map((r) => r.date.slice(0, 7)));
 ms.forEach((mo) => {
 const l = last.slice(0, 7) === mo ? last : (last > mo ? mo + '-31' : '');
 if (!l) return;
 if (l > (horizonAll[mo] || '')) horizonAll[mo] = l;
 if (mine.has(d)) horizon[mo] = horizon[mo] && horizon[mo] < l ? horizon[mo] : l;
 });
 });
 const lastFor = (date) => { const mo = date.slice(0, 7); return horizon[mo] || horizonAll[mo] || ''; };
 const todayIso = iso(startOfToday());
 const pend = {};
 [...dates].sort().forEach((date) => {
 if (have.has(date)) return;
 const key = [name, date, 'riposo'].join('|');
 const future = date > lastFor(date) && date >= todayIso;
 if (future && !overrides[key]) { (pend[date.slice(0, 7)] = pend[date.slice(0, 7)] || []).push(date); return; }
 const base = { date, start: '00:00', end: '00:00', zone: '', src: '', label: '', note: '', extended: false, mates: [], rest: true, auto: true, key };
 out.push(build(base, { rest: true }));
 });
 Object.values(pend).forEach((ds) => {
 const day = dateOf(ds[0]), last = dateOf(ds[ds.length - 1]);
 out.push({ pending: true, rest: true, date: ds[0], lastDate: ds[ds.length - 1], key: 'pending|' + ds[0], day, startAt: day, endAt: new Date(last.getFullYear(), last.getMonth(), last.getDate(), 23, 59, 59), hours: 0, mates: [], type: { k: 'r', label: 'Riposo' }, night: false, role: '', start: '00:00', end: '00:00' });
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

function render() {
 lastRender = Date.now();
 $('#whoName').textContent = name;
 $('#whoAv').textContent = initials(name);
 const hr = new Date().getHours();
 $('#hello').textContent = (hr < 5 ? 'Buonanotte' : hr < 13 ? 'Buongiorno' : hr < 18 ? 'Buon pomeriggio' : 'Buonasera') + (name ? ', ' + name : '');
 $('#nameInput').value = name;
 $('#remBtnTxt').textContent = pushOn ? 'Notifiche attive' : 'Avvisi turni';

 const now = new Date();
 const shifts = allShifts();
 const upcoming = shifts.filter((s) => s.endAt >= now && !s.rest);

 renderHero(upcoming[0], now);
 renderStats(shifts);
 renderList(shifts, now);
 renderDocs();
 schedulePush();

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

// Iniziali per l'avatar: "GENNARO C." -> "GC"
function initials(n) {
 const w = String(n || '').replace(/[^A-Za-zÀ-ÿ\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
 return w.length ? (w[0][0] + (w.length > 1 ? w[w.length - 1][0] : (w[0][1] || ''))).toUpperCase() : '';
}
const pad2 = (n) => String(n).padStart(2, '0');
let heroShift = null, heroTimer = 0;
// Conto alla rovescia del prossimo turno (o barra di avanzamento se è in corso), aggiornato ogni secondo
function heroTick() {
 const s = heroShift, h = $('#hero');
 if (!s || h.hidden || !h.isConnected) return;
 const now = Date.now(), live = s.startAt <= now;
 const left = Math.max(0, (live ? s.endAt : s.startAt) - now);
 const lab = $('#cdLab');
 if (lab) lab.textContent = live ? 'Finisce tra' : 'Inizia tra';
 const d = Math.floor(left / 864e5), hh = Math.floor(left % 864e5 / 36e5), mm = Math.floor(left % 36e5 / 6e4), ss = Math.floor(left % 6e4 / 1e3);
 const set = (id, v, l) => { const b = $('#' + id); if (b) { b.firstChild.textContent = v; b.lastChild.textContent = l; } };
 if (d > 0) { set('cd1', d, d === 1 ? 'giorno' : 'giorni'); set('cd2', pad2(hh), 'ore'); set('cd3', pad2(mm), 'min'); }
 else { set('cd1', pad2(hh), 'ore'); set('cd2', pad2(mm), 'min'); set('cd3', pad2(ss), 'sec'); }
 const bar = $('#heroProg');
 if (bar) { bar.hidden = !live; if (live) bar.firstChild.style.width = Math.min(100, (now - s.startAt) / (s.endAt - s.startAt) * 100).toFixed(1) + '%'; }
 if (left === 0) { clearInterval(heroTimer); heroTimer = 0; setTimeout(render, 1000); }
}
function renderHero(s, now) {
 const h = $('#hero');
 heroShift = s || null;
 if (!s) { h.hidden = true; clearInterval(heroTimer); heroTimer = 0; return; }
 h.hidden = false;
 const meta = el('div', 'meta');
 meta.append(el('span', 'chip ' + s.type.k, s.type.label));
 if (s.mod) meta.append(el('span', 'chip mod', 'Modificato'));
 if (s.extended) meta.append(el('span', 'chip ext', 'Prolungato'));
 meta.append(el('span', '', fmtH(s.hours)));
 if (s.note) meta.append(el('span', '', s.note));
 if (s.role) meta.append(el('span', 'role', s.role));
 const live = s.startAt <= now;
 const eb = el('div', 'eyebrow');
 eb.append(el('i', 'live' + (live ? ' on' : '')), document.createTextNode(live ? 'Turno in corso' : 'Prossimo turno'));
 const cdw = el('div', 'cdw');
 const cd = el('div', 'cd');
 ['cd1', 'cd2', 'cd3'].forEach((id) => { const b = el('div'); b.id = id; b.append(el('b', '', '00'), el('span', '', '')); cd.append(b); });
 cdw.append(el('div', 'cd-lab', ''), cd);
 cdw.firstChild.id = 'cdLab';
 const prog = el('div', 'hprog');
 prog.id = 'heroProg';
 prog.append(el('i'));
 const time = el('div', 'time');
 time.append(el('b', '', s.start + ' – ' + s.end));
 h.replaceChildren(
 el('i', 'blob'), el('i', 'blob b'), el('i', 'shine'),
 eb,
 el('div', 'when', relLabel(s, now)),
 el('div', 'date', fmtLong(s.day)),
 time, prog, cdw,
 meta
 );
 heroTick();
 if (!heroTimer) heroTimer = setInterval(heroTick, 1000);
}

const monthKey = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
const fmtNum = (h) => { const r = Math.round(h * 10) / 10; return Number.isInteger(r) ? String(r) : r.toFixed(1).replace('.', ','); };
let statsKey = null, statsSig = '';
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// Numero che conta da 0 al valore
function countUp(node, to, fmt) {
 if (reduceMotion() || !to) { node.textContent = fmt(to); return; }
 const t0 = performance.now() + 150, dur = 1000;
 const f = (t) => {
 const k = Math.max(0, Math.min(1, (t - t0) / dur)), e = 1 - Math.pow(1 - k, 4);
 node.textContent = k < 1 ? fmt(Math.round(to * e)) : fmt(to);
 if (k < 1 && node.isConnected) requestAnimationFrame(f);
 };
 requestAnimationFrame(f);
}
let statsKeys = [];
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
 // barretta: quanto del mese è già stato fatto
 const now = new Date(), done = mine.filter((s) => s.endAt <= now);
 const doneH = done.reduce((a, s) => a + s.hours, 0), doneN = done.filter((s) => s.night).length;
 const pct = (a, b) => (b ? Math.round(a / b * 100) : 0);
 const sig = statsKey + '|' + mine.length + '|' + hours + '|' + nights;
 const animate = sig !== statsSig;
 statsSig = sig;
 const mk = (v, l, p, fmt, tip) => {
 const d = el('div', 'stat'), b = el('b', '', fmt(animate ? 0 : v)), bar = el('div', 'sbar'), i = el('i');
 d.title = tip;
 bar.append(i);
 d.append(b, el('span', '', l), bar);
 if (animate) { countUp(b, v, fmt); setTimeout(() => { i.style.width = p + '%'; }, 120); } else i.style.width = p + '%';
 return d;
 };
 const int = (v) => String(Math.round(v));
 $('#statsGrid').replaceChildren(
 mk(mine.length, 'Turni', pct(done.length, mine.length), int, done.length + ' di ' + mine.length + ' già fatti'),
 mk(hours, 'Ore', pct(doneH, hours), fmtNum, fmtNum(doneH) + ' di ' + fmtNum(hours) + ' ore già fatte'),
 mk(nights, 'Notti', pct(doneN, nights), int, doneN + ' di ' + nights + ' notti già fatte'));
 updatePay(hours, y, m);
}

const RATE = 6;
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
 const ended = new Date(y, m, 1) <= startOfToday();
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
 // turno in corso (es. la notte iniziata ieri): finché non finisce resta lui "quello di oggi"
 const cur = src.find((s) => !s.pending && !s.rest && s.startAt <= now && s.endAt >= now);
 const carry = !!cur && cur.day.getTime() !== today;
 src.forEach((s, idx) => {
 const mk = s.day.getFullYear() + '-' + s.day.getMonth();
 if (mk !== curMonth) {
 curMonth = mk;
 list.append(el('div', 'month', MESI[s.day.getMonth()] + ' ' + s.day.getFullYear()));
 }
 if (s.pending) {
 const d2 = dateOf(s.lastDate), one = s.lastDate === s.date;
 const pc = el('div', 'shift pending');
 const pb = el('div', 'dbox');
 pb.append(el('b', '', String(s.day.getDate())), el('span', '', MESI[s.day.getMonth()].slice(0, 3)));
 const pbody = el('div');
 const pm = el('div', 's-main');
 pm.append(el('span', 's-day', 'Turni ancora da stabilire'));
 const ps = el('div', 's-sub');
 ps.append(el('span', 'chip wait', 'In attesa'));
 ps.append(el('span', '', one ? 'Il ' + s.day.getDate() + ' ' + MESI[s.day.getMonth()].toLowerCase() : 'Dal ' + s.day.getDate() + ' al ' + d2.getDate() + ' ' + MESI[d2.getMonth()].toLowerCase()));
 ps.append(el('span', 'note', 'Si aggiorneranno quando aggiungi i nuovi PDF'));
 pbody.append(pm, ps);
 pc.append(pb, pbody);
 list.append(pc);
 return;
 }
 const isToday = carry ? s === cur : s.day.getTime() === today;
 const card = el('div', 'shift' + (isToday ? ' today' : '') + (s.endAt < now ? ' past' : '') + (s.rest ? ' rest' : ' k-' + s.type.k));
 card.style.animationDelay = (Math.min(idx, 10) * 0.04) + 's';

 const dbox = el('div', 'dbox');
 dbox.append(el('b', '', String(s.day.getDate())), el('span', '', MESI[s.day.getMonth()].slice(0, 3)));

 const body = el('div');
 const main = el('div', 's-main');
 const dayEl = el('span', 's-day', GIORNI[s.day.getDay()] + (isToday ? (s.day.getTime() === today ? ' · oggi' : ' · in corso') : ''));
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

 const mb = el('button', 'mbtn');
 mb.type = 'button';
 mb.innerHTML = PEOPLE + 'Colleghi';
 if (!s.rest) mb.addEventListener('click', () => openSheet(s, mb, 'mates'));
 const edit = el('button', 'edit');
 edit.type = 'button';
 edit.innerHTML = PENCIL + 'Modifica';
 edit.addEventListener('click', () => openSheet(s, edit));
 if (!s.rest) sub.append(mb);
 sub.append(edit);
 if (!s.rest) { card.classList.add('tap'); card.addEventListener('click', (e) => { if (!e.target.closest('button')) openSheet(s, card, 'mates'); }); }

 body.append(main, sub);
 card.append(dbox, body);
 if (!s.rest && s.startAt <= now && s.endAt >= now) {
 // turno in corso: barra di avanzamento
 const pr = el('div', 'prog'), pi = el('i');
 pr.append(pi);
 card.append(pr);
 const p = Math.min(100, (now - s.startAt) / (s.endAt - s.startAt) * 100);
 requestAnimationFrame(() => setTimeout(() => { pi.style.width = p.toFixed(1) + '%'; }, 250));
 }
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
 if (d.warn) nm.append(el('em', 'warn', '⚠ ' + d.warn));
 li.append(nm, btn);
 ul.append(li);
 });
}

let toastTimer;
function toast(msg) {
 const t = $('#toast');
 t.textContent = msg;
 t.hidden = false;
 clearTimeout(toastTimer);
 toastTimer = setTimeout(() => { t.hidden = true; }, 2400);
}

function openSheet(shift, opener, mode) {
 wiz = { shift, step: 1, campo: '', ruolo: '', opener, mode: mode || 'edit' };
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

// Opzioni di modifica disponibili in base ai PDF caricati
const CAMPI_ORDER = ['Sud', 'Nord', 'Cafasso'];
const RUOLI_ORDER = ['Ronda', 'Gabbiotto', 'Sud Rom'];
function availableCampi() {
 const found = new Set(docs.map((d) => infoOf(d.title, d.id)).filter((c) => c.ruolo).map((c) => c.campo));
 return CAMPI_ORDER.filter((c) => found.has(c));
}
function availableRoles(campo) {
 const found = new Set(docs.map((d) => infoOf(d.title, d.id)).filter((c) => c.campo === campo).map((c) => c.ruolo));
 return RUOLI_ORDER.filter((r) => found.has(r));
}

function commit(entry, msg) {
 if (entry) overrides[wiz.shift.key] = entry; else delete overrides[wiz.shift.key];
 store.set(LS_OV, overrides);
 closeSheet();
 render();
 toast(msg);
}

function renderSheet() {
 if (wiz.mode === 'mates') return renderMates();
 if (wiz.mode === 'remind') return renderRemind();
 $('#shTitle').textContent = 'Modifica turno';
 const s = wiz.shift;
 const body = $('#shBody');
 const cur = s.rest ? 'Riposo' : s.start + ' – ' + s.end + (s.role ? ' · ' + s.role : '');
 $('#shSub').textContent = fmtLong(s.day) + ' · ' + cur;
 $('#shSteps').replaceChildren(...[1, 2, 3].map((n) => el('i', n <= wiz.step ? 'on' : '')));
 body.replaceChildren();

 if (wiz.step === 1) {
 body.append(el('p', 'q', 'Campo o riposo?'));
 availableCampi().forEach((c) => {
 if (c === 'Cafasso') body.append(opt('Parco Cafasso', '', () => { wiz.campo = 'Cafasso'; wiz.ruolo = 'Parco Cafasso'; wiz.step = 3; renderSheet(); }, 'big'));
 else body.append(opt('Campo ' + c, '', () => { wiz.campo = c; wiz.step = 2; renderSheet(); }, 'big'));
 });
 if (!docs.length) body.append(el('p', 'none', 'Non hai ancora caricato nessun PDF: carica i tuoi turni per poter scegliere il campo.'));
 if (!(s.auto && !s.mod)) {
 const rest = opt('Riposo', 'Imposta questo giorno come libero', () => commit(s.auto ? null : { rest: true }, 'Riposo impostato'), 'big rest');
 rest.insertAdjacentHTML('afterbegin', MOON);
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
 const roles = availableRoles(wiz.campo);
 roles.forEach((r) => body.append(opt(r, '', () => { wiz.ruolo = r; wiz.step = 3; renderSheet(); }, 'big')));
 return;
 }

 const place = wiz.campo === 'Cafasso' ? 'Parco Cafasso' : 'Campo ' + wiz.campo + ' · ' + wiz.ruolo;
 body.append(backBtn(wiz.campo === 'Cafasso' ? 1 : 2), el('p', 'q', 'Con chi hai fatto il cambio? · ' + place));
 const matched = docsFor(wiz.campo, wiz.ruolo);
 if (!matched.length) {
 body.append(el('p', 'none', 'Non hai caricato il PDF di ' + place + '. Caricalo e riprova.'));
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

function renderMates() {
 const s = wiz.shift, body = $('#shBody');
 $('#shTitle').textContent = 'Chi lavora con te';
 $('#shSub').textContent = fmtLong(s.day) + ' · ' + s.start + ' – ' + s.end + (s.role ? ' · ' + s.role : '');
 $('#shSteps').replaceChildren();
 body.replaceChildren();
 const campo = infoOf(s.zone, s.src).campo;
 const prev = new Date(s.day.getFullYear(), s.day.getMonth(), s.day.getDate() - 1);
 const together = [], others = [], seen = new Set();
 docs.forEach((d) => {
 const c = infoOf(d.title, d.id);
 if (!campo || c.campo !== campo) return;
 [[iso(prev), true], [s.date, false]].forEach(([date, isPrev]) => {
 P.dayOperators(d, date).forEach((o) => {
 if (P.nameMatches(o.name, name)) return;
 const t = decorate({ ...o, date, src: d.id, zone: d.title });
 const ov = t.startAt < s.endAt && t.endAt > s.startAt;
 if (isPrev && !ov) return;
 const k = o.name + '|' + labelOf(c) + '|' + date + '|' + o.start;
 if (seen.has(k)) return;
 seen.add(k);
 (ov ? together : others).push({ name: o.name, role: labelOf(c), time: o.start + ' – ' + o.end, at: t.startAt });
 });
 });
 });
 const add = (title, arr) => {
 if (!arr.length) return;
 arr.sort((x, y) => x.at - y.at || x.name.localeCompare(y.name));
 body.append(el('p', 'grp', title));
 arr.forEach((m) => {
 const row = el('div', 'mate');
 row.style.setProperty('--i', String(Math.min(body.querySelectorAll('.mate').length, 10)));
 const l = el('span', 'opt-l');
 l.append(el('b', '', m.name), el('span', '', m.role));
 const av = el('span', 'av sm ' + (/ronda/i.test(m.role) ? 'c2' : /rom|cafasso/i.test(m.role) ? 'c3' : 'c1'), initials(m.name));
 av.setAttribute('aria-hidden', 'true');
 row.append(av, l, el('span', 'opt-r', m.time));
 body.append(row);
 });
 };
 add('Con te', together);
 add('Altri turni del giorno', others);
 if (!together.length && !others.length) {
 body.append(el('p', 'none', campo ? 'Nei PDF caricati non trovo altri operatori in questo giorno.' : 'Non so a quale campo appartiene questo turno.'));
 }
}

const PUSH_URL = String(window.TURNI_PUSH || '').replace(/\/$/, '');
const pushOK = !!PUSH_URL && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const LS_PUSH = 'turni.push.v1', LS_PUSHSIG = 'turni.push.sig';
let pushOn = store.get(LS_PUSH, false), pushTimer = 0, pushBusy = false;
const keyBytes = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
async function pushPost(path, body) {
 const r = await fetch(PUSH_URL + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
 if (!r.ok) throw new Error('push ' + r.status);
 return r.json();
}
function pushNotifs() {
 const out = [], now = Date.now();
 remindShifts().forEach((s) => {
 const body = s.start + ' – ' + s.end + (s.role ? ' · ' + s.role : '');
 if (rem.eve) {
 const at = new Date(s.day.getFullYear(), s.day.getMonth(), s.day.getDate() - 1, 20, 0).getTime();
 if (at < s.startAt && at > now - 36e5) out.push({ id: s.date + '|' + s.start + '|eve', at, title: 'Domani hai turno', body });
 }
 if (rem.hour) {
 const at = s.startAt.getTime() - 36e5;
 if (at > now - 36e5) out.push({ id: s.date + '|' + s.start + '|hour', at, title: 'Il turno inizia tra un\'ora', body });
 }
 });
 return out.sort((a, b) => a.at - b.at).slice(0, 300);
}
async function pushSub() { const reg = await navigator.serviceWorker.ready; return reg.pushManager.getSubscription(); }
async function syncPush(force) {
 if (!pushOK || !pushOn || pushBusy) return;
 pushBusy = true;
 try {
 const sub = await pushSub();
 if (!sub) { pushOn = false; store.set(LS_PUSH, false); return; }
 const notifs = pushNotifs();
 const sig = JSON.stringify(notifs);
 if (!force && sig === store.get(LS_PUSHSIG, '')) return;
 await pushPost('/api/sync', { sub: sub.toJSON(), notifs });
 store.set(LS_PUSHSIG, sig);
 } catch { /* offline */ }
 finally { pushBusy = false; }
}
function schedulePush() { if (pushOK && pushOn) { clearTimeout(pushTimer); pushTimer = setTimeout(() => syncPush(false), 1500); } }
async function enablePush() {
 if (Notification.permission === 'denied') { toast('Notifiche bloccate: attivale dalle impostazioni del telefono'); return false; }
 const perm = await Notification.requestPermission();
 if (perm !== 'granted') { toast('Notifiche non consentite'); return false; }
 const { key } = await (await fetch(PUSH_URL + '/api/key')).json();
 const reg = await navigator.serviceWorker.ready;
 const old = await reg.pushManager.getSubscription();
 if (old) await old.unsubscribe();
 const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) });
 pushOn = true; store.set(LS_PUSH, true);
 await pushPost('/api/sync', { sub: sub.toJSON(), notifs: pushNotifs() });
 store.set(LS_PUSHSIG, JSON.stringify(pushNotifs()));
 return true;
}
async function disablePush() {
 try { const sub = await pushSub(); if (sub) { await pushPost('/api/unsub', { endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe(); } } catch { /* ignore */ }
 pushOn = false; store.set(LS_PUSH, false);
}

const LS_REM = 'turni.remind.v1';
let rem = { eve: true, hour: true, ...store.get(LS_REM, {}) };
const icsEsc = (t) => String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
function icsFold(line) {
 const enc = new TextEncoder(), dec = new TextDecoder();
 const b = enc.encode(line);
 if (b.length <= 74) return line;
 const parts = [];
 let i = 0;
 while (i < b.length) {
 let n = Math.min(i === 0 ? 74 : 73, b.length - i);
 while (n > 0 && i + n < b.length && (b[i + n] & 0xc0) === 0x80) n--;
 parts.push(dec.decode(b.slice(i, i + n)));
 i += n;
 }
 return parts.join('\r\n ');
}
const icsDate = (d) => d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + 'T' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0') + '00';
function remindShifts() { const now = new Date(); return allShifts().filter((s) => !s.rest && s.endAt >= now); }
function buildIcs(list, o) {
 const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
 const perDay = {};
 const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//La Falco//Turni//IT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Turni La Falco'];
 list.forEach((s) => {
 const desc = [s.role, s.note, s.mates && s.mates.length ? 'Cambio: ' + s.mates.join(', ') : 'Cambio da definire'].filter(Boolean).join(' - ');
 L.push('BEGIN:VEVENT', 'UID:turno-' + s.date + ((perDay[s.date] = (perDay[s.date] || 0) + 1) > 1 ? '-' + s.start.replace(':', '') : '') + '@turni-lafalco', 'DTSTAMP:' + stamp,
 'DTSTART:' + icsDate(s.startAt), 'DTEND:' + icsDate(s.endAt),
 'SUMMARY:' + icsEsc('Turno ' + s.start + '-' + s.end + (s.role ? ' · ' + s.role : '')),
 'DESCRIPTION:' + icsEsc(desc), 'TRANSP:OPAQUE');
 if (o.hour) L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Turno tra un\'ora', 'TRIGGER:-PT1H', 'END:VALARM');
 if (o.eve) {
 const eve = new Date(s.day.getFullYear(), s.day.getMonth(), s.day.getDate() - 1, 20, 0);
 const mins = Math.round((s.startAt - eve) / 6e4);
 if (mins > 0) L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Domani hai turno', 'TRIGGER:-PT' + mins + 'M', 'END:VALARM');
 }
 L.push('END:VEVENT');
 });
 L.push('END:VCALENDAR');
 return L.map(icsFold).join('\r\n') + '\r\n';
}
async function deliverIcs(text) {
 const file = new File([text], 'turni-la-falco.ics', { type: 'text/calendar' });
 if (navigator.canShare && navigator.canShare({ files: [file] })) {
 try { await navigator.share({ files: [file], title: 'Turni La Falco' }); return 'shared'; }
 catch (e) { if (e && e.name === 'AbortError') return 'abort'; }
 }
 const url = URL.createObjectURL(file);
 const a = el('a');
 a.href = url; a.download = 'turni-la-falco.ics';
 document.body.append(a); a.click(); a.remove();
 setTimeout(() => URL.revokeObjectURL(url), 4000);
 return 'download';
}
function renderRemind() {
 const body = $('#shBody');
 $('#shTitle').textContent = 'Promemoria turni';
 $('#shSub').textContent = 'Un avviso sul telefono prima di ogni turno';
 $('#shSteps').replaceChildren();
 body.replaceChildren();
 const list = remindShifts();
 body.append(el('p', 'q', 'Quando vuoi essere avvisato?'));
 [['eve', 'La sera prima', 'Alle 20:00 del giorno prima'], ['hour', 'Un\'ora prima', 'Un\'ora prima dell\'inizio del turno']].forEach(([k, t, sub]) => {
 const b = opt(t, sub, () => { rem[k] = !rem[k]; store.set(LS_REM, rem); schedulePush(); renderRemind(); }, 'tg' + (rem[k] ? ' on' : ''), rem[k] ? '✓' : '');
 b.setAttribute('role', 'switch');
 b.setAttribute('aria-checked', String(!!rem[k]));
 body.append(b);
 });
 if (!pushOK) body.append(el('p', 'none', list.length ? 'Verranno aggiunti ' + list.length + (list.length === 1 ? ' turno' : ' turni') + ' da oggi in poi.' : 'Non ci sono turni in programma.'));
 if (pushOK) {
 body.append(el('p', 'q', 'Notifiche push'));
 if (pushOn) {
 const st = el('div', 'mate');
 const l = el('span', 'opt-l');
 l.append(el('b', '', 'Notifiche attive ✓'), el('span', '', 'Ti avviso anche con l\'app chiusa'));
 st.append(l);
 const test = el('button', 'ghost', 'Invia notifica di prova');
 test.type = 'button';
 test.addEventListener('click', async () => {
 try { const sub = await pushSub(); const r = await pushPost('/api/test', { endpoint: sub.endpoint }); toast(r.ok ? 'Notifica inviata' : 'Non sono riuscito a inviarla'); }
 catch { toast('Server notifiche non raggiungibile'); }
 });
 const off = el('button', 'ghost', 'Disattiva le notifiche');
 off.type = 'button';
 off.addEventListener('click', async () => { await disablePush(); renderRemind(); toast('Notifiche disattivate'); });
 body.append(st, test, off);
 } else {
 const on = el('button', 'big', 'Attiva le notifiche');
 on.type = 'button';
 on.disabled = !rem.eve && !rem.hour;
 on.addEventListener('click', async () => {
 on.disabled = true; on.textContent = 'Attivazione…';
 try { if (await enablePush()) toast('Notifiche attivate'); }
 catch { toast('Non sono riuscito ad attivarle'); }
 renderRemind();
 });
 body.append(on);
 }
 body.append(el('p', 'fine', 'Per inviare gli avvisi, giorni, orari e ruolo dei tuoi turni vengono salvati sul server delle notifiche. Se disattivi, vengono cancellati.'));
 }
 if (pushOK) return;
 body.append(el('p', 'q', 'Calendario'));
 const go = el('button', 'big', 'Aggiungi al calendario');
 go.type = 'button';
 go.disabled = !list.length || (!rem.eve && !rem.hour);
 go.addEventListener('click', async () => {
 const r = await deliverIcs(buildIcs(list, rem));
 if (r === 'abort') return;
 closeSheet();
 toast(r === 'shared' ? 'Scegli "Calendario" per aggiungerli' : 'File calendario pronto: aprilo per aggiungerli');
 });
 body.append(go, el('p', 'fine', 'Funziona con il calendario del telefono, su iPhone e Android, anche con l\'app chiusa. Se carichi nuovi PDF o cambi un turno, ripeti: i giorni già inseriti vengono aggiornati.'));
}
$('#remBtn').addEventListener('click', (e) => openSheet(null, e.currentTarget, 'remind'));

const fail = (code, msg) => Object.assign(new Error(msg || code), { code });
const readBytes = (file) => new Promise((res, rej) => {
 const r = new FileReader();
 r.onload = () => res(r.result);
 r.onerror = () => rej(r.error || new Error('FileReader'));
 r.readAsArrayBuffer(file);
});
const ICLOUD = 'Il file è su iCloud e non è stato ancora scaricato completamente sul telefono. Aprilo prima nell\'app File per scaricarlo.';
async function readPdf(file) {
 if (file.size === 0) throw fail('icloud', ICLOUD);
 let buf;
 try { buf = await readBytes(file).catch(() => file.arrayBuffer()); }
 catch { throw fail('icloud', 'Il telefono non mi ha dato il contenuto del file. Aprilo una volta nell\'app File e riprova.'); }
 const data = new Uint8Array(buf);
 if (!data.length) throw fail('icloud', ICLOUD);
 let head = '';
 for (let i = 0; i < Math.min(data.length, 1024); i++) head += String.fromCharCode(data[i]);
 if (!head.includes('%PDF-')) throw Object.assign(fail('open'), { detail: 'copia incompleta sul telefono: manca l\'intestazione %PDF' });
 const detail = (e) => String((e && (e.name + ': ' + e.message)) || e).slice(0, 110);
 const opts = () => ({ data: data.slice(), isEvalSupported: false, disableFontFace: true });
 let pdf;
 try { pdf = await pdfjsLib.getDocument(opts()).promise; }
 catch (e) {
 if (e && e.name === 'PasswordException') throw fail('locked');
 try { pdf = await pdfjsLib.getDocument(opts()).promise; }
 catch (e2) { throw Object.assign(fail('open'), { detail: detail(e2) }); }
 }
 const pages = [];
 let items = 0, pageNo = 0;
 try {
 for (let p = 1; p <= pdf.numPages; p++) {
 pageNo = p;
 const page = await pdf.getPage(p);
 const vp = page.getViewport({ scale: 1 });
 const tc = await page.getTextContent();
 const its = tc.items.filter((i) => 'str' in i && i.str.trim());
 items += its.length;
 pages.push(its.map((i) => ({ str: i.str, x: i.transform[4], y: vp.height - i.transform[5], w: i.width })));
 page.cleanup();
 }
 } catch (e) {
 throw Object.assign(fail('open'), { detail: 'pagina ' + pageNo + ': ' + String((e && e.message) || e).slice(0, 80) });
 } finally { try { pdf.destroy(); } catch { /* ignore */ } }
 if (!items) throw fail('scan');
 let doc;
 try { doc = P.parseDocument(pages); } catch { throw fail('format'); }
 doc.warn = checkDoc(doc);
 return doc;
}

function checkDoc(doc) {
 const days = [...new Set(doc.rows.map((r) => r.date))].sort();
 const warns = [];
 if (days.length < doc.rows.length) warns.push('alcuni giorni compaiono due volte');
 let missing = 0;
 for (let i = 1; i < days.length; i++) {
 const gap = Math.round((dateOf(days[i]) - dateOf(days[i - 1])) / 864e5) - 1;
 if (gap > 0) missing += gap;
 }
 if (missing) warns.push((missing === 1 ? 'manca 1 giorno' : 'mancano ' + missing + ' giorni') + ' nella tabella');
 if (!doc.rows.some((r) => r.cells.some((c) => c))) warns.push('la tabella sembra vuota (turni non ancora scritti?)');
 return warns.length ? 'Controlla: ' + warns.join(', ') : '';
}
const FAIL_TXT = {
 scan: 'sembra una scansione o una foto: non contiene testo. Serve il PDF originale.',
 format: 'formato non riconosciuto: non trovo la tabella con i giorni e gli orari.',
 locked: 'è protetto da password.',
 open: 'non riesco ad aprirlo (file danneggiato?).',
 icloud: 'il file è su iCloud e non è stato scaricato. Aprilo prima nell\'app File.',
};

function setMsg(text, cls) {
 const m = $('#msg');
 m.textContent = text;
 m.className = 'msg ' + (cls || '');
}

async function handleFiles(files) {
 const list = [...files].filter((f) => /\.pdf$/i.test(f.name) || f.type === 'application/pdf');
 if (!list.length) { setMsg('Seleziona un file PDF.', 'err'); return; }
 setMsg('Lettura in corso…', '');
 const problems = [], warns = [];
 let added = 0, found = 0;
 for (const f of list) {
 try {
 const doc = await readPdf(f);
 doc.id = f.name;
 docs = docs.filter((d) => d.id !== doc.id).concat(doc);
 added++;
 found += P.findShifts(doc, name).length;
 if (doc.warn) warns.push('"' + f.name + '": ' + doc.warn.replace('Controlla: ', ''));
 } catch (e) {
 const errReason = e && e.code === 'icloud' ? e.message : (FAIL_TXT[e && e.code] || FAIL_TXT.open);
 problems.push('"' + f.name + '" non aggiunto: ' + errReason + (e && e.code === 'open' && e.detail ? ' [' + e.detail + ']' : ''));
 }
 }
 const saved = store.set(LS_DOCS, docs);
 render();
 if (added) endGuide(true);
 const lines = [...problems];
 if (!saved) lines.push('Memoria del telefono piena: i PDF sono visibili ora ma potrebbero sparire alla chiusura. Rimuovi i PDF vecchi che non ti servono più.');
 if (added && !found) lines.push('PDF letto, ma non ho trovato "' + name + '". Controlla come è scritto il tuo nome qui sotto.');
 warns.forEach((w) => lines.push('Attenzione, ' + w + '.'));
 if (lines.length) setMsg(lines.join('\n'), 'err');
 else setMsg('Aggiunti ' + found + (found === 1 ? ' turno' : ' turni') + '.', 'ok');
}

$('#file').addEventListener('change', (e) => { handleFiles(e.target.files); e.target.value = ''; });
const drop = $('#drop');
['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files));
// da tastiera: Invio o Spazio aprono la scelta del file
drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#file').click(); } });
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => e.preventDefault());

$('#nameForm').addEventListener('submit', (e) => {
 e.preventDefault();
 const v = $('#nameInput').value.trim().toUpperCase().replace(/\s+/g, ' ');
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
 $('#seg').classList.toggle('all', v === 'all');
 $('#tabNext').setAttribute('aria-selected', String(v === 'next'));
 $('#tabAll').setAttribute('aria-selected', String(v === 'all'));
 render();
}
$('#tabNext').addEventListener('click', () => setView('next'));
$('#tabAll').addEventListener('click', () => setView('all'));

$('#statsPrev').addEventListener('click', () => stepMonth(-1));
$('#statsNext').addEventListener('click', () => stepMonth(1));
$('#shClose').addEventListener('click', closeSheet);
$('#shBg').addEventListener('click', closeSheet);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

const UA = navigator.userAgent;
const isStandalone = ['standalone', 'fullscreen', 'minimal-ui'].some((m) => matchMedia('(display-mode: ' + m + ')').matches) || navigator.standalone === true;
const isIOS = /iPhone|iPad|iPod/i.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isSafariIOS = isIOS && /Safari\//.test(UA) && !/CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|GSA\/|DuckDuckGo|YaBrowser|Brave|FBAN|FBAV|Instagram|Line\//i.test(UA);
const SHARE = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 3v12M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';
const setMode = (m) => {
 [...document.body.classList].filter((c) => c.startsWith('mode-')).forEach((c) => document.body.classList.remove(c));
 if (m) document.body.classList.add('mode-' + m);
};

let installEvt = null;
let arrowEl = null;
function gateSteps(items) {
 const box = $('#gateSteps');
 box.replaceChildren();
 items.forEach((parts, n) => {
 const row = el('div', 'gs');
 row.style.setProperty('--d', (n * 0.12) + 's');
 const num = el('i', '', String(n + 1));
 const t = el('span');
 parts.forEach((p) => {
 if (typeof p === 'string') t.append(document.createTextNode(p));
 else if (p.b) t.append(el('b', '', p.b));
 else if (p.svg) t.insertAdjacentHTML('beforeend', p.svg);
 });
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
 gateSteps([
 ['Tocca ', { b: 'Condividi' }, ' ', { svg: SHARE }, ' nella barra di Safari'],
 ['Scorri e scegli ', { b: 'Aggiungi alla schermata Home' }],
 ['Tocca ', { b: 'Aggiungi' }, ', poi apri ', { b: 'Turni' }, ' dalla Home'],
 ]);
 showArrow(true);
 btn.textContent = 'Ho capito';
 return;
 }
 if (mode === 'ios-other') {
 let copied = true;
 try { await navigator.clipboard.writeText(location.href.split('#')[0]); } catch { copied = false; }
 gateSteps([
 [copied ? 'Link copiato ✓' : 'Copia il link dalla barra degli indirizzi'],
 ['Apri ', { b: 'Safari' }, ' e incolla il link'],
 ['Segui le istruzioni per installare l\'app'],
 ]);
 btn.textContent = copied ? 'Copiato ✓' : 'Copia il link';
 return;
 }
 if (installEvt) {
 installEvt.prompt();
 try { await installEvt.userChoice; } catch { /* ignore */ }
 installEvt = null;
 return;
 }
 gateSteps([
 ['Apri il ', { b: 'menu' }, ' del browser (⋮ in alto a destra)'],
 ['Scegli ', { b: 'Installa app' }, ' oppure ', { b: 'Aggiungi a schermata Home' }],
 ['Conferma, poi apri ', { b: 'Turni' }, ' dalla Home'],
 ]);
 });
}
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); if (!isIOS) installEvt = e; });
window.addEventListener('appinstalled', () => { if (!isStandalone) gateInstalled(); });

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
 store.set(LS_REVEAL, true); // chi si registra ora vede già il nuovo design
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

// Controllo aggiornamenti leggero: scarica solo sw.js e index.html (che non sono cachati su Cloudflare Pages)
async function siteSig() {
 let h = 2166136261;
 for (const f of ['sw.js', 'index.html']) {
 const r = await fetch(f, { cache: 'no-store' });
 if (!r.ok) throw new Error('x');
 const t = await r.text();
 for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
 }
 return h >>> 0;
}
let sigBase = null, sigBusy = false;
async function checkUpdate() {
 if (sigBusy || !navigator.onLine || document.hidden) return;
 sigBusy = true;
 try {
 const s = await siteSig();
 if (sigBase === null) sigBase = s;
 else if (s !== sigBase) $('#update').hidden = false;
 } catch { /* offline */ }
 sigBusy = false;
}
$('#updBtn').addEventListener('click', async () => {
 try { const keys = await caches.keys(); await Promise.all(keys.map((k) => caches.delete(k))); } catch { /* ignore */ }
 try { const regs = await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map((r) => r.update())); } catch { /* ignore */ }
 location.reload();
});
document.addEventListener('visibilitychange', checkUpdate);
// Riaprendo l'app (magari il giorno dopo) "oggi", "prossimo turno" e i turni passati vanno ricalcolati
document.addEventListener('visibilitychange', () => {
 if (!document.hidden && document.body.classList.contains('mode-app') && !wiz && Date.now() - lastRender > 60000) render();
});
window.addEventListener('online', checkUpdate);
setInterval(checkUpdate, 3 * 60 * 1000);
setTimeout(checkUpdate, 2500);

/* ---------- Bentornato: presentazione del nuovo design a chi aveva già l'app ----------
 Nome e PDF salvati restano quelli di prima: il collega ritrova subito i suoi turni. */
const GIFT_MSG = 'Gennaro ci tiene molto ai suoi colleghi, questo è un regalo per voi, spero vi piaccia!';
let typeTimer = 0;
function revealStep(step) { $('#reveal').dataset.step = step; }
function startReveal() {
 setMode('');
 $('#gate').hidden = true;
 $('#welcome').hidden = true;
 const r = $('#reveal');
 r.hidden = false;
 if (name) { $('#rvName').textContent = name; revealStep('ask'); }
 else { revealStep('who'); setTimeout(() => { try { $('#rvInput').focus({ preventScroll: true }); } catch { /* ignore */ } }, 650); }
}
// Il messaggio compare parola per parola, poi il pulsante OK!
function showGift() {
 revealStep('gift');
 const box = $('#rvGift'), ok = $('#rvOk');
 ok.classList.remove('show');
 box.textContent = '';
 clearInterval(typeTimer);
 const words = GIFT_MSG.split(' ');
 if (reduceMotion()) { box.textContent = GIFT_MSG; ok.classList.add('show'); return; }
 let i = 0;
 setTimeout(() => {
 typeTimer = setInterval(() => {
 const w = el('span', 'w', (i ? ' ' : '') + words[i]);
 box.append(w);
 if (++i >= words.length) { clearInterval(typeTimer); setTimeout(() => ok.classList.add('show'), 350); }
 }, 110);
 }, 700);
}
$('#rvYes').addEventListener('click', showGift);
$('#rvNo').addEventListener('click', () => {
 revealStep('who');
 $('#rvInput').value = '';
 setTimeout(() => { try { $('#rvInput').focus({ preventScroll: true }); } catch { /* ignore */ } }, 650);
});
$('#rvForm').addEventListener('submit', (e) => {
 e.preventDefault();
 const inp = $('#rvInput');
 const v = inp.value.trim().toUpperCase().replace(/\s+/g, ' ');
 if (!v) { inp.classList.remove('bad'); void inp.offsetWidth; inp.classList.add('bad'); return; }
 inp.blur();
 name = v;
 store.set(LS_NAME, name);
 showGift();
});
// OK!: un cerchio rosso parte dal pulsante e riempie lo schermo, poi si apre sul nuovo design con i coriandoli
$('#rvOk').addEventListener('click', async (e) => {
 store.set(LS_REVEAL, true);
 store.set(LS_ONB, true);
 const b = $('#burst'), r = e.currentTarget.getBoundingClientRect();
 b.style.setProperty('--x', Math.round(r.left + r.width / 2) + 'px');
 b.style.setProperty('--y', Math.round(r.top + r.height / 2) + 'px');
 b.hidden = false;
 b.className = 'burst grow';
 await wait(reduceMotion() ? 50 : 1000);
 $('#reveal').hidden = true;
 enterMain(true);
 window.scrollTo(0, 0);
 b.className = 'burst grow open';
 confetti();
 await wait(reduceMotion() ? 50 : 900);
 b.hidden = true;
 b.className = 'burst';
});
function confetti() {
 if (reduceMotion()) return;
 const box = el('div', 'confetti');
 box.setAttribute('aria-hidden', 'true');
 const colors = ['#b23338', '#d2474d', '#ffb3b6', '#121214', '#fbbf24', '#4ade80', '#ffffff'];
 for (let i = 0; i < 70; i++) {
 const c = el('i');
 c.style.setProperty('--l', (Math.random() * 100).toFixed(1) + '%');
 c.style.setProperty('--c', colors[i % colors.length]);
 c.style.setProperty('--d', (Math.random() * 0.6).toFixed(2) + 's');
 c.style.setProperty('--t', (1.8 + Math.random() * 1.4).toFixed(2) + 's');
 c.style.setProperty('--r', Math.round(Math.random() * 720 - 360) + 'deg');
 c.style.setProperty('--dx', Math.round(Math.random() * 120 - 60) + 'px');
 box.append(c);
 }
 document.body.append(box);
 setTimeout(() => box.remove(), 3800);
}

function boot() {
 const onboarded = store.get(LS_ONB, false) || !!store.get(LS_NAME, '') || docs.length > 0;
 if (!isStandalone) { showGate(); return; }
 if (!onboarded) { startWelcome(); return; }
 if (!store.get(LS_REVEAL, false)) { startReveal(); return; }
 enterMain(false);
}

if ('serviceWorker' in navigator) {
 window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}

boot();