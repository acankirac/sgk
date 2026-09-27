// Arayüz: seçimleri toplar, motoru çalıştırır, cevabı ve kaynak satırı gösterir.
(function () {
  'use strict';

  var RULES = window.SGK_RULES;
  var ENGINE = window.SGK_ENGINE;
  var EXCEL = window.SGK_EXCEL;
  var TABS = ['esAnneBaba', 'anneBaba', 'dulEs'];

  var state = {
    esAnneBaba: { es: null, ab: null, once: null },
    anneBaba: { baba: null, anne: null, tarih: null, donem: null },
    dulEs: { ilk: null, ikinci: null }
  };

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

  /* Sekmeler */

  function setTab(key) {
    $all('[role="tab"]').forEach(function (tab) {
      var on = tab.getAttribute('data-tab') === key;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;
    });
    TABS.forEach(function (k) { $('#panel-' + k).hidden = k !== key; });
    try { history.replaceState(null, '', '#' + key); } catch (e) { /* yok say */ }
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

  /* Seçenekler */

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
        var text = s.tarih ? s.label + ' · ' + s.tarih : s.label;
        parent.appendChild(el('option', { value: s.code, text: text }));
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

  /* Kaynak tablo */

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
  }

  function highlightRows(key, rowNos) {
    $all('#table-' + key + ' tr[data-row]').forEach(function (tr) {
      tr.classList.toggle('hit', rowNos.indexOf(Number(tr.getAttribute('data-row'))) !== -1);
    });
  }

  function showRow(key, rowNo) {
    $('#table-' + key).open = true;
    var tr = $('#' + key + '-row-' + rowNo);
    if (tr) { tr.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  }

  /* Cevap */

  function rowLinks(key, rows) {
    var parts = [];
    rows.forEach(function (rule, i) {
      if (i > 0) { parts.push(i === rows.length - 1 ? ' ve ' : ', '); }
      parts.push(el('button', { type: 'button', class: 'link', text: 'satır ' + rule.row, onclick: function () { showRow(key, rule.row); } }));
    });
    return parts;
  }

  function renderAnswer(key, res) {
    var box = $('#result-' + key);
    box.innerHTML = '';
    var rows = res.rows || [];

    if (res.status === 'ok') {
      box.appendChild(el('p', { class: 'verdict tone-' + res.sonuc.tone, text: res.sonuc.title }));
      box.appendChild(el('p', { class: 'src' }, ['Kaynak tablo, '].concat(rowLinks(key, rows))));
    } else if (res.status === 'none') {
      box.appendChild(el('p', { class: 'verdict tone-none', text: 'Tabloda bu durum için satır yok.' }));
      if (res.reason) { box.appendChild(el('p', { class: 'src', text: res.reason })); }
      if (res.candidates && res.candidates.length) {
        box.appendChild(el('p', { class: 'src' }, ['Koşulları farklı yakın satır: '].concat(rowLinks(key, res.candidates))));
      }
    } else if (res.status === 'conflict') {
      box.appendChild(el('p', { class: 'verdict tone-warn', text: res.sonuclar.map(function (s) { return s.title; }).join(' / ') }));
      box.appendChild(el('p', { class: 'src' }, ['Tabloda farklı sonuç veren satırlar var: '].concat(rowLinks(key, rows))));
    }

    highlightRows(key, rows.map(function (r) { return r.row; }));
  }

  /* 1) Eşten ve anne-babadan */

  function runEs() {
    var res = ENGINE.evalEsAnneBaba(state.esAnneBaba);
    $('#es-once-field').hidden = !res.needsOnce;
    renderAnswer('esAnneBaba', res);
  }

  function initEs() {
    var st = state.esAnneBaba;
    fillSelect($('#es-es'), RULES.esAnneBaba.status);
    fillSelect($('#es-ab'), RULES.esAnneBaba.status);
    $('#es-es').addEventListener('change', function (ev) { st.es = ev.target.value || null; runEs(); });
    $('#es-ab').addEventListener('change', function (ev) { st.ab = ev.target.value || null; runEs(); });
    $all('input[name="es-once"]').forEach(function (r) {
      r.addEventListener('change', function () { st.once = radioValue('es-once'); runEs(); });
    });
    runEs();
  }

  /* 2) Anne ve babadan */

  function runAb() {
    var res = ENGINE.evalAnneBaba(state.anneBaba);
    $('#ab-donem-field').hidden = !res.needsDonem;
    renderAnswer('anneBaba', res);
  }

  function initAb() {
    var st = state.anneBaba;
    fillSelect($('#ab-baba'), RULES.anneBaba.status);
    fillSelect($('#ab-anne'), RULES.anneBaba.status);
    fillRadios($('#ab-tarih-choices'), 'ab-tarih', RULES.anneBaba.tarih);
    fillRadios($('#ab-donem-choices'), 'ab-donem', RULES.anneBaba.donem);
    $('#ab-baba').addEventListener('change', function (ev) { st.baba = ev.target.value || null; runAb(); });
    $('#ab-anne').addEventListener('change', function (ev) { st.anne = ev.target.value || null; runAb(); });
    $all('input[name="ab-tarih"]').forEach(function (r) {
      r.addEventListener('change', function () { st.tarih = radioValue('ab-tarih'); runAb(); });
    });
    $all('input[name="ab-donem"]').forEach(function (r) {
      r.addEventListener('change', function () { st.donem = radioValue('ab-donem'); runAb(); });
    });
    runAb();
  }

  /* 3) İki eşten */

  function runDul() {
    renderAnswer('dulEs', ENGINE.evalDulEs(state.dulEs));
  }

  function initDul() {
    var st = state.dulEs;
    fillSelect($('#dul-ilk'), RULES.dulEs.status);
    fillSelect($('#dul-ikinci'), RULES.dulEs.status);
    $('#dul-ilk').addEventListener('change', function (ev) { st.ilk = ev.target.value || null; runDul(); });
    $('#dul-ikinci').addEventListener('change', function (ev) { st.ikinci = ev.target.value || null; runDul(); });
    runDul();
  }

  TABS.forEach(buildTable);
  initEs();
  initAb();
  initDul();
  initTabs();
})();
