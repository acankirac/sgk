// Ortak arayüz: mod (adım adım / hızlı giriş), yazı boyutu, kaynak tablolar,
// yazdırma özeti, sesli okuma ve hızlı giriş formları. Sihirbaz js/wizard.js
// içindedir ve buradaki SGK_UI yardımcılarını kullanır.
(function () {
  'use strict';

  var RULES = window.SGK_RULES;
  var ENGINE = window.SGK_ENGINE;
  var EXCEL = window.SGK_EXCEL;
  var TEXTS = window.SGK_TEXTS;
  var TABS = ['esAnneBaba', 'anneBaba', 'dulEs'];
  var TITLES = TEXTS.TITLES;
  var PLAIN = TEXTS.PLAIN;
  var SHORT = TEXTS.SHORT;

  var inArtifact = !!window.SGK_IN_ARTIFACT || !!window.claude || /claude/i.test(location.hostname) ||
    (window.top !== window && /claude/i.test(document.referrer || ''));
  var canPrint = !inArtifact && typeof window.print === 'function';

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') { node.className = attrs[k]; }
      else if (k === 'text') { node.textContent = attrs[k]; }
      else if (k === 'onclick') { node.addEventListener('click', attrs[k]); }
      else if (attrs[k] != null && attrs[k] !== false) { node.setAttribute(k, attrs[k]); }
    });
    (children || []).forEach(function (c) {
      if (c != null) { node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); }
    });
    return node;
  }

  function store(key, value) {
    try {
      if (value === undefined) { return window.localStorage.getItem(key); }
      window.localStorage.setItem(key, value);
    } catch (e) { return null; }
    return value;
  }

  function excelRow(key, rowNo) {
    var rows = EXCEL[key].rows;
    for (var i = 0; i < rows.length; i++) { if (rows[i].row === rowNo) { return rows[i]; } }
    return null;
  }

  function sheetName(key) { return EXCEL[key].sheet.replace(/\s+-/g, '-'); }

  /* ---------- Yazı boyutu ---------- */

  function setSize(n) {
    n = Math.max(1, Math.min(3, n));
    document.documentElement.setAttribute('data-size', String(n));
    store('sgk-size', String(n));
    $('#font-minus').disabled = n === 1;
    $('#font-plus').disabled = n === 3;
  }

  function initSize() {
    var saved = parseInt(store('sgk-size'), 10);
    setSize(saved >= 1 && saved <= 3 ? saved : 1);
    $('#font-minus').addEventListener('click', function () { setSize(parseInt(document.documentElement.getAttribute('data-size'), 10) - 1); });
    $('#font-plus').addEventListener('click', function () { setSize(parseInt(document.documentElement.getAttribute('data-size'), 10) + 1); });
  }

  /* ---------- Mod ---------- */

  var currentTab = TABS[0];

  function setMode(mode) {
    var expert = mode === 'expert';
    document.body.setAttribute('data-mode', expert ? 'expert' : 'wizard');
    $('#expert').hidden = !expert;
    $('#wizard').hidden = expert;
    $('#modes').hidden = !expert;
    var toggle = $('#mode-toggle');
    toggle.textContent = expert ? 'Adım adım' : 'Hızlı giriş';
    toggle.setAttribute('aria-pressed', expert ? 'true' : 'false');
    store('sgk-mode', expert ? 'expert' : 'wizard');
    try { history.replaceState(null, '', expert ? hashFor(currentTab) : location.pathname + location.search); } catch (e) { /* yok say */ }
    if (expert) { showSource(currentTab); runAll(); }
    else if (window.SGK_WIZARD) { window.SGK_WIZARD.render(); }
  }

  function initMode() {
    $('#mode-toggle').addEventListener('click', function () {
      setMode(document.body.getAttribute('data-mode') === 'expert' ? 'wizard' : 'expert');
    });
  }

  /* ---------- Sekmeler (hızlı giriş) ---------- */

  function setTab(key) {
    currentTab = key;
    $all('[role="tab"]').forEach(function (tab) {
      var on = tab.getAttribute('data-tab') === key;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;
    });
    TABS.forEach(function (k) { $('#panel-' + k).hidden = k !== key; });
    showSource(key);
    syncHash(key);
  }

  function initTabs() {
    var tabs = $all('[role="tab"]');
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { setTab(tab.getAttribute('data-tab')); });
      tab.addEventListener('keydown', function (ev) {
        var dir = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0;
        if (!dir) { return; }
        ev.preventDefault();
        var next = tabs[(i + dir + tabs.length) % tabs.length];
        next.focus();
        setTab(next.getAttribute('data-tab'));
      });
    });
    setTab(parseHash().key || TABS[0]);
  }

  /* ---------- Kaynak tablolar ---------- */

  function buildTable(key) {
    var sheet = EXCEL[key];
    var head = el('tr', null, [el('th', { class: 'rownum', scope: 'col', text: '#' })]);
    sheet.header.forEach(function (h) { head.appendChild(el('th', { scope: 'col', text: h })); });
    var body = el('tbody');
    sheet.rows.forEach(function (r) {
      var isNote = !r.cells[1];
      var tr = el('tr', { id: key + '-row-' + r.row, 'data-row': r.row, class: isNote ? 'note' : '' }, [
        el('td', { class: 'rownum', text: String(r.row) })
      ]);
      if (isNote) {
        tr.appendChild(el('td', { colspan: sheet.header.length, text: r.cells[0] }));
      } else {
        sheet.header.forEach(function (_, i) {
          tr.appendChild(el('td', { class: i === sheet.header.length - 1 ? 'last' : '', text: r.cells[i] || '' }));
        });
      }
      body.appendChild(tr);
    });
    var details = $('#table-' + key);
    details.querySelector('.scroll').appendChild(el('table', { class: 'sheet' }, [el('thead', null, [head]), body]));

    // Liste / çapraz görünüm seçimi
    var filterBox = details.querySelector('.filter');
    var listBtn = el('button', { type: 'button', 'aria-pressed': 'true', text: 'Liste' });
    var gridBtn = el('button', { type: 'button', 'aria-pressed': 'false', text: 'Çapraz tablo' });
    var bar = el('div', { class: 'viewbar' }, [el('div', { class: 'seg' }, [listBtn, gridBtn])]);
    details.insertBefore(bar, filterBox);
    filterBox.classList.add('inline');
    bar.appendChild(filterBox);
    var matrixBox = el('div', { class: 'matrix', hidden: true });
    details.appendChild(matrixBox);
    var built = false;
    function setView(grid) {
      listBtn.setAttribute('aria-pressed', grid ? 'false' : 'true');
      gridBtn.setAttribute('aria-pressed', grid ? 'true' : 'false');
      details.querySelector('.scroll').hidden = grid;
      filterBox.hidden = grid;
      matrixBox.hidden = !grid;
      if (grid && !built) { buildMatrix(key, matrixBox); built = true; }
    }
    listBtn.addEventListener('click', function () { setView(false); });
    gridBtn.addEventListener('click', function () { setView(true); });

    $('#filter-' + key).addEventListener('input', function (ev) {
      var q = ev.target.value.trim().toLocaleLowerCase('tr');
      $all('#table-' + key + ' tr[data-row]').forEach(function (tr) {
        tr.hidden = !!q && tr.textContent.toLocaleLowerCase('tr').indexOf(q) === -1;
      });
    });
  }

  // Çapraz tablo: satır = ilk kişi, sütun = ikinci kişi; hücre = tablonun verdiği sonuç
  function cellSummary(key, x, y, tarih) {
    var table = RULES[key];
    function one(extra) {
      var input = key === 'esAnneBaba' ? { es: x, ab: y, once: extra } :
                  key === 'anneBaba' ? { baba: x, anne: y, tarih: tarih, donem: extra } : { ilk: x, ikinci: y };
      return key === 'esAnneBaba' ? ENGINE.evalEsAnneBaba(input) : key === 'anneBaba' ? ENGINE.evalAnneBaba(input) : ENGINE.evalDulEs(input);
    }
    var variants = key === 'esAnneBaba' ? [['Evet', 'evet'], ['Hayır', 'hayir']] :
                   key === 'anneBaba' ? [['5.12.2017 öncesi', 'once2017'], ['5.12.2017 sonrası', 'sonra2017']] : [['', null]];
    var results = variants.map(function (v) { return { label: v[0], res: one(v[1]) }; });
    var okOnes = results.filter(function (r) { return r.res.status === 'ok'; });
    var rows = [];
    results.forEach(function (r) { (r.res.rows || []).forEach(function (rule) { if (rows.indexOf(rule.row) === -1) { rows.push(rule.row); } }); });
    if (!okOnes.length) { return { text: '—', cls: 'g-none', rows: rows }; }
    var keys = okOnes.map(function (r) { return r.res.sonuc.key; });
    var same = keys.every(function (k) { return k === keys[0]; });
    if (same && okOnes.length === results.length) {
      return { text: SHORT[key][keys[0]] || table.sonuc[keys[0]].title, cls: 'g-' + table.sonuc[keys[0]].tone, rows: rows };
    }
    return {
      text: results.map(function (r) { return r.label + ': ' + (r.res.status === 'ok' ? (SHORT[key][r.res.sonuc.key] || r.res.sonuc.title) : '—'); }).join(' · '),
      cls: 'g-mixed', rows: rows
    };
  }

  function buildMatrix(key, box) {
    box.innerHTML = '';
    var statuses = RULES[key].status;
    var tarih = key === 'anneBaba' ? 'sonra' : null;
    var gridHost = el('div');
    function draw() {
      gridHost.innerHTML = '';
      var head = el('tr', null, [el('th', { class: 'corner', text: key === 'dulEs' ? 'İlk eş ↓ · İkinci eş →' : key === 'anneBaba' ? 'Baba ↓ · Anne →' : 'Ölen eş ↓ · Anne/baba →' })]);
      statuses.forEach(function (s) { head.appendChild(el('th', { text: s.label + (s.tarih ? ' · ' + s.tarih.replace('ölüm ', '') : '') })); });
      var body = el('tbody');
      statuses.forEach(function (rs) {
        var tr = el('tr', null, [el('th', { class: 'rowh', text: rs.label + (rs.tarih ? ' · ' + rs.tarih.replace('ölüm ', '') : '') })]);
        statuses.forEach(function (cs) {
          var c = cellSummary(key, rs.code, cs.code, tarih);
          var td = el('td', { class: c.cls });
          if (c.rows.length) {
            td.appendChild(el('button', { type: 'button', text: c.text, title: 'Satır ' + c.rows.join(', '), onclick: function () {
              highlightRows(key, c.rows);
              var det = $('#table-' + key);
              det.querySelector('.viewbar .seg button').click();
              showRow(key, c.rows[0]);
            } }));
          } else { td.textContent = c.text; }
          tr.appendChild(td);
        });
        body.appendChild(tr);
      });
      gridHost.appendChild(el('table', { class: 'grid' }, [el('thead', null, [head]), body]));
    }
    if (key === 'anneBaba') {
      var bar = el('div', { class: 'mtarih' }, [el('span', { text: 'Ölüm tarihleri:' })]);
      RULES.anneBaba.tarih.forEach(function (t) {
        var id = 'mtarih-' + t.code;
        var radio = el('input', { type: 'radio', name: 'mtarih', id: id, value: t.code });
        if (t.code === tarih) { radio.checked = true; }
        radio.addEventListener('change', function () { tarih = t.code; draw(); });
        bar.appendChild(el('label', { 'for': id }, [radio, ' ' + t.label]));
      });
      box.appendChild(bar);
    }
    box.appendChild(gridHost);
    draw();
  }

  function showSource(key) {
    TABS.forEach(function (k) { $('#table-' + k).hidden = k !== key; });
  }

  function highlightRows(key, rowNos) {
    $all('#table-' + key + ' tr[data-row]').forEach(function (tr) {
      tr.classList.toggle('hit', rowNos.indexOf(Number(tr.getAttribute('data-row'))) !== -1);
    });
  }

  function showRow(key, rowNo) {
    var details = $('#table-' + key);
    details.hidden = false;
    details.open = true;
    var tr = $('#' + key + '-row-' + rowNo);
    if (tr) { tr.hidden = false; tr.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  }

  function rowLinks(key, rows) {
    var parts = [];
    rows.forEach(function (rule, i) {
      if (i > 0) { parts.push(i === rows.length - 1 ? ' ve ' : ', '); }
      parts.push(el('button', { type: 'button', class: 'link', text: 'satır ' + rule.row, onclick: function () { showRow(key, rule.row); } }));
    });
    return parts;
  }

  // Eşleşen satır(lar)ı başlık–değer kartı olarak gösteren açılır blok
  function rowCard(key, rows) {
    var sheet = EXCEL[key];
    var expert = document.body.getAttribute('data-mode') === 'expert';
    var det = el('details', { class: 'rowcard' }, [el('summary', { text: rows.length > 1 ? 'Tablodaki satırları göster' : 'Tablodaki satırı göster' })]);
    if (expert) {
      det.open = store('sgk-basis') !== 'kapali';
      det.addEventListener('toggle', function () { store('sgk-basis', det.open ? 'acik' : 'kapali'); });
    }
    rows.forEach(function (rule) {
      var r = excelRow(key, rule.row);
      if (!r) { return; }
      var dl = el('dl', { class: 'rowdl' });
      if (rows.length > 1) { dl.appendChild(el('div', { class: 'rowhead', text: 'Satır ' + rule.row })); }
      sheet.header.forEach(function (h, i) {
        dl.appendChild(el('div', { class: i === sheet.header.length - 1 ? 'last' : '' }, [el('dt', { text: h }), el('dd', { text: r.cells[i] || '—' })]));
      });
      det.appendChild(dl);
    });
    det.appendChild(el('p', { class: 'src' }, [el('button', { type: 'button', class: 'link', text: 'Tablonun tamamında göster', onclick: function () { showRow(key, rows[0].row); } })]));
    return det;
  }

  function metaText() {
    var m = EXCEL.meta || {};
    var t = (m.cikarimTarihi || '').split('-');
    var tarih = t.length === 3 ? t[2] + '.' + t[1] + '.' + t[0] : '';
    return 'Kaynak tablo: ' + (m.dosya || 'kadinlara_esinden_anne_babasindan.xls') + (m.satirSayisi ? ' · ' + m.satirSayisi + ' satır' : '') + (m.sha256 ? ' · sürüm ' + m.sha256 : '') + (tarih ? ' · ' + tarih : '');
  }

  /* ---------- Yazdırma özeti ve metin ---------- */

  var lastSummary = null;

  function todayText() {
    try { return new Date().toLocaleDateString('tr-TR'); } catch (e) { return ''; }
  }

  // summary: { key, facts: [[etiket, değer]], answer, plain, rows }
  function setPrintSummary(summary) {
    lastSummary = summary;
    var box = $('#print-summary');
    box.innerHTML = '';
    if (!summary) { return; }
    var tone = summary.tone || 'none';

    box.appendChild(el('header', { class: 'p-head' }, [
      el('div', { class: 'p-brand' }, [el('span', { class: 'p-mark', 'aria-hidden': 'true' }), 'Çift Aylık Sorgusu']),
      el('div', { class: 'p-meta' }, [el('div', { text: 'Sonuç özeti' }), el('div', { text: todayText() })])
    ]));

    box.appendChild(el('h1', { class: 'p-title', text: TITLES[summary.key] }));

    var result = el('section', { class: 'p-result tone-' + tone }, [
      el('div', { class: 'p-label', text: 'Sonuç' }),
      el('p', { class: 'p-answer', text: summary.answer })
    ]);
    if (summary.plain) { result.appendChild(el('p', { class: 'p-plain', text: summary.plain })); }
    box.appendChild(result);

    box.appendChild(el('h2', { class: 'p-h2', text: 'Verilen bilgiler' }));
    box.appendChild(el('table', { class: 'p-facts' }, [el('tbody', null, summary.facts.map(function (f) {
      return el('tr', null, [el('th', { scope: 'row', text: f[0] }), el('td', { text: f[1] })]);
    }))]));

    if (summary.rows && summary.rows.length) {
      var sheet = EXCEL[summary.key];
      summary.rows.forEach(function (rule) {
        var r = excelRow(summary.key, rule.row);
        if (!r) { return; }
        box.appendChild(el('h2', { class: 'p-h2', text: 'Dayanak' }));
        box.appendChild(el('p', { class: 'p-sub', text: 'Kaynak tablo "' + sheetName(summary.key) + '", satır ' + rule.row }));
        box.appendChild(el('table', { class: 'p-row' }, [el('tbody', null, sheet.header.map(function (h, i) {
          return el('tr', { class: i === sheet.header.length - 1 ? 'last' : '' }, [el('th', { scope: 'row', text: h }), el('td', { text: r.cells[i] || '' })]);
        }))]));
      });
    }

    box.appendChild(el('footer', { class: 'p-foot' }, [
      el('p', { text: TEXTS.NONE.printNote }),
      el('p', { text: metaText() })
    ]));
  }

  function summaryText() {
    if (!lastSummary) { return ''; }
    var s = lastSummary;
    var lines = ['Çift Aylık Sorgusu – ' + TITLES[s.key] + ' · ' + todayText(), ''];
    s.facts.forEach(function (f) { lines.push(f[0] + ': ' + f[1]); });
    lines.push('', 'Sonuç: ' + s.answer);
    if (s.plain) { lines.push(s.plain); }
    if (s.rows && s.rows.length) {
      lines.push('', 'Dayanak: kaynak tablo "' + sheetName(s.key) + '", satır ' + s.rows.map(function (r) { return r.row; }).join(', '));
      var sheet = EXCEL[s.key];
      s.rows.forEach(function (rule) {
        var r = excelRow(s.key, rule.row);
        if (r) { sheet.header.forEach(function (h, i) { lines.push('  ' + h + ': ' + (r.cells[i] || '')); }); }
      });
    }
    lines.push('', metaText());
    return lines.join('\n');
  }

  function copySummary(btn) {
    var text = summaryText();
    var done = function () { var old = btn.textContent; btn.textContent = 'Kopyalandı'; setTimeout(function () { btn.textContent = old; }, 1600); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
    } else { fallbackCopy(text, done); }
  }

  function fallbackCopy(text, done) {
    var ta = el('textarea', { style: 'position:fixed;left:-9999px;top:0', 'aria-hidden': 'true' });
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { /* yok say */ }
    document.body.removeChild(ta);
  }

  /* ---------- Sesli okuma ---------- */

  if ('speechSynthesis' in window && window.speechSynthesis.getVoices) {
    try { window.speechSynthesis.getVoices(); window.speechSynthesis.onvoiceschanged = function () { window.speechSynthesis.getVoices(); }; } catch (e) { /* yok say */ }
  }

  var speech = {
    supported: 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window,
    speaking: false,
    speak: function (text, btn) {
      if (!speech.supported) { return; }
      if (speech.speaking) { speech.stop(); return; }
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'tr-TR';
      u.rate = 0.9;
      var voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
      for (var i = 0; i < voices.length; i++) {
        if (/^tr/i.test(voices[i].lang)) { u.voice = voices[i]; break; }
      }
      var label = btn ? btn.textContent : '';
      var reset = function () { speech.speaking = false; if (btn) { btn.textContent = label; btn.setAttribute('aria-pressed', 'false'); } };
      speech.reset = reset;
      u.onend = reset;
      u.onerror = reset;
      speech.speaking = true;
      if (btn) { btn.textContent = 'Durdur'; btn.setAttribute('aria-pressed', 'true'); }
      try { window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } catch (e) { reset(); }
    },
    stop: function () {
      try { window.speechSynthesis.cancel(); } catch (e) { /* yok say */ }
      if (speech.speaking && speech.reset) { speech.reset(); }
      speech.speaking = false;
    }
  };
  document.addEventListener('visibilitychange', function () { if (document.hidden) { speech.stop(); } });

  /* ---------- Hızlı giriş formları ---------- */

  var state = {
    esAnneBaba: { es: null, ab: null, once: null },
    anneBaba: { baba: null, anne: null, tarih: null, donem: null },
    dulEs: { ilk: null, ikinci: null }
  };

  function fillSelect(select, statuses) {
    select.appendChild(el('option', { value: '', text: 'Seçin' }));
    var groups = [];
    statuses.forEach(function (s) {
      var g = groups.filter(function (x) { return x.name === (s.kurum || ''); })[0];
      if (!g) { g = { name: s.kurum || '', items: [] }; groups.push(g); }
      g.items.push(s);
    });
    groups.forEach(function (g) {
      var parent = g.name ? el('optgroup', { label: g.name }) : select;
      g.items.forEach(function (s) {
        parent.appendChild(el('option', { value: s.code, text: s.tarih ? s.label + ' · ' + s.tarih : s.label }));
      });
      if (g.name) { select.appendChild(parent); }
    });
  }

  function fillRadios(container, name, options) {
    options.forEach(function (o) {
      var id = name + '-' + o.code;
      container.appendChild(el('label', { 'for': id }, [
        el('input', { type: 'radio', name: name, id: id, value: o.code }),
        ' ' + o.label
      ]));
    });
  }

  function radioValue(name) {
    var checked = $('input[name="' + name + '"]:checked');
    return checked ? checked.value : null;
  }

  function selectedText(id) {
    var s = $(id);
    return s && s.selectedIndex > 0 ? s.options[s.selectedIndex].text : '';
  }

  // Hızlı giriş durumu adres çubuğunda taşınır: #esAnneBaba?es=A&ab=BK&once=evet
  function hashFor(key) {
    var st = state[key];
    var parts = [];
    Object.keys(st).forEach(function (k) { if (st[k]) { parts.push(k + '=' + encodeURIComponent(st[k])); } });
    return '#' + key + (parts.length ? '?' + parts.join('&') : '');
  }

  function parseHash() {
    var h = (location.hash || '').replace(/^#/, '');
    var q = h.indexOf('?');
    var key = q === -1 ? h : h.slice(0, q);
    var params = {};
    if (q !== -1) {
      h.slice(q + 1).split('&').forEach(function (kv) {
        var i = kv.indexOf('=');
        if (i > 0) { params[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1)); }
      });
    }
    return { key: TABS.indexOf(key) !== -1 ? key : null, params: params };
  }

  function syncHash(key) {
    if (document.body.getAttribute('data-mode') !== 'expert') { return; }
    try { history.replaceState(null, '', hashFor(key)); } catch (e) { /* yok say */ }
  }

  // Verilen motor girdisi için paylaşılabilir bağlantı (yalnızca statü kodları)
  function linkFor(key, input) {
    var parts = [];
    Object.keys(input || {}).forEach(function (k) { if (input[k]) { parts.push(k + '=' + encodeURIComponent(input[k])); } });
    return location.href.split('#')[0] + '#' + key + (parts.length ? '?' + parts.join('&') : '');
  }

  function copyLink(url, btn) {
    if (typeof url !== 'string') { btn = url; url = location.href.split('#')[0] + hashFor(currentTab); }
    var done = function () { var old = btn.textContent; btn.textContent = 'Bağlantı kopyalandı'; setTimeout(function () { btn.textContent = old; }, 1600); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, function () { fallbackCopy(url, done); });
    } else { fallbackCopy(url, done); }
  }

  function actionsRow(items) {
    var row = el('div', { class: 'actions' });
    items.forEach(function (b) { if (b) { row.appendChild(b); } });
    return row;
  }

  function renderAnswer(key, res, facts) {
    var box = $('#result-' + key);
    box.innerHTML = '';
    var rows = res.rows || [];
    var summary = null;

    if (res.status === 'ok') {
      box.appendChild(el('p', { class: 'verdict tone-' + res.sonuc.tone, text: res.sonuc.title }));
      box.appendChild(el('p', { class: 'src' }, ['Kaynak tablo, '].concat(rowLinks(key, rows))));
      box.appendChild(rowCard(key, rows));
      summary = { key: key, facts: facts, answer: res.sonuc.title, plain: '', rows: rows, tone: res.sonuc.tone };
    } else if (res.status === 'none') {
      box.appendChild(el('p', { class: 'verdict tone-none', text: 'Tabloda bu durum için satır yok.' }));
      if (res.reason) { box.appendChild(el('p', { class: 'src', text: res.reason })); }
      if (res.candidates && res.candidates.length) {
        box.appendChild(el('p', { class: 'src' }, ['Koşulları farklı yakın satır: '].concat(rowLinks(key, res.candidates))));
      }
      summary = { key: key, facts: facts, answer: 'Tabloda bu durum için satır yok.', plain: res.reason || '', rows: [] };
    } else if (res.status === 'conflict') {
      box.appendChild(el('p', { class: 'verdict tone-warn', text: res.sonuclar.map(function (s) { return s.title; }).join(' / ') }));
      box.appendChild(el('p', { class: 'src' }, ['Tabloda farklı sonuç veren satırlar var: '].concat(rowLinks(key, rows))));
    }

    if (summary) {
      setPrintSummary(summary);
      var copyBtn = el('button', { type: 'button', class: 'btn secondary', text: 'Kopyala' });
      copyBtn.addEventListener('click', function () { copySummary(copyBtn); });
      var linkBtn = el('button', { type: 'button', class: 'btn secondary', text: 'Bağlantıyı kopyala' });
      linkBtn.addEventListener('click', function () { copyLink(location.href.split('#')[0] + hashFor(key), linkBtn); });
      box.appendChild(actionsRow([
        canPrint ? el('button', { type: 'button', class: 'btn secondary', text: 'Yazdır', onclick: function () { window.print(); } }) : null,
        copyBtn,
        linkBtn
      ]));
    }
    highlightRows(key, rows.map(function (r) { return r.row; }));
    syncHash(key);
  }

  function runEs() {
    var st = state.esAnneBaba;
    var res = ENGINE.evalEsAnneBaba(st);
    $('#es-once-field').hidden = !res.needsOnce;
    var facts = [['Ölen eş', selectedText('#es-es')], ['Ölen anne veya baba', selectedText('#es-ab')]];
    if (res.needsOnce) { facts.push(['1.10.2008 öncesi aylık', st.once === 'evet' ? 'Evet' : st.once === 'hayir' ? 'Hayır' : '']); }
    renderAnswer('esAnneBaba', res, facts);
  }

  function runAb() {
    var st = state.anneBaba;
    var res = ENGINE.evalAnneBaba(st);
    $('#ab-donem-field').hidden = !res.needsDonem;
    var tarih = ENGINE.findStatus(RULES.anneBaba.tarih, st.tarih);
    var donem = ENGINE.findStatus(RULES.anneBaba.donem, st.donem);
    var facts = [['Baba', selectedText('#ab-baba')], ['Anne', selectedText('#ab-anne')], ['Ölüm tarihleri', tarih ? tarih.label : '']];
    if (res.needsDonem) { facts.push(['Uygulama dönemi', donem ? donem.label : '']); }
    renderAnswer('anneBaba', res, facts);
  }

  function runDul() {
    renderAnswer('dulEs', ENGINE.evalDulEs(state.dulEs), [['Ölen ilk eş', selectedText('#dul-ilk')], ['Ölen ikinci eş', selectedText('#dul-ikinci')]]);
  }

  function runAll() { runEs(); runAb(); runDul(); }

  function initForms() {
    var es = state.esAnneBaba;
    fillSelect($('#es-es'), RULES.esAnneBaba.status);
    fillSelect($('#es-ab'), RULES.esAnneBaba.status);
    $('#es-es').addEventListener('change', function (ev) { es.es = ev.target.value || null; runEs(); });
    $('#es-ab').addEventListener('change', function (ev) { es.ab = ev.target.value || null; runEs(); });
    $all('input[name="es-once"]').forEach(function (r) {
      r.addEventListener('change', function () { es.once = radioValue('es-once'); runEs(); });
    });

    var ab = state.anneBaba;
    fillSelect($('#ab-baba'), RULES.anneBaba.status);
    fillSelect($('#ab-anne'), RULES.anneBaba.status);
    fillRadios($('#ab-tarih-choices'), 'ab-tarih', RULES.anneBaba.tarih);
    fillRadios($('#ab-donem-choices'), 'ab-donem', RULES.anneBaba.donem);
    $('#ab-baba').addEventListener('change', function (ev) { ab.baba = ev.target.value || null; runAb(); });
    $('#ab-anne').addEventListener('change', function (ev) { ab.anne = ev.target.value || null; runAb(); });
    $all('input[name="ab-tarih"]').forEach(function (r) {
      r.addEventListener('change', function () { ab.tarih = radioValue('ab-tarih'); runAb(); });
    });
    $all('input[name="ab-donem"]').forEach(function (r) {
      r.addEventListener('change', function () { ab.donem = radioValue('ab-donem'); runAb(); });
    });

    var dul = state.dulEs;
    fillSelect($('#dul-ilk'), RULES.dulEs.status);
    fillSelect($('#dul-ikinci'), RULES.dulEs.status);
    $('#dul-ilk').addEventListener('change', function (ev) { dul.ilk = ev.target.value || null; runDul(); });
    $('#dul-ikinci').addEventListener('change', function (ev) { dul.ikinci = ev.target.value || null; runDul(); });

    applyHashParams();
    runAll();
  }

  // Bağlantıyla gelen sorguyu formlara yazar
  function applyHashParams() {
    var parsed = parseHash();
    if (!parsed.key) { return; }
    var st = state[parsed.key];
    var p = parsed.params;
    var controls = {
      esAnneBaba: { es: '#es-es', ab: '#es-ab', once: 'es-once' },
      anneBaba: { baba: '#ab-baba', anne: '#ab-anne', tarih: 'ab-tarih', donem: 'ab-donem' },
      dulEs: { ilk: '#dul-ilk', ikinci: '#dul-ikinci' }
    }[parsed.key];
    Object.keys(controls).forEach(function (k) {
      if (!p[k]) { return; }
      var c = controls[k];
      if (c.charAt(0) === '#') {
        var sel = $(c);
        var ok = Array.prototype.some.call(sel.options, function (o) { return o.value === p[k]; });
        if (ok) { sel.value = p[k]; st[k] = p[k]; }
      } else {
        var radio = $('input[name="' + c + '"][value="' + p[k] + '"]');
        if (radio) { radio.checked = true; st[k] = p[k]; }
      }
    });
  }

  /* ---------- Çevrimdışı (PWA) ---------- */

  function initServiceWorker() {
    if (inArtifact || !('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) { return; }
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* çevrimdışı desteği olmadan devam */ });
    });
  }

  /* ---------- Dışa açılan yardımcılar ---------- */

  window.SGK_UI = {
    el: el,
    TITLES: TITLES,
    PLAIN: PLAIN,
    canPrint: canPrint,
    speech: speech,
    showSource: showSource,
    highlightRows: highlightRows,
    rowLinks: rowLinks,
    rowCard: rowCard,
    linkFor: linkFor,
    copyLink: copyLink,
    setPrintSummary: setPrintSummary,
    copySummary: copySummary,
    print: function () { if (canPrint) { window.print(); } }
  };

  TABS.forEach(buildTable);
  initSize();
  initForms();
  initTabs();
  initMode();
  initServiceWorker();

  var savedMode = store('sgk-mode');
  setMode(savedMode === 'expert' || parseHash().key ? 'expert' : 'wizard');
})();
