// Arayüz: seçimleri toplar, motoru çalıştırır, sonucu ve dayanak satırı gösterir.
(function () {
  'use strict';

  var RULES = window.SGK_RULES;
  var ENGINE = window.SGK_ENGINE;
  var EXCEL = window.SGK_EXCEL;
  var STORE_KEY = 'sgk-cift-aylik-v1';
  var TABS = ['esAnneBaba', 'anneBaba', 'dulEs'];

  var DEFAULTS = {
    tab: 'esAnneBaba',
    esAnneBaba: { es: 'A', ab: 'BK', once: 'evet' },
    anneBaba: { baba: 'A', anne: 'B', tarih: 'biri', donem: null },
    dulEs: { ilk: '506', ikinci: '1479' }
  };

  var state = loadState();

  /* ---------------- yardımcılar ---------------- */

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') { node.className = attrs[k]; }
        else if (k === 'text') { node.textContent = attrs[k]; }
        else if (k === 'html') { node.innerHTML = attrs[k]; }
        else if (k.indexOf('on') === 0) { node.addEventListener(k.slice(2), attrs[k]); }
        else if (attrs[k] === false || attrs[k] == null) { /* atla */ }
        else { node.setAttribute(k, attrs[k]); }
      });
    }
    (children || []).forEach(function (c) {
      if (c == null) { return; }
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function loadState() {
    var s = JSON.parse(JSON.stringify(DEFAULTS));
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        TABS.forEach(function (k) { if (saved[k]) { s[k] = Object.assign({}, s[k], saved[k]); } });
        if (TABS.indexOf(saved.tab) !== -1) { s.tab = saved.tab; }
      }
    } catch (e) { /* depolama yoksa varsayılanlarla devam */ }
    return s;
  }

  function saveState() {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* yok say */ }
  }

  function statusOf(list, code) { return ENGINE.findStatus(list, code); }

  function sheetName(key) { return EXCEL[key].sheet.replace(/\s+-/g, '-'); }

  function excelRow(key, rowNo) {
    var rows = EXCEL[key].rows;
    for (var i = 0; i < rows.length; i++) { if (rows[i].row === rowNo) { return rows[i]; } }
    return null;
  }

  /* ---------------- sekmeler ---------------- */

  function setTab(key, updateHash) {
    if (TABS.indexOf(key) === -1) { key = TABS[0]; }
    state.tab = key;
    $all('[role="tab"]').forEach(function (tab) {
      var on = tab.getAttribute('data-tab') === key;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;
    });
    TABS.forEach(function (k) { $('#panel-' + k).hidden = k !== key; });
    if (updateHash) {
      try { history.replaceState(null, '', '#' + key); } catch (e) { /* yok say */ }
    }
    saveState();
  }

  function initTabs() {
    var tabs = $all('[role="tab"]');
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { setTab(tab.getAttribute('data-tab'), true); });
      tab.addEventListener('keydown', function (ev) {
        var dir = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0;
        if (!dir) { return; }
        ev.preventDefault();
        var next = tabs[(i + dir + tabs.length) % tabs.length];
        next.focus();
        setTab(next.getAttribute('data-tab'), true);
      });
    });
    var hash = (location.hash || '').replace('#', '');
    setTab(TABS.indexOf(hash) !== -1 ? hash : state.tab, false);
    window.addEventListener('hashchange', function () {
      var h = (location.hash || '').replace('#', '');
      if (TABS.indexOf(h) !== -1) { setTab(h, false); }
    });
  }

  /* ---------------- seçenekler ---------------- */

  function fillSelect(select, statuses, placeholder) {
    select.innerHTML = '';
    select.appendChild(el('option', { value: '', text: placeholder }));
    var groups = {};
    var order = [];
    statuses.forEach(function (s) {
      var g = s.kurum || '';
      if (!groups[g]) { groups[g] = []; order.push(g); }
      groups[g].push(s);
    });
    order.forEach(function (g) {
      var parent = g ? el('optgroup', { label: g }) : select;
      groups[g].forEach(function (s) {
        var text = s.kisa || s.label;
        if (s.tarih) { text += ' — ' + s.tarih.toLowerCase(); }
        parent.appendChild(el('option', { value: s.code, text: text }));
      });
      if (g) { select.appendChild(parent); }
    });
  }

  function fillRadios(container, name, options) {
    container.innerHTML = '';
    options.forEach(function (o) {
      var id = name + '-' + o.code;
      container.appendChild(el('label', { class: 'choice', 'for': id }, [
        el('input', { type: 'radio', name: name, id: id, value: o.code }),
        el('span', { text: o.label })
      ]));
    });
  }

  function radioValue(name) {
    var checked = $('input[name="' + name + '"]:checked');
    return checked ? checked.value : null;
  }

  function setRadio(name, value) {
    $all('input[name="' + name + '"]').forEach(function (r) { r.checked = r.value === value; });
  }

  /* ---------------- tam tablo ---------------- */

  function buildTable(key) {
    var sheet = EXCEL[key];
    var details = $('#table-' + key);
    var scroll = $('.scroll', details);
    var headRow = el('tr', null, [el('th', { class: 'rownum', text: '#', scope: 'col' })]);
    sheet.header.forEach(function (h) { headRow.appendChild(el('th', { text: h, scope: 'col' })); });
    var tbody = el('tbody');
    var dataRows = 0;
    sheet.rows.forEach(function (r) {
      var isNote = !r.cells[1];
      if (!isNote) { dataRows++; }
      var tr = el('tr', { id: key + '-row-' + r.row, 'data-row': r.row, class: isNote ? 'note-row' : '' }, [
        el('td', { class: 'rownum', text: String(r.row) })
      ]);
      if (isNote) {
        tr.appendChild(el('td', { colspan: sheet.header.length, text: r.cells[0] }));
      } else {
        sheet.header.forEach(function (_, i) {
          var last = i === sheet.header.length - 1;
          tr.appendChild(el('td', { class: last ? 'result-cell' : '', text: r.cells[i] || '' }));
        });
      }
      tbody.appendChild(tr);
    });
    scroll.innerHTML = '';
    scroll.appendChild(el('table', { class: 'sheet' }, [el('thead', null, [headRow]), tbody]));
    $('#count-' + key).textContent = '· ' + sheetName(key) + ' sayfası · ' + dataRows + ' satır';
  }

  function highlightRows(key, rowNos) {
    $all('#table-' + key + ' tr[data-row]').forEach(function (tr) {
      tr.classList.toggle('hit', rowNos.indexOf(Number(tr.getAttribute('data-row'))) !== -1);
    });
  }

  function showRow(key, rowNo) {
    var details = $('#table-' + key);
    details.open = true;
    var tr = $('#' + key + '-row-' + rowNo);
    if (tr) { tr.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  }

  /* ---------------- sonuç kartı ---------------- */

  function rowCard(key, rule, tone) {
    var sheet = EXCEL[key];
    var r = excelRow(key, rule.row);
    if (!r) { return null; }
    var dl = el('dl', { class: 'row-card ' + (tone || '') });
    sheet.header.forEach(function (h, i) {
      var last = i === sheet.header.length - 1;
      dl.appendChild(el('div', { class: last ? 'is-result' : '' }, [
        el('dt', { text: h }),
        el('dd', { text: r.cells[i] || '—' })
      ]));
    });
    return dl;
  }

  function basisSection(key, rows, tone, title) {
    var wrap = el('section', { class: 'basis' });
    wrap.appendChild(el('h3', { text: title || (rows.length > 1 ? 'Dayanak: tablo satırları' : 'Dayanak: tablo satırı') }));
    rows.forEach(function (rule) {
      var head = el('div', { class: 'basis-head' }, [
        el('span', { class: 'rowref', text: sheetName(key) + ' · satır ' + rule.row }),
        el('button', { type: 'button', class: 'link', text: 'Tabloda göster', onclick: function () { showRow(key, rule.row); } })
      ]);
      wrap.appendChild(head);
      wrap.appendChild(rowCard(key, rule, tone));
    });
    return wrap;
  }

  function summaryList(pairs) {
    var dl = el('dl', { class: 'case-summary' });
    pairs.forEach(function (p) {
      if (!p[1]) { return; }
      dl.appendChild(el('div', null, [el('dt', { text: p[0] }), el('dd', { text: p[1] })]));
    });
    return dl;
  }

  function renderResult(key, res, summaryPairs, extras) {
    var box = $('#result-' + key);
    box.innerHTML = '';
    var card = el('div', { class: 'result-card' });
    var tone, label, title, text;

    if (res.status === 'ok') {
      tone = 'tone-' + res.sonuc.tone;
      label = 'Bağlanacak aylık';
      title = res.sonuc.title;
      text = res.sonuc.text;
    } else if (res.status === 'conflict') {
      tone = 'tone-warn';
      label = 'Tabloda çelişki';
      title = res.sonuclar.map(function (s) { return s.title; }).join(' / ');
      text = 'Tabloda bu kombinasyon için birbirinden farklı sonuç veren satırlar var. Dayanak satırlarını birlikte değerlendirin.';
    } else if (res.status === 'none') {
      tone = 'tone-neutral';
      label = 'Sonuç';
      title = 'Tabloda karşılığı yok';
      text = res.reason;
    } else if (res.status === 'needsOnce' || res.status === 'needsDonem') {
      tone = 'tone-prompt';
      label = 'Bir bilgi daha gerekli';
      title = res.status === 'needsOnce' ? 'Evet / Hayır seçin' : 'Uygulama dönemini seçin';
      text = res.reason;
    } else {
      tone = 'tone-neutral';
      label = 'Sonuç';
      title = 'Seçim bekleniyor';
      text = res.reason;
    }

    card.appendChild(el('div', { class: 'verdict ' + tone }, [
      el('span', { class: 'verdict-label', text: label }),
      el('strong', { text: title })
    ]));
    card.appendChild(el('p', { class: 'verdict-text', text: text }));
    card.appendChild(summaryList(summaryPairs));

    (extras || []).forEach(function (note) { if (note) { card.appendChild(el('p', { class: 'side-note', text: note })); } });

    if (res.rows && res.rows.length) {
      card.appendChild(basisSection(key, res.rows, tone));
    } else if (res.status === 'none' && res.candidates && res.candidates.length) {
      var near = el('section', { class: 'near' }, [el('h3', { text: 'Yakın satırlar (koşulları farklı)' })]);
      var ul = el('ul');
      res.candidates.forEach(function (rule) {
        var r = excelRow(key, rule.row);
        ul.appendChild(el('li', null, [
          el('button', { type: 'button', class: 'link', text: 'Satır ' + rule.row, onclick: function () { showRow(key, rule.row); } }),
          ': ' + r.cells.filter(function (c) { return c; }).join(' · ')
        ]));
      });
      near.appendChild(ul);
      card.appendChild(near);
    }

    box.appendChild(card);
    highlightRows(key, (res.rows || []).map(function (r) { return r.row; }));
  }

  /* ---------------- 1) eşten ve anne-babadan ---------------- */

  function describeEs(code) {
    var s = statusOf(RULES.esAnneBaba.status, code);
    return s ? s.label + ' (' + s.tarih.toLowerCase() + ')' : '';
  }

  function runEs() {
    var st = state.esAnneBaba;
    var res = ENGINE.evalEsAnneBaba(st);

    var esSt = statusOf(RULES.esAnneBaba.status, st.es);
    var abSt = statusOf(RULES.esAnneBaba.status, st.ab);
    $('#es-es-hint').textContent = esSt ? 'Tablo koşulu: ' + esSt.tarih : '';
    $('#es-ab-hint').textContent = abSt ? 'Tablo koşulu: ' + abSt.tarih : '';

    var note = $('#es-once-note');
    var field = $('#es-once-field');
    field.classList.toggle('attention', res.status === 'needsOnce');
    if (res.status === 'incomplete') {
      note.textContent = '';
      note.classList.remove('matters');
    } else if (res.needsOnce) {
      note.textContent = 'Bu kombinasyonda sonuç bu yanıta göre değişir.';
      note.classList.add('matters');
    } else {
      note.textContent = 'Bu kombinasyonda yanıt sonucu değiştirmez.';
      note.classList.remove('matters');
    }

    var extras = [];
    if (res.status === 'ok' && !res.needsOnce && st.once) {
      extras.push('Tablo bu kombinasyonda "Evet/Hayır" ayrımı yapmaz; sonuç anne/babadan daha önce aylık bağlanıp bağlanmadığından bağımsızdır.');
    }

    renderResult('esAnneBaba', res, [
      ['Ölen eş', describeEs(st.es)],
      ['Anne / baba', describeEs(st.ab)],
      ['1.10.2008 öncesi aylık', st.once === 'evet' ? 'Evet' : st.once === 'hayir' ? 'Hayır' : (st.es && st.ab ? 'Seçilmedi' : '')]
    ], extras);
  }

  function initEs() {
    var st = state.esAnneBaba;
    fillSelect($('#es-es'), RULES.esAnneBaba.status, 'Seçin…');
    fillSelect($('#es-ab'), RULES.esAnneBaba.status, 'Seçin…');
    $('#es-es').value = st.es || '';
    $('#es-ab').value = st.ab || '';
    setRadio('es-once', st.once);

    $('#es-es').addEventListener('change', function (ev) { st.es = ev.target.value || null; saveState(); runEs(); });
    $('#es-ab').addEventListener('change', function (ev) { st.ab = ev.target.value || null; saveState(); runEs(); });
    $all('input[name="es-once"]').forEach(function (r) {
      r.addEventListener('change', function () { st.once = radioValue('es-once'); saveState(); runEs(); });
    });
    $('#es-reset').addEventListener('click', function () {
      st.es = null; st.ab = null; st.once = null;
      $('#es-es').value = ''; $('#es-ab').value = ''; setRadio('es-once', null);
      saveState(); runEs();
    });
    runEs();
  }

  /* ---------------- 2) anne ve babadan ---------------- */

  function runAb() {
    var st = state.anneBaba;
    var res = ENGINE.evalAnneBaba(st);

    var donemField = $('#ab-donem-field');
    var showDonem = !!res.needsDonem;
    donemField.hidden = !showDonem;
    donemField.classList.toggle('attention', res.status === 'needsDonem');
    $('#ab-donem-note').textContent = showDonem ? 'Bu çift için sonuç uygulama dönemine göre değişir.' : '';

    var baba = statusOf(RULES.anneBaba.status, st.baba);
    var anne = statusOf(RULES.anneBaba.status, st.anne);
    var tarih = statusOf(RULES.anneBaba.tarih, st.tarih);
    var donem = statusOf(RULES.anneBaba.donem, st.donem);

    renderResult('anneBaba', res, [
      ['Baba', baba ? baba.label : ''],
      ['Anne', anne ? anne.label : ''],
      ['Ölüm tarihleri', tarih ? tarih.label : ''],
      ['Dönem', showDonem ? (donem ? donem.label : 'Seçilmedi') : '']
    ], []);
  }

  function initAb() {
    var st = state.anneBaba;
    fillSelect($('#ab-baba'), RULES.anneBaba.status, 'Seçin…');
    fillSelect($('#ab-anne'), RULES.anneBaba.status, 'Seçin…');
    fillRadios($('#ab-tarih-choices'), 'ab-tarih', RULES.anneBaba.tarih);
    fillRadios($('#ab-donem-choices'), 'ab-donem', RULES.anneBaba.donem);
    $('#ab-baba').value = st.baba || '';
    $('#ab-anne').value = st.anne || '';
    setRadio('ab-tarih', st.tarih);
    setRadio('ab-donem', st.donem);
    $('#caption-anneBaba').textContent = RULES.anneBaba.baslik;

    $('#ab-baba').addEventListener('change', function (ev) { st.baba = ev.target.value || null; saveState(); runAb(); });
    $('#ab-anne').addEventListener('change', function (ev) { st.anne = ev.target.value || null; saveState(); runAb(); });
    $all('input[name="ab-tarih"]').forEach(function (r) {
      r.addEventListener('change', function () { st.tarih = radioValue('ab-tarih'); saveState(); runAb(); });
    });
    $all('input[name="ab-donem"]').forEach(function (r) {
      r.addEventListener('change', function () { st.donem = radioValue('ab-donem'); saveState(); runAb(); });
    });
    $('#ab-reset').addEventListener('click', function () {
      st.baba = null; st.anne = null; st.tarih = null; st.donem = null;
      $('#ab-baba').value = ''; $('#ab-anne').value = ''; setRadio('ab-tarih', null); setRadio('ab-donem', null);
      saveState(); runAb();
    });
    runAb();
  }

  /* ---------------- 3) dul eşe ---------------- */

  function runDul() {
    var st = state.dulEs;
    var res = ENGINE.evalDulEs(st);
    var ilk = statusOf(RULES.dulEs.status, st.ilk);
    var ikinci = statusOf(RULES.dulEs.status, st.ikinci);
    var extras = [];
    if (res.status === 'ok' && !res.sirali) {
      extras.push('Tablo bu ikiliyi ters sırayla (ilk eş ↔ ikinci eş) listeler; eşleştirme sıradan bağımsız yapıldı.');
    }
    renderResult('dulEs', res, [
      ['İlk eş', ilk ? ilk.label : ''],
      ['İkinci eş', ikinci ? ikinci.label : '']
    ], extras);
  }

  function initDul() {
    var st = state.dulEs;
    fillSelect($('#dul-ilk'), RULES.dulEs.status, 'Seçin…');
    fillSelect($('#dul-ikinci'), RULES.dulEs.status, 'Seçin…');
    $('#dul-ilk').value = st.ilk || '';
    $('#dul-ikinci').value = st.ikinci || '';

    var notes = $('#dul-notlar');
    RULES.dulEs.notlar.forEach(function (n) {
      notes.appendChild(el('p', null, [el('span', { class: 'no', text: String(n.no) }), n.text]));
    });

    $('#dul-ilk').addEventListener('change', function (ev) { st.ilk = ev.target.value || null; saveState(); runDul(); });
    $('#dul-ikinci').addEventListener('change', function (ev) { st.ikinci = ev.target.value || null; saveState(); runDul(); });
    $('#dul-reset').addEventListener('click', function () {
      st.ilk = null; st.ikinci = null;
      $('#dul-ilk').value = ''; $('#dul-ikinci').value = '';
      saveState(); runDul();
    });
    runDul();
  }

  /* ---------------- başlat ---------------- */

  TABS.forEach(buildTable);
  initEs();
  initAb();
  initDul();
  initTabs();
})();
