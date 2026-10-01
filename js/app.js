// Ortak arayüz: mod (adım adım / hızlı giriş), yazı boyutu, kaynak tablolar,
// dayanak bağlantıları, yazdırma özeti, sesli okuma ve hızlı giriş formları.
// Adım adım mod js/wizard.js içindedir ve buradaki SGK_UI yardımcılarını kullanır.
(function () {
  'use strict';

  var RULES = window.SGK_RULES;
  var ENGINE = window.SGK_ENGINE;
  var EXCEL = window.SGK_EXCEL;
  var TEXTS = window.SGK_TEXTS;
  var G = window.SGK_GENELGE;
  var HUKUM = window.SGK_HUKUM;
  var TABS = ['esAnneBaba', 'anneBaba', 'dulEs'];
  // Hızlı girişte tek sayfalık form olarak gösterilen modüller (sekme -> akış)
  var FORM_TABS = { esTam: 'esAnneBaba', kiz: 'kiz', anne: 'anne', dulHak: 'dulHak', prim: 'prim' };
  function isFormTab(k) { return Object.prototype.hasOwnProperty.call(FORM_TABS, k); }
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

  /* ---------- Kaynak tablolar (tek kayıt) ---------- */

  var SOURCES = {
    esAnneBaba: { short: 'Eş ve anne-babadan tablosu', title: 'Dul kadınlara eş ve anne-babadan iki aylık bağlanması (5.12.2017 sonrası uygulama)', sayfa: '148–150', header: EXCEL.esAnneBaba.header, rows: EXCEL.esAnneBaba.rows, matrix: true },
    anneBaba: { short: 'Tablo-6', title: 'Kız çocuklarına anne ve babadan iki aylık bağlanması', sayfa: '133–134', header: EXCEL.anneBaba.header, rows: EXCEL.anneBaba.rows, matrix: true },
    dulEs: { short: 'Tablo-2', title: 'Dul eşe ölen iki eşinden bağlanacak aylıklar', sayfa: '124–125', header: EXCEL.dulEs.header, rows: EXCEL.dulEs.rows, matrix: true }
  };
  Object.keys(G.TABLES).forEach(function (k) {
    var t = G.TABLES[k];
    SOURCES[k] = { short: 'Tablo-' + t.no, title: t.title, sayfa: t.sayfa, header: t.header, rows: t.rows };
  });
  var SOURCE_ORDER = ['t1', 'dulEs', 't3', 't4', 't5', 'anneBaba', 't7', 't8', 't9', 'esAnneBaba'];

  function sourceRow(key, rowNo) {
    var rows = SOURCES[key].rows;
    for (var i = 0; i < rows.length; i++) { if (rows[i].row === rowNo) { return rows[i]; } }
    return null;
  }

  function sourceLabel(key) { return SOURCES[key].short + ' (s.' + SOURCES[key].sayfa + ')'; }

  function buildSources() {
    var host = $('#sources');
    SOURCE_ORDER.forEach(function (key) {
      var src = SOURCES[key];
      var head = el('tr', null, [el('th', { class: 'rownum', scope: 'col', text: '#' })]);
      src.header.forEach(function (h) { head.appendChild(el('th', { scope: 'col', text: h })); });
      var body = el('tbody');
      src.rows.forEach(function (r) {
        var isNote = r.cells.length > 1 && !r.cells[1];
        var tr = el('tr', { id: key + '-row-' + r.row, 'data-row': r.row, class: isNote ? 'note' : '' }, [el('td', { class: 'rownum', text: String(r.row) })]);
        if (isNote) { tr.appendChild(el('td', { colspan: src.header.length, text: r.cells[0] })); }
        else { src.header.forEach(function (_, i) { tr.appendChild(el('td', { class: i === src.header.length - 1 ? 'last' : '', text: r.cells[i] || '' })); }); }
        body.appendChild(tr);
      });
      var filter = el('input', { type: 'search', id: 'filter-' + key, placeholder: 'Tabloda ara', 'aria-label': 'Tabloda ara' });
      var filterBox = el('div', { class: 'filter inline' }, [filter]);
      var scroll = el('div', { class: 'scroll' }, [el('table', { class: 'sheet' }, [el('thead', null, [head]), body])]);
      var details = el('details', { class: 'source', id: 'table-' + key, hidden: true }, [
        el('summary', null, [el('span', { class: 'src-no', text: src.short }), ' ' + src.title + ' ', el('span', { class: 'src-page', text: '· s.' + src.sayfa })]),
        el('div', { class: 'viewbar' }, [filterBox]),
        scroll
      ]);
      filter.addEventListener('input', function (ev) {
        var q = ev.target.value.trim().toLocaleLowerCase('tr');
        $all('tr[data-row]', details).forEach(function (tr) { tr.hidden = !!q && tr.textContent.toLocaleLowerCase('tr').indexOf(q) === -1; });
      });
      if (src.matrix) { addMatrixToggle(key, details, scroll, filterBox); }
      host.appendChild(details);
    });
  }

  function addMatrixToggle(key, details, scroll, filterBox) {
    var listBtn = el('button', { type: 'button', 'aria-pressed': 'true', text: 'Liste' });
    var gridBtn = el('button', { type: 'button', 'aria-pressed': 'false', text: 'Çapraz tablo' });
    details.querySelector('.viewbar').insertBefore(el('div', { class: 'seg' }, [listBtn, gridBtn]), filterBox);
    var matrixBox = el('div', { class: 'matrix', hidden: true });
    details.appendChild(matrixBox);
    var built = false;
    function setView(grid) {
      listBtn.setAttribute('aria-pressed', grid ? 'false' : 'true');
      gridBtn.setAttribute('aria-pressed', grid ? 'true' : 'false');
      scroll.hidden = grid; filterBox.hidden = grid; matrixBox.hidden = !grid;
      if (grid && !built) { buildMatrix(key, matrixBox); built = true; }
    }
    listBtn.addEventListener('click', function () { setView(false); });
    gridBtn.addEventListener('click', function () { setView(true); });
    details.setListView = function () { setView(false); };
  }

  // Çapraz tablo: satır = ilk kişi, sütun = ikinci kişi; hücre = tablonun verdiği sonuç
  function cellSummary(key, x, y, tarih) {
    function one(extra) {
      if (key === 'esAnneBaba') {
        var r = HUKUM.esAb2017Sonrasi({ es: x, ab: y, once: extra });
        return { status: r.status === 'needs' ? 'none' : r.status, sonuc: r.sonuc, refs: r.refs };
      }
      var res = key === 'anneBaba' ? ENGINE.evalAnneBaba({ baba: x, anne: y, tarih: tarih, donem: extra }) : ENGINE.evalDulEs({ ilk: x, ikinci: y });
      return { status: res.status, sonuc: res.sonuc, refs: (res.rows || []).map(function (r) { return { key: key, row: r.row }; }) };
    }
    var variants = key === 'esAnneBaba' ? [['Evet', 'evet'], ['Hayır', 'hayir']] :
                   key === 'anneBaba' ? [['5.12.2017 öncesi', 'once2017'], ['5.12.2017 sonrası', 'sonra2017']] : [['', null]];
    var results = variants.map(function (v) { return { label: v[0], res: one(v[1]) }; });
    var okOnes = results.filter(function (r) { return r.res.status === 'ok'; });
    var refs = [];
    results.forEach(function (r) { (r.res.refs || []).forEach(function (f) { if (!refs.some(function (g) { return g.key === f.key && g.row === f.row; })) { refs.push(f); } }); });
    if (!okOnes.length) { return { text: '—', cls: 'g-none', refs: refs }; }
    function short(s) { return (SHORT[key] && SHORT[key][s.key]) || (s.key === 'tercihYuksek' ? 'Tercih/yüksek' : s.title); }
    var keys = okOnes.map(function (r) { return r.res.sonuc.key; });
    if (okOnes.length === results.length && keys.every(function (k) { return k === keys[0]; })) {
      return { text: short(okOnes[0].res.sonuc), cls: 'g-' + okOnes[0].res.sonuc.tone, refs: refs };
    }
    return { text: results.map(function (r) { return r.label + ': ' + (r.res.status === 'ok' ? short(r.res.sonuc) : '—'); }).join(' · '), cls: 'g-mixed', refs: refs };
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
          if (c.refs.length) {
            td.appendChild(el('button', { type: 'button', text: c.text, title: c.refs.map(function (f) { return SOURCES[f.key].short + ', satır ' + f.row; }).join('; '), onclick: function () {
              highlightRefs(c.refs);
              showSources(c.refs.map(function (f) { return f.key; }).concat([key]));
              var det = $('#table-' + key); if (det.setListView) { det.setListView(); }
              showRow(c.refs[0].key, c.refs[0].row);
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

  // keys: gösterilecek tablolar; 'all' hepsi; null/[] hiçbiri
  function showSources(keys) {
    var all = keys === 'all';
    var list = all ? SOURCE_ORDER : (keys || []);
    SOURCE_ORDER.forEach(function (k) { $('#table-' + k).hidden = list.indexOf(k) === -1; });
    $('#sources').classList.toggle('all', all);
  }

  function highlightRefs(refs) {
    SOURCE_ORDER.forEach(function (k) {
      var rows = (refs || []).filter(function (f) { return f.key === k; }).map(function (f) { return f.row; });
      $all('#table-' + k + ' tr[data-row]').forEach(function (tr) { tr.classList.toggle('hit', rows.indexOf(Number(tr.getAttribute('data-row'))) !== -1); });
    });
  }

  function showRow(key, rowNo) {
    var details = $('#table-' + key);
    details.hidden = false;
    details.open = true;
    var tr = $('#' + key + '-row-' + rowNo);
    if (tr) { tr.hidden = false; tr.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  }

  function uniqRefs(refs) {
    var out = [];
    (refs || []).forEach(function (f) { if (!out.some(function (g) { return g.key === f.key && g.row === f.row; })) { out.push(f); } });
    return out;
  }

  // "Tablo-9 (s.145–147), satır 13; Tablo-8, satır 3"
  function refLinks(refs) {
    refs = uniqRefs(refs);
    var parts = [], keys = [];
    refs.forEach(function (f) { if (keys.indexOf(f.key) === -1) { keys.push(f.key); } });
    keys.forEach(function (k, ki) {
      if (ki > 0) { parts.push('; '); }
      parts.push(sourceLabel(k) + ', ');
      var rows = refs.filter(function (f) { return f.key === k; });
      rows.forEach(function (f, i) {
        if (i > 0) { parts.push(i === rows.length - 1 ? ' ve ' : ', '); }
        parts.push(el('button', { type: 'button', class: 'link', text: 'satır ' + f.row, onclick: function () { showRow(f.key, f.row); } }));
      });
    });
    return parts;
  }

  function refText(refs) {
    refs = uniqRefs(refs);
    var keys = [];
    refs.forEach(function (f) { if (keys.indexOf(f.key) === -1) { keys.push(f.key); } });
    return keys.map(function (k) { return sourceLabel(k) + ', satır ' + refs.filter(function (f) { return f.key === k; }).map(function (f) { return f.row; }).join(', '); }).join('; ');
  }

  // Dayanak satır(lar)ını başlık–değer kartı olarak gösteren açılır blok
  function refCard(refs) {
    refs = uniqRefs(refs);
    var expert = document.body.getAttribute('data-mode') === 'expert';
    var det = el('details', { class: 'rowcard' }, [el('summary', { text: refs.length > 1 ? 'Tablodaki satırları göster' : 'Tablodaki satırı göster' })]);
    if (expert) {
      det.open = store('sgk-basis') !== 'kapali';
      det.addEventListener('toggle', function () { store('sgk-basis', det.open ? 'acik' : 'kapali'); });
    }
    refs.forEach(function (f) {
      var r = sourceRow(f.key, f.row);
      if (!r) { return; }
      var src = SOURCES[f.key];
      var dl = el('dl', { class: 'rowdl' });
      dl.appendChild(el('div', { class: 'rowhead', text: src.short + ' · satır ' + f.row }));
      src.header.forEach(function (h, i) {
        dl.appendChild(el('div', { class: i === src.header.length - 1 ? 'last' : '' }, [el('dt', { text: h }), el('dd', { text: r.cells[i] || '—' })]));
      });
      det.appendChild(dl);
    });
    det.appendChild(el('p', { class: 'src' }, [el('button', { type: 'button', class: 'link', text: 'Tablonun tamamında göster', onclick: function () { showRow(refs[0].key, refs[0].row); } })]));
    return det;
  }

  // İlgili hükümler (kaynak metinden)
  function noteList(keys, open) {
    keys = (keys || []).filter(function (k, i, a) { return G.NOTES[k] && a.indexOf(k) === i; });
    if (!keys.length) { return null; }
    var det = el('details', { class: 'notes' }, [el('summary', { text: 'İlgili hükümler (' + keys.length + ')' })]);
    if (open) { det.open = true; }
    det.appendChild(el('ul', null, keys.map(function (k) {
      return el('li', null, [G.NOTES[k].text + ' ', el('span', { class: 'note-page', text: '(s.' + G.NOTES[k].sayfa + ')' })]);
    })));
    return det;
  }

  function metaText() {
    var m = EXCEL.meta || {};
    var t = (m.cikarimTarihi || '').split('-');
    var tarih = t.length === 3 ? t[2] + '.' + t[1] + '.' + t[0] : '';
    return 'Kaynak: ' + G.KAYNAK.yazar + ', "' + G.KAYNAK.baslik + '", ' + G.KAYNAK.yayin + (m.sha256 ? ' · tablo sürümü ' + m.sha256 : '') + (tarih ? ' · ' + tarih : '');
  }

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
    if (expert) { setTab(currentTab); }
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
    $('#panel-form').hidden = !isFormTab(key);
    if (isFormTab(key)) {
      showSources(null);
      if (window.SGK_WIZARD) { window.SGK_WIZARD.renderForm(FORM_TABS[key], $('#panel-form')); }
    } else {
      showSources([key]);
      runAll();
    }
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

  /* ---------- Kurum ve marka ---------- */

  function brandNode() {
    var node = $('.top .brand').cloneNode(true);
    node.className = 'p-brand';
    $all('[id]', node).forEach(function (n) { n.removeAttribute('id'); });
    return node;
  }

  // Kurum adı ve logosu js/config.js içinde tanımlıysa gösterilir
  function initKurum() {
    var cfg = window.SGK_CONFIG || {};
    if (cfg.kurumAdi) {
      var ad = $('#kurum-adi');
      ad.textContent = cfg.kurumAdi;
      ad.hidden = false;
      document.title = (cfg.uygulamaAdi || 'Çift Aylık Sorgusu') + ' – ' + cfg.kurumAdi;
    }
    if (cfg.kurumLogo) {
      var box = $('#kurum');
      box.appendChild(el('img', { src: cfg.kurumLogo, alt: cfg.kurumAdi || 'Kurum logosu' }));
      box.hidden = false;
    }
  }

  /* ---------- Yazdırma özeti ve metin ---------- */

  var lastSummary = null;

  function todayText() {
    try { return new Date().toLocaleDateString('tr-TR'); } catch (e) { return ''; }
  }

  // summary: { title, facts: [[etiket, değer]], cards: [{label, title, plain, tone, checks, variants}], refs, notes }
  function setPrintSummary(summary) {
    lastSummary = summary;
    var box = $('#print-summary');
    box.innerHTML = '';
    if (!summary) { return; }

    box.appendChild(el('header', { class: 'p-head' }, [
      brandNode(),
      el('div', { class: 'p-meta' }, [el('div', { text: 'Sonuç özeti' }), el('div', { text: todayText() })])
    ]));
    box.appendChild(el('h1', { class: 'p-title', text: summary.title }));

    (summary.cards || []).forEach(function (c, i) {
      var sec = el('section', { class: 'p-result tone-' + (c.tone || 'none') + (i > 0 ? ' p-alt' : '') }, [
        el('div', { class: 'p-label', text: c.label || 'Sonuç' }),
        el('p', { class: 'p-answer', text: c.title })
      ]);
      if (c.plain) { sec.appendChild(el('p', { class: 'p-plain', text: c.plain })); }
      if (c.variants) {
        sec.appendChild(el('ul', { class: 'p-list' }, c.variants.map(function (v) { return el('li', { text: v.label + ': ' + v.title + (v.refs && v.refs.length ? ' (' + refText(v.refs) + ')' : '') }); })));
      }
      if (c.checks && c.checks.length) {
        sec.appendChild(el('ul', { class: 'p-checks' }, c.checks.map(function (x) {
          return el('li', { class: x.ok ? 'ok' : 'no' }, [el('b', { text: x.ok ? 'Sağlanıyor' : 'Sağlanmıyor' }), ' ' + x.text]);
        })));
      }
      box.appendChild(sec);
    });

    box.appendChild(el('h2', { class: 'p-h2', text: 'Verilen bilgiler' }));
    box.appendChild(el('table', { class: 'p-facts' }, [el('tbody', null, summary.facts.map(function (f) {
      return el('tr', null, [el('th', { scope: 'row', text: f[0] }), el('td', { text: f[1] })]);
    }))]));

    uniqRefs(summary.refs).forEach(function (f) {
      var r = sourceRow(f.key, f.row);
      if (!r) { return; }
      var src = SOURCES[f.key];
      box.appendChild(el('h2', { class: 'p-h2', text: 'Dayanak' }));
      box.appendChild(el('p', { class: 'p-sub', text: src.short + ' · ' + src.title + ' (s.' + src.sayfa + '), satır ' + f.row }));
      box.appendChild(el('table', { class: 'p-row' }, [el('tbody', null, src.header.map(function (h, i) {
        return el('tr', { class: i === src.header.length - 1 ? 'last' : '' }, [el('th', { scope: 'row', text: h }), el('td', { text: r.cells[i] || '' })]);
      }))]));
    });

    var notes = (summary.notes || []).filter(function (k, i, a) { return G.NOTES[k] && a.indexOf(k) === i; });
    if (notes.length) {
      box.appendChild(el('h2', { class: 'p-h2', text: 'İlgili hükümler' }));
      box.appendChild(el('ul', { class: 'p-notes' }, notes.map(function (k) { return el('li', { text: G.NOTES[k].text + ' (s.' + G.NOTES[k].sayfa + ')' }); })));
    }

    box.appendChild(el('footer', { class: 'p-foot' }, [
      el('p', { text: TEXTS.NONE.printNote }),
      el('p', { text: metaText() })
    ]));
  }

  function summaryText() {
    if (!lastSummary) { return ''; }
    var s = lastSummary;
    var lines = ['Çift Aylık Sorgusu – ' + s.title + ' · ' + todayText(), ''];
    s.facts.forEach(function (f) { lines.push(f[0] + ': ' + f[1]); });
    (s.cards || []).forEach(function (c) {
      lines.push('', (c.label || 'Sonuç') + ': ' + c.title);
      if (c.plain) { lines.push(c.plain); }
      (c.variants || []).forEach(function (v) { lines.push('  ' + v.label + ': ' + v.title + (v.refs && v.refs.length ? ' (' + refText(v.refs) + ')' : '')); });
      (c.checks || []).forEach(function (x) { lines.push('  [' + (x.ok ? 'Sağlanıyor' : 'Sağlanmıyor') + '] ' + x.text); });
    });
    var refs = uniqRefs(s.refs);
    if (refs.length) {
      lines.push('', 'Dayanak: ' + refText(refs));
      refs.forEach(function (f) {
        var r = sourceRow(f.key, f.row);
        if (r) { SOURCES[f.key].header.forEach(function (h, i) { lines.push('  ' + h + ': ' + (r.cells[i] || '')); }); }
      });
    }
    lines.push('', metaText());
    return lines.join('\n');
  }

  function fallbackCopy(text, done) {
    var ta = el('textarea', { style: 'position:fixed;left:-9999px;top:0', 'aria-hidden': 'true' });
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { /* yok say */ }
    document.body.removeChild(ta);
  }

  function copyText(text, btn, okText) {
    var done = function () { var old = btn.textContent; btn.textContent = okText; setTimeout(function () { btn.textContent = old; }, 1600); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
    } else { fallbackCopy(text, done); }
  }

  function copySummary(btn) { copyText(summaryText(), btn, 'Kopyalandı'); }

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
      for (var i = 0; i < voices.length; i++) { if (/^tr/i.test(voices[i].lang)) { u.voice = voices[i]; break; } }
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
      g.items.forEach(function (s) { parent.appendChild(el('option', { value: s.code, text: s.tarih ? s.label + ' · ' + s.tarih : s.label })); });
      if (g.name) { select.appendChild(parent); }
    });
  }

  function fillRadios(container, name, options) {
    options.forEach(function (o) {
      var id = name + '-' + o.code;
      container.appendChild(el('label', { 'for': id }, [el('input', { type: 'radio', name: name, id: id, value: o.code }), ' ' + o.label]));
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
    if (isFormTab(key)) { return '#' + key; }
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
    return { key: TABS.indexOf(key) !== -1 || isFormTab(key) ? key : null, params: params };
  }

  function syncHash(key) {
    if (document.body.getAttribute('data-mode') !== 'expert') { return; }
    try { history.replaceState(null, '', hashFor(key)); } catch (e) { /* yok say */ }
  }

  function copyLink(url, btn) { copyText(url, btn, 'Bağlantı kopyalandı'); }

  function actionsRow(items) {
    var row = el('div', { class: 'actions' });
    items.forEach(function (b) { if (b) { row.appendChild(b); } });
    return row;
  }

  // res: { status, sonuc, refs, candidates, reason, sonuclar }
  function renderAnswer(key, res, facts) {
    var box = $('#result-' + key);
    box.innerHTML = '';
    var refs = res.refs || [];
    var card = null;

    if (res.status === 'ok') {
      box.appendChild(el('p', { class: 'verdict tone-' + res.sonuc.tone, text: res.sonuc.title }));
      box.appendChild(el('p', { class: 'src' }, ['Dayanak: '].concat(refLinks(refs))));
      box.appendChild(refCard(refs));
      var nl = noteList(res.notes);
      if (nl) { box.appendChild(nl); }
      card = { label: 'Sonuç', title: res.sonuc.title, tone: res.sonuc.tone };
    } else if (res.status === 'none') {
      box.appendChild(el('p', { class: 'verdict tone-none', text: HUKUM.S.yok.title }));
      if (res.reason) { box.appendChild(el('p', { class: 'src', text: res.reason })); }
      if (res.candidates && res.candidates.length) { box.appendChild(el('p', { class: 'src' }, ['Koşulları farklı yakın satır: '].concat(refLinks(res.candidates)))); }
      card = { label: 'Sonuç', title: HUKUM.S.yok.title, tone: 'none', plain: res.reason || '' };
    } else if (res.status === 'conflict') {
      box.appendChild(el('p', { class: 'verdict tone-warn', text: (res.sonuclar || []).map(function (s) { return s.title; }).join(' / ') }));
      box.appendChild(el('p', { class: 'src' }, ['Tabloda farklı sonuç veren satırlar var: '].concat(refLinks(refs))));
    }

    if (card && key === currentTab) {
      setPrintSummary({ title: TEXTS.TITLES[key], facts: facts, cards: [card], refs: refs, notes: res.notes || [] });
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
    if (key === currentTab) { highlightRefs(refs); syncHash(key); }
  }

  function engineRefs(key, res) {
    return { status: res.status, sonuc: res.sonuc, sonuclar: res.sonuclar, reason: res.reason,
      refs: (res.rows || []).map(function (r) { return { key: key, row: r.row }; }),
      candidates: (res.candidates || []).map(function (r) { return { key: key, row: r.row }; }) };
  }

  function runEs() {
    var st = state.esAnneBaba;
    var res = HUKUM.esAb2017Sonrasi(st);
    $('#es-once-field').hidden = !res.needsOnce;
    if (res.status === 'needs') { res = { status: 'incomplete' }; }
    var facts = [['Ölen eş', selectedText('#es-es')], ['Ölen anne veya baba', selectedText('#es-ab')]];
    if ($('#es-once-field').hidden === false) { facts.push(['1.10.2008 öncesi aylık', st.once === 'evet' ? 'Evet' : st.once === 'hayir' ? 'Hayır' : '']); }
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
    renderAnswer('anneBaba', engineRefs('anneBaba', res), facts);
  }

  function runDul() {
    var res = engineRefs('dulEs', ENGINE.evalDulEs(state.dulEs));
    res.notes = ['dn16', 'dn17', 'gelirAylik'];
    renderAnswer('dulEs', res, [['Ölen ilk eş', selectedText('#dul-ilk')], ['Ölen ikinci eş', selectedText('#dul-ikinci')]]);
  }

  function runAll() { runEs(); runAb(); runDul(); }

  function initForms() {
    var es = state.esAnneBaba;
    fillSelect($('#es-es'), RULES.esAnneBaba.status);
    fillSelect($('#es-ab'), RULES.esAnneBaba.status);
    $('#es-es').addEventListener('change', function (ev) { es.es = ev.target.value || null; runEs(); });
    $('#es-ab').addEventListener('change', function (ev) { es.ab = ev.target.value || null; runEs(); });
    $all('input[name="es-once"]').forEach(function (r) { r.addEventListener('change', function () { es.once = radioValue('es-once'); runEs(); }); });

    var ab = state.anneBaba;
    fillSelect($('#ab-baba'), RULES.anneBaba.status);
    fillSelect($('#ab-anne'), RULES.anneBaba.status);
    fillRadios($('#ab-tarih-choices'), 'ab-tarih', RULES.anneBaba.tarih);
    fillRadios($('#ab-donem-choices'), 'ab-donem', RULES.anneBaba.donem);
    $('#ab-baba').addEventListener('change', function (ev) { ab.baba = ev.target.value || null; runAb(); });
    $('#ab-anne').addEventListener('change', function (ev) { ab.anne = ev.target.value || null; runAb(); });
    $all('input[name="ab-tarih"]').forEach(function (r) { r.addEventListener('change', function () { ab.tarih = radioValue('ab-tarih'); runAb(); }); });
    $all('input[name="ab-donem"]').forEach(function (r) { r.addEventListener('change', function () { ab.donem = radioValue('ab-donem'); runAb(); }); });

    var dul = state.dulEs;
    fillSelect($('#dul-ilk'), RULES.dulEs.status);
    fillSelect($('#dul-ikinci'), RULES.dulEs.status);
    $('#dul-ilk').addEventListener('change', function (ev) { dul.ilk = ev.target.value || null; runDul(); });
    $('#dul-ikinci').addEventListener('change', function (ev) { dul.ikinci = ev.target.value || null; runDul(); });

    applyHashParams();
  }

  // Bağlantıyla gelen sorguyu formlara yazar
  function applyHashParams() {
    var parsed = parseHash();
    if (!parsed.key || isFormTab(parsed.key)) { return; }
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
        if (Array.prototype.some.call(sel.options, function (o) { return o.value === p[k]; })) { sel.value = p[k]; st[k] = p[k]; }
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
    canPrint: canPrint,
    speech: speech,
    SOURCES: SOURCES,
    showSources: showSources,
    highlightRefs: highlightRefs,
    refLinks: refLinks,
    refText: refText,
    refCard: refCard,
    noteList: noteList,
    copyLink: copyLink,
    setPrintSummary: setPrintSummary,
    copySummary: copySummary,
    print: function () { if (canPrint) { window.print(); } },
    refreshTab: function () { setTab(currentTab); }
  };

  initKurum();
  buildSources();
  initSize();
  initForms();
  initTabs();
  initMode();
  initServiceWorker();

  var savedMode = store('sgk-mode');
  setMode(savedMode === 'expert' || parseHash().key ? 'expert' : 'wizard');
})();
