/* Scene animate della postazione, mostrate nella scheda del turno in corso.
   Sono disegni vettoriali (niente immagini da scaricare): funzionano anche offline.
   Le animazioni sono in style.css (sezione "Scene animate"). */
(function (root) {
  'use strict';

  var FONT = 'font-family="-apple-system,Segoe UI,Roboto,sans-serif"';

  // Cielo comune: giorno (sole, nuvole) o notte (luna, stelle) a seconda della classe .night sul contenitore
  function sky(id, day, night, sunX) {
    sunX = sunX || 270;
    return '<defs>' +
      '<linearGradient id="' + id + 'd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + day[0] + '"/><stop offset="1" stop-color="' + day[1] + '"/></linearGradient>' +
      '<linearGradient id="' + id + 'n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + night[0] + '"/><stop offset="1" stop-color="' + night[1] + '"/></linearGradient>' +
      '</defs>' +
      '<rect class="sky-d" width="320" height="130" fill="url(#' + id + 'd)"/>' +
      '<rect class="sky-n" width="320" height="130" fill="url(#' + id + 'n)"/>' +
      '<g class="stars" fill="#fff"><circle cx="20" cy="14" r="1"/><circle cx="64" cy="30" r=".8"/><circle cx="110" cy="10" r="1.1"/><circle cx="150" cy="26" r=".7"/><circle cx="200" cy="12" r="1"/><circle cx="236" cy="34" r=".8"/><circle cx="300" cy="44" r="1"/><circle cx="90" cy="44" r=".6"/></g>' +
      '<g class="moon"><circle cx="' + sunX + '" cy="26" r="11" fill="#fff4cf"/><circle cx="' + (sunX - 4) + '" cy="23" r="2" fill="#e9dca8"/><circle cx="' + (sunX + 3) + '" cy="30" r="1.5" fill="#e9dca8"/></g>' +
      '<g class="sun" style="transform-origin:' + sunX + 'px 26px"><circle cx="' + sunX + '" cy="26" r="11" fill="#ffd34d"/><g stroke="#ffd34d" stroke-width="2" stroke-linecap="round"><path d="M' + sunX + ' 8v-4M' + sunX + ' 44v4M' + (sunX - 18) + ' 26h-4M' + (sunX + 18) + ' 26h4M' + (sunX - 13) + ' 13l-3-3M' + (sunX + 13) + ' 39l3 3M' + (sunX + 13) + ' 13l3-3M' + (sunX - 13) + ' 39l-3 3"/></g></g>';
  }

  /* ---------- Ronda con l'auto La Falco ---------- */
  var CAR = '<svg viewBox="0 0 320 130" role="img" aria-label="Auto di ronda La Falco in movimento">' +
    sky('sc-r', ['#8fd3ff', '#e6f5ff'], ['#0b1026', '#26244a']) +
    '<defs><linearGradient id="sc-rbm" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff6c8" stop-opacity=".75"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></linearGradient>' +
    '<linearGradient id="sc-rbody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#dcdde3"/></linearGradient></defs>' +
    '<g class="cloud" fill="#fff" opacity=".9"><ellipse cx="80" cy="24" rx="16" ry="6"/><ellipse cx="92" cy="20" rx="10" ry="6"/><ellipse cx="380" cy="34" rx="14" ry="5"/></g>' +
    '<g class="loop l-far"><g id="sc-far" fill="#3a3463" opacity=".9"><rect x="0" y="66" width="44" height="22"/><rect x="50" y="58" width="30" height="30"/><path d="M90 88V70l20-8 20 8v18z"/><rect x="140" y="62" width="50" height="26"/><circle cx="210" cy="74" r="12"/><rect x="208" y="74" width="4" height="14"/><rect x="230" y="60" width="36" height="28"/><circle cx="290" cy="72" r="14"/><rect x="288" y="72" width="4" height="16"/></g><use href="#sc-far" x="320"/></g>' +
    '<rect y="86" width="320" height="44" fill="#2b2b33"/><rect y="86" width="320" height="4" fill="#4a4a55"/>' +
    '<g class="loop l-mid"><g id="sc-mid"><g stroke="#55556a" stroke-width="1.5"><path d="M0 84h320"/><path d="M10 78v8M40 78v8M70 78v8M100 78v8M130 78v8M160 78v8M190 78v8M220 78v8M250 78v8M280 78v8M310 78v8"/></g>' +
    '<g><rect x="58" y="44" width="2.5" height="42" fill="#6b6b80"/><path d="M60 44h10" stroke="#6b6b80" stroke-width="2.5"/><circle class="glowlamp" cx="70" cy="47" r="10" fill="#ffe7a3" opacity=".35"/><circle cx="70" cy="46" r="2.5" fill="#ffe7a3"/></g>' +
    '<g><rect x="218" y="44" width="2.5" height="42" fill="#6b6b80"/><path d="M220 44h10" stroke="#6b6b80" stroke-width="2.5"/><circle class="glowlamp" cx="230" cy="47" r="10" fill="#ffe7a3" opacity=".35"/><circle cx="230" cy="46" r="2.5" fill="#ffe7a3"/></g></g><use href="#sc-mid" x="320"/></g>' +
    '<g class="loop l-road"><g id="sc-dash" fill="#e8e3c8"><rect x="0" y="113" width="22" height="3" rx="1.5"/><rect x="40" y="113" width="22" height="3" rx="1.5"/><rect x="80" y="113" width="22" height="3" rx="1.5"/><rect x="120" y="113" width="22" height="3" rx="1.5"/><rect x="160" y="113" width="22" height="3" rx="1.5"/><rect x="200" y="113" width="22" height="3" rx="1.5"/><rect x="240" y="113" width="22" height="3" rx="1.5"/><rect x="280" y="113" width="22" height="3" rx="1.5"/></g><use href="#sc-dash" x="320"/></g>' +
    '<g class="beam"><path class="flk" d="M214 98 L320 84 L320 116 Z" fill="url(#sc-rbm)"/></g>' +
    '<ellipse cx="160" cy="112" rx="58" ry="4" fill="#000" opacity=".35"/>' +
    '<g class="car">' +
    '<rect x="146" y="64" width="26" height="5" rx="2" fill="#333"/><rect class="bar-a" x="147" y="62" width="11" height="5" rx="2" fill="#ffae1a"/><rect class="bar-b" x="160" y="62" width="11" height="5" rx="2" fill="#ffae1a"/>' +
    '<path d="M106 100 C106 92 110 88 118 87 L134 85 L148 70 C150 68 153 67 156 67 L186 67 C190 67 193 69 196 72 L208 85 L216 87 C221 88 224 92 224 97 L224 104 L106 104 Z" fill="url(#sc-rbody)" stroke="#9a9aa6" stroke-width=".8"/>' +
    '<path d="M152 72 L140 85 L170 85 L170 72 Z" fill="#1d2440"/><path d="M174 72 L174 85 L203 85 L193 74 C191 72 189 72 187 72 Z" fill="#1d2440"/><path d="M153 73 L148 79" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>' +
    '<path d="M106 94 L224 94 L224 99 L106 99 Z" fill="#b23338"/><path d="M190 88 L224 88 L224 94 L178 94 Z" fill="#d2474d" opacity=".9"/>' +
    '<text x="128" y="92" ' + FONT + ' font-size="7.5" font-weight="900" fill="#b23338" letter-spacing=".4">LA FALCO</text>' +
    '<text x="128" y="103.4" ' + FONT + ' font-size="3.6" font-weight="800" fill="#fff" letter-spacing=".6">VIGILANZA · SICUREZZA</text>' +
    '<rect x="160" y="88" width="6" height="1.5" rx=".7" fill="#9a9aa6"/><rect x="190" y="88" width="6" height="1.5" rx=".7" fill="#9a9aa6"/><rect x="218" y="90" width="6" height="4" rx="1.5" fill="#fff6c8"/><rect x="106" y="90" width="4" height="4" rx="1.5" fill="#ff4d4d"/>' +
    '<g class="wheel"><circle cx="128" cy="104" r="9" fill="#111"/><circle cx="128" cy="104" r="4.5" fill="#bfc1c9"/><path d="M128 99.5v9M123.5 104h9" stroke="#6b6b77" stroke-width="1.4"/></g>' +
    '<g class="wheel"><circle cx="202" cy="104" r="9" fill="#111"/><circle cx="202" cy="104" r="4.5" fill="#bfc1c9"/><path d="M202 99.5v9M197.5 104h9" stroke="#6b6b77" stroke-width="1.4"/></g>' +
    '</g></svg>';

  /* ---------- Controllo ingressi (gabbiotto con sbarra) ---------- */
  var GATE = '<svg viewBox="0 0 320 130" role="img" aria-label="Operatore che registra gli ingressi e alza la sbarra">' +
    sky('sc-g', ['#ffd9a8', '#fff3e2'], ['#0b1026', '#26244a'], 262) +
    '<defs><linearGradient id="sc-gwin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9b0"/><stop offset="1" stop-color="#ffd27a"/></linearGradient></defs>' +
    '<g class="cloud" fill="#fff" opacity=".85"><ellipse cx="180" cy="22" rx="14" ry="5"/><ellipse cx="190" cy="19" rx="8" ry="5"/></g>' +
    '<rect y="96" width="320" height="34" fill="#2b2b33"/><rect y="94" width="320" height="3" fill="#4a4a55"/>' +
    '<g fill="#e8e3c8" opacity=".7"><rect x="10" y="114" width="18" height="2.5" rx="1"/><rect x="200" y="114" width="18" height="2.5" rx="1"/><rect x="250" y="114" width="18" height="2.5" rx="1"/><rect x="300" y="114" width="18" height="2.5" rx="1"/></g>' +
    '<rect x="300" y="46" width="2.5" height="50" fill="#6b6b80"/><circle class="glowlamp" cx="301" cy="47" r="12" fill="#ffe7a3" opacity=".3"/><circle cx="301" cy="46" r="3" fill="#ffe7a3"/>' +
    '<rect x="20" y="42" width="98" height="56" rx="4" fill="#ecebe8"/><rect x="14" y="34" width="110" height="10" rx="3" fill="#b23338"/><rect x="40" y="26" width="58" height="10" rx="2" fill="#121214"/>' +
    '<text x="69" y="33.4" text-anchor="middle" ' + FONT + ' font-size="6.2" font-weight="900" fill="#fff" letter-spacing="1">INGRESSI</text>' +
    '<rect x="30" y="50" width="78" height="32" rx="3" fill="url(#sc-gwin)"/>' +
    '<path d="M52 82 C52 70 58 66 66 66 C74 66 80 70 80 82 Z" fill="#1f2a4a"/><path d="M62 66 L66 72 L70 66 Z" fill="#fff"/>' +
    '<g class="head"><circle cx="66" cy="60" r="6.5" fill="#f1c7a2"/><path d="M58.5 56.5 h15 v2.6 h-15 z" fill="#1f2a4a"/><rect x="61" y="53" width="10" height="3.5" rx="1.5" fill="#1f2a4a"/><circle cx="68.5" cy="61" r=".9" fill="#222"/></g>' +
    '<rect x="26" y="80" width="86" height="5" rx="1.5" fill="#8a6d4f"/><path d="M74 80 L98 80 L101 76 L77 76 Z" fill="#fff" stroke="#d5d0c8" stroke-width=".6"/>' +
    '<g stroke="#3b4a8a" stroke-width=".9" stroke-linecap="round" fill="none"><path class="ink" d="M79 77.2 h18"/><path class="ink i2" d="M78.5 78.2 h17"/><path class="ink i3" d="M78 79.2 h16"/></g>' +
    '<g class="arm-w"><path d="M74 72 Q80 74 82 77" stroke="#1f2a4a" stroke-width="3.6" stroke-linecap="round" fill="none"/><circle cx="82.5" cy="77" r="1.8" fill="#f1c7a2"/><path d="M83 77 l3.5 -4" stroke="#b23338" stroke-width="1.1" stroke-linecap="round"/></g>' +
    '<rect x="128" y="76" width="9" height="20" rx="2" fill="#121214"/><circle class="lampbulb" cx="132.5" cy="80" r="2" fill="#4ade80"/>' +
    '<g class="barrier"><rect x="132" y="74" width="120" height="4.4" rx="2" fill="#fff"/><g fill="#b23338"><rect x="144" y="74" width="10" height="4.4"/><rect x="164" y="74" width="10" height="4.4"/><rect x="184" y="74" width="10" height="4.4"/><rect x="204" y="74" width="10" height="4.4"/><rect x="224" y="74" width="10" height="4.4"/><rect x="244" y="74" width="8" height="4.4" rx="2"/></g></g>' +
    '<g class="visitor"><g transform="translate(333 0) scale(-1 1)"><ellipse cx="166" cy="112" rx="26" ry="2.5" fill="#000" opacity=".35"/>' +
    '<path d="M136 108 C136 102 139 100 144 99 L150 98 L157 90 C158 89 160 88 162 88 L176 88 C178 88 180 89 181 90 L188 98 L192 99 C195 100 197 102 197 106 L197 110 L136 110 Z" fill="#3f6fd1"/>' +
    '<path d="M159 91 L153 98 L168 98 L168 91 Z M171 91 L171 98 L185 98 L180 92 C179 91 178 91 177 91 Z" fill="#1d2440"/><rect x="193" y="101" width="4" height="3" rx="1" fill="#fff6c8"/>' +
    '<g class="wheel"><circle cx="148" cy="110" r="5.5" fill="#111"/><circle cx="148" cy="110" r="2.5" fill="#bfc1c9"/></g><g class="wheel"><circle cx="185" cy="110" r="5.5" fill="#111"/><circle cx="185" cy="110" r="2.5" fill="#bfc1c9"/></g></g></g>' +
    '</svg>';

  /* ---------- Control room (sala telecamere) ---------- */
  // Un piccolo schermo di videosorveglianza: x, y, contenuto, numero camera
  function cam(x, y, inner, n, rec) {
    return '<g transform="translate(' + x + ' ' + y + ')"><rect width="62" height="30" rx="2.5" fill="#05080f" stroke="#3a4260" stroke-width="1.5"/>' +
      '<svg x="1.5" y="1.5" width="59" height="27" viewBox="0 0 59 27">' + inner +
      '<rect class="scanline" width="59" height="4" fill="#9fe8ff" opacity=".08"/>' +
      '<text x="3" y="6" ' + FONT + ' font-size="4" font-weight="800" fill="#9fe8ff" opacity=".85">CAM ' + n + '</text>' +
      (rec ? '<circle class="rec" cx="53" cy="4.5" r="1.8" fill="#ff3b3b"/>' : '') +
      '</svg></g>';
  }
  var CONTROL = '<svg viewBox="0 0 320 130" role="img" aria-label="Operatore in control room davanti agli schermi delle telecamere">' +
    '<defs>' +
    '<linearGradient id="sc-cw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c2236"/><stop offset="1" stop-color="#11151f"/></linearGradient>' +
    '<linearGradient id="sc-cd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd3ff"/><stop offset="1" stop-color="#e6f5ff"/></linearGradient>' +
    '<linearGradient id="sc-cn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1026"/><stop offset="1" stop-color="#26244a"/></linearGradient>' +
    '<radialGradient id="sc-cg" cx=".5" cy=".3" r=".7"><stop offset="0" stop-color="#5fb8ff" stop-opacity=".28"/><stop offset="1" stop-color="#5fb8ff" stop-opacity="0"/></radialGradient>' +
    '</defs>' +
    '<rect width="320" height="130" fill="url(#sc-cw)"/>' +
    // finestra: fuori è giorno o notte
    '<g><rect x="266" y="12" width="44" height="40" rx="3" fill="#2a3048"/>' +
    '<rect class="sky-d" x="269" y="15" width="38" height="34" rx="1.5" fill="url(#sc-cd)"/><rect class="sky-n" x="269" y="15" width="38" height="34" rx="1.5" fill="url(#sc-cn)"/>' +
    '<circle class="sun" style="animation:none" cx="296" cy="26" r="5" fill="#ffd34d"/><circle class="moon" cx="296" cy="26" r="5" fill="#fff4cf"/>' +
    '<g class="stars" fill="#fff"><circle cx="276" cy="21" r=".7"/><circle cx="284" cy="34" r=".6"/><circle cx="302" cy="40" r=".7"/></g>' +
    '<path d="M269 42 h38 v7 h-38z" fill="#3a3463" opacity=".8"/><path d="M288 15v34M269 32h38" stroke="#2a3048" stroke-width="2"/></g>' +
    // parete di monitor
    '<rect x="26" y="8" width="226" height="74" rx="5" fill="#0c1018" stroke="#2a3048" stroke-width="2"/>' +
    cam(32, 13, '<rect width="59" height="27" fill="#0e2a24"/><path d="M0 20h59" stroke="#1e5a4a" stroke-width="1"/><rect x="6" y="9" width="10" height="9" fill="#174a3d"/><rect x="40" y="7" width="14" height="11" fill="#174a3d"/>' +
      '<g class="cam-car"><rect x="0" y="16" width="12" height="5" rx="2" fill="#7fe0c2"/><circle cx="3" cy="21.5" r="1.4" fill="#0e2a24"/><circle cx="9" cy="21.5" r="1.4" fill="#0e2a24"/></g>', '01', true) +
    cam(98, 13, '<rect width="59" height="27" fill="#13213a"/><path d="M0 22h59" stroke="#2d4a7a"/><rect x="8" y="12" width="6" height="10" fill="#2d4a7a"/><rect class="cam-bar" x="13" y="12" width="30" height="2" fill="#9fc3ff"/>', '02') +
    cam(164, 13, '<rect width="59" height="27" fill="#1f1a33"/><path d="M0 21h59" stroke="#3e3666"/><g class="cam-man"><circle cx="0" cy="12" r="2.2" fill="#c9b8ff"/><rect x="-2" y="14" width="4" height="7" rx="1.5" fill="#c9b8ff"/></g>', '03') +
    cam(32, 48, '<rect width="59" height="27" fill="#14202a"/><path d="M8 27 L22 8 H37 L51 27" fill="#1d3240"/><rect class="cam-door" x="25" y="10" width="9" height="12" fill="#6fb6d8" opacity=".5"/>', '04') +
    cam(98, 48, '<rect width="59" height="27" fill="#101a12"/><g stroke="#2f5a36" stroke-width="1"><path d="M0 18h59M6 12v12M18 12v12M30 12v12M42 12v12M54 12v12"/></g><rect class="noise" width="59" height="27" fill="#fff" opacity=".05"/>', '05') +
    cam(164, 48, '<rect width="59" height="27" fill="#0d1428"/><path d="M0 20h59" stroke="#233a6a"/><g class="cam-lights"><circle cx="12" cy="18" r="1.6" fill="#fff6c8"/><circle cx="17" cy="18" r="1.6" fill="#fff6c8"/></g>', '06', true) +
    // bagliore degli schermi
    '<rect class="glow-scr" width="320" height="130" fill="url(#sc-cg)"/>' +
    // scrivania
    '<rect x="0" y="98" width="320" height="32" fill="#232838"/><rect x="0" y="96" width="320" height="4" fill="#353b52"/>' +
    '<rect x="196" y="84" width="34" height="13" rx="1.5" fill="#0c1018" stroke="#3a4260"/><path class="mini" d="M199 93 l5 -4 l5 3 l6 -5 l6 2 l6 -3" stroke="#4ade80" stroke-width="1" fill="none"/>' +
    '<rect x="210" y="97" width="6" height="2" fill="#3a4260"/>' +
    // tazza con vapore
    '<g><rect x="244" y="88" width="9" height="9" rx="1.5" fill="#b23338"/><path d="M253 90.5 q3 0 3 2.5 q0 2.5 -3 2.5" stroke="#b23338" stroke-width="1.4" fill="none"/>' +
    '<path class="steam" d="M247 85 q-2 -3 0 -6 q2 -3 0 -6" stroke="#cfd6ea" stroke-width="1" fill="none" opacity=".6"/><path class="steam s2" d="M251 85 q-2 -3 0 -6 q2 -3 0 -6" stroke="#cfd6ea" stroke-width="1" fill="none" opacity=".6"/></g>' +
    // operatore di spalle con cuffie
    '<g><rect x="104" y="100" width="44" height="30" rx="6" fill="#151821"/>' +
    '<path d="M100 130 C100 104 110 94 126 94 C142 94 152 104 152 130 Z" fill="#1f2a4a"/>' +
    '<path d="M100 112 h52 v4 h-52z" fill="#b23338" opacity=".9"/>' +
    '<g class="watch"><circle cx="126" cy="84" r="10" fill="#2a2a2a"/><path d="M116 80 C116 70 136 70 136 80" stroke="#0c0c10" stroke-width="2.5" fill="none"/><rect x="113.5" y="79" width="4" height="8" rx="2" fill="#0c0c10"/><rect x="134.5" y="79" width="4" height="8" rx="2" fill="#0c0c10"/>' +
    '<path d="M117 86 q-4 6 2 9" stroke="#0c0c10" stroke-width="1.2" fill="none"/></g>' +
    '<g class="mouse-hand"><path d="M150 108 Q162 104 168 99" stroke="#1f2a4a" stroke-width="6" stroke-linecap="round" fill="none"/><ellipse cx="170" cy="98" rx="4" ry="2.6" fill="#d8dbe6"/></g>' +
    '<rect x="64" y="96" width="34" height="3" rx="1" fill="#3a4260"/></g>' +
    '</svg>';

  /* ---------- Parco ---------- */
  var PARK = '<svg viewBox="0 0 320 130" role="img" aria-label="Operatore che sorveglia il parco a piedi">' +
    sky('sc-p', ['#a9e0ff', '#eaf8ee'], ['#0b1026', '#1f3340']) +
    '<defs><linearGradient id="sc-pfl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff6c8" stop-opacity=".7"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></linearGradient></defs>' +
    '<g class="cloud" fill="#fff" opacity=".9"><ellipse cx="120" cy="22" rx="16" ry="6"/><ellipse cx="132" cy="18" rx="9" ry="6"/></g>' +
    '<path d="M0 92 Q80 80 160 90 T320 88 V130 H0 Z" fill="#2f5d3a"/><path d="M0 104 Q90 96 170 104 T320 102 V130 H0 Z" fill="#3c7449"/>' +
    '<path d="M0 116 C100 108 220 122 320 112 V122 C220 132 100 118 0 126 Z" fill="#c9b38a" opacity=".9"/>' +
    '<g class="tree"><rect x="38" y="66" width="5" height="30" fill="#5b3b23"/><circle cx="40" cy="58" r="17" fill="#2e7a43"/><circle cx="30" cy="66" r="11" fill="#368a4d"/><circle cx="51" cy="64" r="12" fill="#28703c"/></g>' +
    '<g class="tree t2"><rect x="150" y="60" width="5" height="34" fill="#5b3b23"/><circle cx="152" cy="50" r="20" fill="#28703c"/><circle cx="140" cy="60" r="12" fill="#368a4d"/><circle cx="165" cy="58" r="13" fill="#2e7a43"/></g>' +
    '<g class="tree t3"><rect x="258" y="68" width="5" height="26" fill="#5b3b23"/><circle cx="260" cy="60" r="15" fill="#2e7a43"/><circle cx="270" cy="66" r="10" fill="#368a4d"/></g>' +
    '<g fill="#7a5a3a"><rect x="200" y="98" width="28" height="3" rx="1"/><rect x="200" y="93" width="28" height="2.5" rx="1"/><rect x="203" y="101" width="2" height="6"/><rect x="223" y="101" width="2" height="6"/></g>' +
    '<rect x="100" y="64" width="2.5" height="40" fill="#4b4b5a"/><circle class="glowlamp" cx="101" cy="64" r="12" fill="#ffe7a3" opacity=".35"/><circle cx="101" cy="63" r="3" fill="#ffe7a3"/>' +
    '<g class="leaf" fill="#e0a43a"><path d="M170 52 q4 -3 6 0 q-3 3 -6 0z"/></g><g class="leaf f2" fill="#c96a2a"><path d="M60 50 q4 -3 6 0 q-3 3 -6 0z"/></g><g class="leaf f3" fill="#e0a43a"><path d="M270 56 q4 -3 6 0 q-3 3 -6 0z"/></g>' +
    '<g class="walker"><g class="beam"><path class="flk" d="M20 96 L80 86 L80 112 Z" fill="url(#sc-pfl)"/></g><ellipse cx="10" cy="120" rx="9" ry="2" fill="#000" opacity=".3"/>' +
    '<g class="legA"><rect x="7" y="104" width="3.5" height="15" rx="1.5" fill="#121214"/></g><g class="legB"><rect x="11" y="104" width="3.5" height="15" rx="1.5" fill="#1d1d24"/></g>' +
    '<path d="M4 106 C4 96 6 90 11 90 C16 90 18 96 18 106 Z" fill="#1f2a4a"/><path d="M4 98 h14 v3 h-14z" fill="#b23338"/>' +
    '<path d="M15 95 L21 97" stroke="#1f2a4a" stroke-width="3" stroke-linecap="round"/><rect x="19.5" y="95" width="4" height="2.4" rx="1" fill="#555"/>' +
    '<circle cx="11" cy="84" r="5" fill="#f1c7a2"/><path d="M5.5 83 h11 v-2 c0 -4 -11 -4 -11 0z" fill="#1f2a4a"/></g>' +
    '</svg>';

  var SCENES = {
    car: { svg: CAR, label: 'In ronda con l\'auto', short: 'in auto' },
    gate: { svg: GATE, label: 'Controllo ingressi', short: 'al controllo ingressi' },
    control: { svg: CONTROL, label: 'Control room · sala telecamere', short: 'in control room' },
    park: { svg: PARK, label: 'Sorveglianza del parco', short: 'al parco' },
  };

  root.TurniScenes = SCENES;
})(typeof self !== 'undefined' ? self : this);
