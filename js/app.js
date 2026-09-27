// Ortak arayüz: mod (adım adım / hızlı giriş), yazı boyutu, kaynak tablolar,
// yazdırma özeti, sesli okuma ve hızlı giriş formları. Sihirbaz js/wizard.js
// içindedir ve buradaki SGK_UI yardımcılarını kullanır.
(function () {
  'use strict';

  var RULES = window.SGK_RULES;
  var ENGINE = window.SGK_ENGINE;
  var EXCEL = window.SGK_EXCEL;
  var TABS = ['esAnneBaba', 'anneBaba', 'dulEs'];
  var TITLES = { esAnneBaba: 'Eşten ve anne-babadan aylık', anneBaba: 'Anne ve babadan aylık', dulEs: 'İki eşten aylık' };

  // Sonucun sade Türkçe açıklaması (adım adım modda ve yazdırma özetinde)
  var PLAIN = {
    esAnneBaba: {
      iki: 'Hem eşinizden hem de annenizden ya da babanızdan aylık bağlanır.',
      tek: 'Eşinizden ve annenizden ya da babanızdan aylıklar birlikte bağlanmaz; yalnızca tek aylık bağlanır.'
    },
    anneBaba: {
      yuksekTamDusukYarim: 'Yüksek olan aylığın tamamı, düşük olan aylığın yarısı bağlanır.',
      tercihTam: 'İki aylıktan tercih ettiğiniz biri tam olarak bağlanır.',
      ikiTam: 'Annenizden ve babanızdan her iki aylık da tam olarak bağlanır.',
      yuksekOlan: 'Yalnızca yüksek olan aylık bağlanır.'
    },
    dulEs: {
      tercih: 'İki eşinizden birinin aylığını tercih edersiniz; yalnızca o aylık bağlanır.',
      iki: 'Her iki eşinizden de aylık bağlanır.'
    }
  };

  var inArtifact = !!window.claude || /claude/i.test(location.hostname) ||
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
    try { history.replaceState(null, '', expert ? '#' + currentTab : location.pathname + location.search); } catch (e) { /* yok say */ }
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
    if (document.body.getAttribute('data-mode') === 'expert') {
      try { history.replaceState(null, '', '#' + key); } catch (e) { /* yok say */ }
    }
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
    var hash = (location.hash || '').replace('#', '');
    setTab(TABS.indexOf(hash) !== -1 ? hash : TABS[0]);
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
    $('#table-' + key + ' .scroll').appendChild(el('table', { class: 'sheet' }, [el('thead', null, [head]), body]));

    $('#filter-' + key).addEventListener('input', function (ev) {
      var q = ev.target.value.trim().toLocaleLowerCase('tr');
      $all('#table-' + key + ' tr[data-row]').forEach(function (tr) {
        tr.hidden = !!q && tr.textContent.toLocaleLowerCase('tr').indexOf(q) === -1;
      });
    });
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
    box.appendChild(el('h1', { text: 'Çift Aylık Sorgusu – Sonuç Özeti' }));
    box.appendChild(el('p', { class: 'meta', text: TITLES[summary.key] + ' · ' + todayText() }));
    box.appendChild(el('h2', { text: 'Verilen bilgiler' }));
    box.appendChild(el('ul', null, summary.facts.map(function (f) { return el('li', { text: f[0] + ': ' + f[1] }); })));
    box.appendChild(el('h2', { text: 'Sonuç' }));
    box.appendChild(el('p', { class: 'big', text: summary.answer }));
    if (summary.plain) { box.appendChild(el('p', { text: summary.plain })); }
    if (summary.rows && summary.rows.length) {
      var sheet = EXCEL[summary.key];
      summary.rows.forEach(function (rule) {
        var r = excelRow(summary.key, rule.row);
        if (!r) { return; }
        box.appendChild(el('h2', { text: 'Dayanak: kaynak tablo "' + sheetName(summary.key) + '", satır ' + rule.row }));
        box.appendChild(el('table', null, sheet.header.map(function (h, i) {
          return el('tr', null, [el('th', { text: h }), el('td', { text: r.cells[i] || '' })]);
        })));
      });
    }
    box.appendChild(el('p', { class: 'note', text: 'Bu özet yalnızca kaynak tablodaki ilgili satıra dayanır. Kaynak: kadinlara_esinden_anne_babasindan.xls.' }));
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
      var reset = function () { speech.speaking = false; if (btn) { btn.textContent = label; } };
      u.onend = reset;
      u.onerror = reset;
      speech.speaking = true;
      if (btn) { btn.textContent = 'Durdur'; }
      try { window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } catch (e) { reset(); }
    },
    stop: function () {
      try { window.speechSynthesis.cancel(); } catch (e) { /* yok say */ }
      speech.speaking = false;
    }
  };

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
      summary = { key: key, facts: facts, answer: res.sonuc.title, plain: '', rows: rows };
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
      box.appendChild(actionsRow([
        canPrint ? el('button', { type: 'button', class: 'btn secondary', text: 'Yazdır', onclick: function () { window.print(); } }) : null,
        copyBtn
      ]));
    }
    highlightRows(key, rows.map(function (r) { return r.row; }));
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

    runAll();
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
  var hash = (location.hash || '').replace('#', '');
  setMode(savedMode === 'expert' || TABS.indexOf(hash) !== -1 ? 'expert' : 'wizard');
})();
