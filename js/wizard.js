// Adım adım mod: görünüm. Soru sırası ve hesaplama js/wizard-steps.js içindedir.
(function () {
  'use strict';

  var RULES = window.SGK_RULES;
  var ENGINE = window.SGK_ENGINE;
  var DERIVE = window.SGK_DERIVE;
  var STEPS = window.SGK_WIZARD_STEPS;
  var TEXTS = window.SGK_TEXTS;
  var UI = window.SGK_UI;
  var el = UI.el;

  var MODULES = [
    { key: 'esAnneBaba', title: 'Eşimden ve annemden ya da babamdan aylık', desc: 'Vefat eden eşimden ve vefat eden annemden ya da babamdan aylık hakkım var.' },
    { key: 'anneBaba', title: 'Annemden ve babamdan aylık', desc: 'Vefat eden annemden ve babamdan aylık hakkım var.' },
    { key: 'dulEs', title: 'İki eşimden aylık', desc: 'Vefat eden iki eşimden de aylık hakkım var.' }
  ];

  var thisYear = new Date().getFullYear();
  var state = { modul: null, answers: {} };
  var root = document.getElementById('wizard');

  function focusQuestion() {
    var q = root.querySelector('.question');
    if (q) { q.setAttribute('tabindex', '-1'); q.focus({ preventScroll: true }); }
    try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch (e) { /* yok say */ }
  }

  function render() {
    UI.speech.stop();
    root.innerHTML = '';
    if (!state.modul) { renderStart(); UI.showSource(null); focusQuestion(); return; }
    var a = state.answers;
    var steps = STEPS.allSteps(state.modul, a);
    var idx = STEPS.currentIndex(steps, a);
    if (idx === -1) { renderResult(steps); }
    else { renderStep(steps, idx); UI.showSource(null); }
    focusQuestion();
  }

  function renderStart() {
    root.appendChild(el('h1', { class: 'question', text: 'Hangi durumu sormak istiyorsunuz?' }));
    root.appendChild(el('p', { class: 'help', text: 'Size uyan seçeneğe dokunun. Birkaç kısa sorudan sonra cevabı göreceksiniz.' }));
    var list = el('div', { class: 'choices-big' });
    MODULES.forEach(function (m) {
      list.appendChild(el('button', { type: 'button', class: 'choice-big', onclick: function () { state.modul = m.key; state.answers = {}; render(); } }, [
        el('strong', { text: m.title }),
        el('span', { text: m.desc })
      ]));
    });
    root.appendChild(list);
  }

  function entryStep(inputAttrs, helpText, validate, errorText, step) {
    var a = state.answers;
    root.appendChild(el('p', { class: 'help', text: helpText }));
    var input = el('input', inputAttrs);
    var err = el('p', { class: 'error', hidden: true });
    var submit = function () {
      var v = validate(input.value);
      if (v == null) { err.textContent = errorText; err.hidden = false; input.focus(); return; }
      a[step.id] = v;
      render();
    };
    input.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); submit(); } });
    root.appendChild(el('div', { class: 'entry' }, [input, el('button', { type: 'button', class: 'btn', text: 'Devam et', onclick: submit })]));
    root.appendChild(err);
  }

  function renderStep(steps, idx) {
    var step = steps[idx];
    var a = state.answers;
    root.appendChild(el('p', { class: 'progress', text: 'Soru ' + (idx + 1) }));
    root.appendChild(el('h1', { class: 'question', text: step.q }));
    if (step.help) { root.appendChild(el('p', { class: 'help', text: step.help })); }

    if (step.type === 'choice') {
      var list = el('div', { class: 'choices-big' });
      step.options.forEach(function (o) {
        list.appendChild(el('button', { type: 'button', class: 'choice-big', onclick: function () { a[step.id] = o.code; render(); } }, [
          el('strong', { text: o.label }),
          o.desc ? el('span', { text: o.desc }) : null
        ]));
      });
      root.appendChild(list);
    } else if (step.type === 'year') {
      entryStep(
        { type: 'number', id: 'wiz-year', inputmode: 'numeric', min: '1900', max: String(thisYear), placeholder: 'örneğin 2012', 'aria-label': 'Vefat yılı' },
        'Sadece yılı yazmanız yeterli.',
        function (v) { var n = parseInt(v, 10); return n >= 1900 && n <= thisYear ? n : null; },
        'Lütfen dört haneli bir yıl yazın (örneğin 2012).',
        step
      );
    } else if (step.type === 'date') {
      entryStep(
        { type: 'date', id: 'wiz-date', min: '2008-01-01', max: '2008-12-31', 'aria-label': 'Vefat tarihi' },
        'Gün, ay ve yıl olarak seçin.',
        function (v) { return DERIVE.validDate(v) && v >= '2008-01-01' && v <= '2008-12-31' ? v : null; },
        'Lütfen 2008 yılı içinde bir tarih seçin.',
        step
      );
    }

    root.appendChild(el('div', { class: 'nav' }, [
      el('button', { type: 'button', class: 'btn quiet', text: '← Geri', onclick: function () { goBack(steps, idx); } })
    ]));
  }

  function goBack(steps, idx) {
    if (idx <= 0) { state.modul = null; state.answers = {}; render(); return; }
    var a = state.answers;
    for (var i = idx - 1; i < steps.length; i++) { delete a[steps[i].id]; }
    render();
  }

  // Bir kişinin cevaplarını (ve ortak soruları) silip o kişinin ilk sorusuna döner
  function changePerson(prefix) {
    var a = state.answers;
    Object.keys(a).forEach(function (k) { if (k.indexOf(prefix + '.') === 0) { delete a[k]; } });
    delete a.once; delete a.donem;
    render();
  }

  function formatDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    return m ? m[3] + '.' + m[2] + '.' + m[1] : '';
  }

  function personFact(modul, p, a) {
    var kurum = DERIVE.KURUMLAR.filter(function (k) { return k.code === a[p.prefix + '.kurum']; })[0];
    var code = DERIVE.derive(modul, STEPS.deriveInput(p.prefix, a)).code;
    var st = ENGINE.findStatus(RULES[modul].status, code);
    var parts = [kurum ? kurum.label : ''];
    if (a[p.prefix + '.devir']) { parts.push(a[p.prefix + '.devir'] === 'evet' ? 'SGK\'ya devredilmiş' : 'devredilmemiş'); }
    if (a[p.prefix + '.yil']) { parts.push('vefat ' + (a[p.prefix + '.yil'] === 2008 ? formatDate(a[p.prefix + '.gun']) : a[p.prefix + '.yil'])); }
    if (a[p.prefix + '.memur']) { parts.push(a[p.prefix + '.memur'] === 'once' ? 'memurluğa 15.10.2008\'den önce başlamış' : 'memurluğa 15.10.2008 veya sonrasında başlamış'); }
    return { label: p.ad, value: parts.join(', '), code: st ? st.label + (st.tarih ? ' · ' + st.tarih : '') : code, change: function () { changePerson(p.prefix); } };
  }

  function answerOf(res) {
    if (res.status === 'ok') { return { text: res.sonuc.title, tone: 'tone-' + res.sonuc.tone, plain: (TEXTS.PLAIN[state.modul] || {})[res.sonuc.key] || '' }; }
    if (res.status === 'conflict') { return { text: res.sonuclar.map(function (s) { return s.title; }).join(' / '), tone: 'tone-warn', plain: 'Kaynak tabloda bu durum için farklı sonuç veren satırlar var.' }; }
    return { text: TEXTS.NONE.title, tone: 'tone-none', plain: res.reason || '' };
  }

  function renderResult(steps) {
    var modul = state.modul;
    var a = state.answers;
    var out = STEPS.finalEvaluate(modul, a);

    var facts = STEPS.PERSONS[modul].map(function (p) { return personFact(modul, p, a); });
    if (a.once) {
      facts.push({ label: '1 Ekim 2008 öncesi aylık', value: a.once === 'evet' ? 'Evet' : a.once === 'hayir' ? 'Hayır' : 'Bilmiyorum', code: '', change: function () { delete a.once; render(); } });
    }
    if (a.donem) {
      facts.push({ label: 'Dönem', value: a.donem === 'once2017' ? '5.12.2017 tarihi öncesi' : a.donem === 'sonra2017' ? '5.12.2017 tarihinden itibaren' : 'Bilmiyorum', code: '', change: function () { delete a.donem; render(); } });
    }

    root.appendChild(el('h1', { class: 'question', text: 'Sonuç' }));
    var live = el('div', { role: 'status' });
    root.appendChild(live);

    var rows = [], speakText = '', printAnswer = '', printPlain = '';
    if (!out.dual) {
      var ans = answerOf(out.res);
      rows = out.res.rows || [];
      live.appendChild(el('p', { class: 'answer-big ' + ans.tone, text: ans.text }));
      if (ans.plain) { live.appendChild(el('p', { class: 'plain', text: ans.plain })); }
      speakText = ans.text + ' ' + ans.plain;
      printAnswer = ans.text; printPlain = ans.plain;
      if (rows.length) {
        root.appendChild(el('p', { class: 'src' }, ['Kaynak tablo, '].concat(UI.rowLinks(modul, rows))));
        root.appendChild(UI.rowCard(modul, rows));
        speakText += ' Kaynak tablo, satır ' + rows.map(function (r) { return r.row; }).join(' ve ') + '.';
      } else if (out.res.candidates && out.res.candidates.length) {
        root.appendChild(el('p', { class: 'src' }, ['Koşulları farklı yakın satır: '].concat(UI.rowLinks(modul, out.res.candidates))));
      }
    } else {
      live.appendChild(el('p', { class: 'answer-big tone-none', text: TEXTS.NONE.dual }));
      live.appendChild(el('p', { class: 'plain', text: TEXTS.NONE.dualHelp }));
      var list = el('div', { class: 'variants' });
      var parts = [];
      out.variants.forEach(function (v) {
        var vans = answerOf(v.res);
        var vrows = v.res.rows || [];
        vrows.forEach(function (r) { if (rows.indexOf(r) === -1) { rows.push(r); } });
        list.appendChild(el('div', { class: 'variant ' + vans.tone }, [
          el('p', { class: 'variant-label', text: v.label }),
          el('p', { class: 'variant-answer', text: vans.text }),
          vrows.length ? el('p', { class: 'src' }, ['Kaynak tablo, '].concat(UI.rowLinks(modul, vrows))) : null
        ]));
        parts.push(v.label + ': ' + vans.text + (vrows.length ? ' (satır ' + vrows.map(function (r) { return r.row; }).join(', ') + ')' : ''));
      });
      live.appendChild(list);
      speakText = TEXTS.NONE.dual + ' ' + parts.join('. ');
      printAnswer = TEXTS.NONE.dual; printPlain = parts.join(' · ');
      if (rows.length) { root.appendChild(UI.rowCard(modul, rows)); }
    }

    root.appendChild(el('ul', { class: 'facts' }, facts.map(function (f) {
      return el('li', null, [
        el('b', { text: f.label }),
        el('span', { class: 'fact-value' }, [f.value + ' ', f.code ? el('span', { class: 'fact-code', text: '(' + f.code + ')' }) : null]),
        el('button', { type: 'button', class: 'link', text: 'Değiştir', onclick: f.change })
      ]);
    })));

    var linkBtn = el('button', { type: 'button', class: 'link', text: 'Bağlantıyı kopyala' });
    linkBtn.addEventListener('click', function () { UI.copyLink(UI.linkFor(modul, out.input), linkBtn); });
    root.appendChild(el('p', { class: 'src' }, [linkBtn]));

    var actions = el('div', { class: 'actions' });
    if (UI.speech.supported) {
      var speakBtn = el('button', { type: 'button', class: 'btn secondary', text: 'Sesli oku', 'aria-pressed': 'false' });
      speakBtn.addEventListener('click', function () { UI.speech.speak(speakText, speakBtn); });
      actions.appendChild(speakBtn);
    }
    if (UI.canPrint) { actions.appendChild(el('button', { type: 'button', class: 'btn secondary', text: 'Yazdır', onclick: UI.print })); }
    actions.appendChild(el('button', { type: 'button', class: 'btn', text: 'Baştan başla', onclick: function () { state.modul = null; state.answers = {}; render(); } }));
    root.appendChild(actions);
    root.appendChild(el('div', { class: 'nav' }, [
      el('button', { type: 'button', class: 'btn quiet', text: '← Geri', onclick: function () { goBack(steps, steps.length); } })
    ]));

    UI.setPrintSummary({
      key: modul,
      facts: facts.map(function (f) { return [f.label, f.value + (f.code ? ' (' + f.code + ')' : '')]; }),
      answer: printAnswer,
      plain: printPlain,
      rows: rows
    });
    UI.showSource(modul);
    UI.highlightRows(modul, rows.map(function (r) { return r.row; }));
  }

  window.SGK_WIZARD = { render: render, reset: function () { state.modul = null; state.answers = {}; render(); } };
  if (document.body.getAttribute('data-mode') !== 'expert') { render(); }
})();
