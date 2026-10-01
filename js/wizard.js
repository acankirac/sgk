// Adım adım mod: görünüm. Soru sırası ve hesaplama js/flows.js içindedir.
(function () {
  'use strict';

  var FLOWS = window.SGK_FLOWS;
  var RULES = window.SGK_RULES;
  var DERIVE = window.SGK_DERIVE;
  var UI = window.SGK_UI;
  var el = UI.el;

  var state = { flow: null, answers: {} };
  var root = document.getElementById('wizard');

  function focusQuestion() {
    var q = root.querySelector('.question');
    if (q) { q.setAttribute('tabindex', '-1'); q.focus({ preventScroll: true }); }
    try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch (e) { /* yok say */ }
  }

  function start(id) { state.flow = id ? FLOWS.byId(id) : null; state.answers = {}; render(); }

  function render() {
    UI.speech.stop();
    root.innerHTML = '';
    if (!state.flow) { renderStart(); UI.showSources(null); focusQuestion(); return; }
    var steps = state.flow.steps(state.answers);
    var idx = FLOWS.currentIndex(steps, state.answers);
    if (idx === -1) { renderResult(steps); }
    else { renderStep(steps, idx); UI.showSources(null); }
    focusQuestion();
  }

  /* ---------- Başlangıç ---------- */

  function renderStart() {
    root.appendChild(el('h1', { class: 'question', text: 'Hangi konuda bilgi almak istiyorsunuz?' }));
    root.appendChild(el('p', { class: 'help', text: 'Size uyan seçeneğe dokunun. Birkaç kısa sorudan sonra cevabı göreceksiniz.' }));
    FLOWS.GROUPS.forEach(function (g) {
      var list = el('div', { class: 'choices-big' });
      FLOWS.FLOWS.filter(function (f) { return f.group === g.id; }).forEach(function (f) {
        list.appendChild(el('button', { type: 'button', class: 'choice-big', onclick: function () { start(f.id); } }, [
          el('strong', { text: f.title }),
          el('span', { text: f.desc })
        ]));
      });
      root.appendChild(el('section', { class: 'group' }, [el('h2', { class: 'group-title', text: g.title }), list]));
    });
    var all = el('button', { type: 'button', class: 'link', text: 'Kaynak tabloların tamamını görüntüle', onclick: function () {
      UI.showSources('all');
      var s = document.getElementById('sources'); if (s) { s.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    } });
    root.appendChild(el('p', { class: 'src start-foot' }, [all]));
  }

  /* ---------- Soru ---------- */

  function entryStep(step, inputAttrs, helpText, validate, errorText) {
    var a = state.answers;
    if (helpText) { root.appendChild(el('p', { class: 'help', text: helpText })); }
    var input = el('input', inputAttrs);
    if (a[step.id] != null) { input.value = a[step.id]; }
    var err = el('p', { class: 'error', hidden: true });
    var submit = function () {
      var v = validate(input.value);
      if (v == null) { err.textContent = errorText; err.hidden = false; input.focus(); return; }
      a[step.id] = v;
      render();
    };
    input.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); submit(); } });
    var row = [input];
    if (step.unit) { row.push(el('span', { class: 'unit', text: step.unit })); }
    row.push(el('button', { type: 'button', class: 'btn', text: 'Devam et', onclick: submit }));
    root.appendChild(el('div', { class: 'entry' }, row));
    root.appendChild(err);
  }

  function renderStep(steps, idx) {
    var step = steps[idx];
    var a = state.answers;
    root.appendChild(el('p', { class: 'progress' }, [el('span', { class: 'flow-name', text: state.flow.baslik }), ' · Soru ' + (idx + 1)]));
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
      entryStep(step, { type: 'number', id: 'wiz-year', inputmode: 'numeric', min: '1900', max: String(FLOWS.THIS_YEAR), placeholder: 'örneğin 2012', 'aria-label': 'Vefat yılı' },
        'Sadece yılı yazmanız yeterli.',
        function (v) { var n = parseInt(v, 10); return n >= 1900 && n <= FLOWS.THIS_YEAR ? n : null; },
        'Lütfen dört haneli bir yıl yazın (örneğin 2012).');
    } else if (step.type === 'date') {
      var y = String(step.year);
      entryStep(step, { type: 'date', id: 'wiz-date', min: y + '-01-01', max: y + '-12-31', 'aria-label': 'Vefat tarihi' },
        'Bu yıl içinde sonucu değiştiren bir tarih olduğu için gün de gerekiyor.',
        function (v) { return DERIVE.validDate(v) && v.slice(0, 4) === y ? v : null; },
        'Lütfen ' + y + ' yılı içinde bir tarih seçin.');
    } else if (step.type === 'number') {
      entryStep(step, { type: 'number', id: 'wiz-number', inputmode: 'numeric', min: String(step.min || 0), max: String(step.max || 99999), 'aria-label': step.q },
        '',
        function (v) { var n = parseInt(v, 10); return isFinite(n) && n >= (step.min || 0) && n <= (step.max || 99999) ? n : null; },
        'Lütfen ' + (step.min || 0) + ' ile ' + (step.max || 99999) + ' arasında bir sayı yazın.');
    }

    root.appendChild(el('div', { class: 'nav' }, [
      el('button', { type: 'button', class: 'btn quiet', text: '← Geri', onclick: function () { goBack(steps, idx); } })
    ]));
  }

  // Seçilen adımdan itibaren tüm cevapları siler
  function resetFrom(steps, idx) {
    for (var i = Math.max(0, idx); i < steps.length; i++) { delete state.answers[steps[i].id]; }
  }

  function goBack(steps, idx) {
    if (idx <= 0) { start(null); return; }
    resetFrom(steps, idx - 1);
    render();
  }

  /* ---------- Sonuç ---------- */

  function formatDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    return m ? m[3] + '.' + m[2] + '.' + m[1] : '';
  }

  function personFact(prefix, steps) {
    var a = state.answers;
    var st = steps.filter(function (s) { return s.person === prefix; })[0];
    var who = st.q.replace(/ nerede çalışıyordu\?$/, '');
    var kurum = DERIVE.KURUMLAR.filter(function (k) { return k.code === a[prefix + '.kurum']; })[0];
    var parts = [kurum ? kurum.label : ''];
    if (a[prefix + '.devir']) { parts.push(a[prefix + '.devir'] === 'evet' ? 'SGK’ya devredilmiş' : 'devredilmemiş'); }
    if (a[prefix + '.yil']) {
      var t = FLOWS.tarihOf(prefix, a);
      parts.push('vefat ' + (a[prefix + '.gun'] && t === a[prefix + '.gun'] ? formatDate(t) : a[prefix + '.yil']));
    }
    if (a[prefix + '.memur']) { parts.push(a[prefix + '.memur'] === 'once' ? 'memurluğa 15.10.2008’den önce başlamış' : 'memurluğa 15.10.2008 veya sonrasında başlamış'); }
    var code = DERIVE.statu(FLOWS.personInput(prefix, a)).code;
    return { label: who.replace(/^Vefat eden /, '').replace(/^./, function (c) { return c.toLocaleUpperCase('tr'); }), value: parts.join(', '), code: code ? DERIVE.STATU_ADLARI[code] : '' };
  }

  function checkList(checks) {
    return el('ul', { class: 'checks' }, checks.map(function (x) {
      return el('li', { class: x.ok ? 'ok' : 'no' }, [el('span', { class: 'mark-ok', text: x.ok ? 'Sağlanıyor' : 'Sağlanmıyor' }), ' ' + x.text]);
    }));
  }

  function renderCard(card, main) {
    var box = el('section', { class: main ? 'card-main' : 'card-alt tone-' + (card.tone || 'none') });
    box.appendChild(el('p', { class: 'card-label', text: card.label }));
    box.appendChild(el('p', { class: main ? 'answer-big tone-' + (card.tone || 'none') : 'alt-answer', text: card.title }));
    if (card.plain) { box.appendChild(el('p', { class: main ? 'plain' : 'alt-plain', text: card.plain })); }
    if (card.variants) {
      var list = el('div', { class: 'variants' });
      card.variants.forEach(function (v) {
        list.appendChild(el('div', { class: 'variant tone-' + (v.tone || 'none') }, [
          el('p', { class: 'variant-label', text: v.label }),
          el('p', { class: 'variant-answer', text: v.title }),
          v.refs && v.refs.length ? el('p', { class: 'src' }, ['Dayanak: '].concat(UI.refLinks(v.refs))) : null
        ]));
      });
      box.appendChild(list);
    }
    if (card.checks && card.checks.length) { box.appendChild(checkList(card.checks)); }
    if (card.refs && card.refs.length) {
      box.appendChild(el('p', { class: 'src' }, ['Dayanak: '].concat(UI.refLinks(card.refs))));
      if (main) { box.appendChild(UI.refCard(card.refs)); }
    } else if (card.near && card.near.length) {
      box.appendChild(el('p', { class: 'src' }, ['Koşulları farklı yakın satır: '].concat(UI.refLinks(card.near))));
    }
    if (card.link) {
      box.appendChild(el('p', { class: 'src' }, [el('button', { type: 'button', class: 'link', text: FLOWS.byId(card.link).title + ' sorgusuna geç', onclick: function () { start(card.link); } })]));
    }
    return box;
  }

  function renderResult(steps) {
    var flow = state.flow;
    var a = state.answers;
    var out = flow.evaluate(a);
    var facts = FLOWS.facts(flow, a).map(function (f) {
      if (f.person) {
        var p = personFact(f.person, steps);
        return { label: p.label, value: p.value, code: p.code, index: f.index };
      }
      return { label: f.label, value: f.value, index: f.index };
    });

    root.appendChild(el('p', { class: 'progress' }, [el('span', { class: 'flow-name', text: flow.baslik })]));
    root.appendChild(el('h1', { class: 'question', text: 'Sonuç' }));

    var live = el('div', { role: 'status' });
    out.cards.forEach(function (c, i) { live.appendChild(renderCard(c, i === 0)); });
    root.appendChild(live);

    root.appendChild(el('ul', { class: 'facts' }, facts.map(function (f) {
      return el('li', null, [
        el('b', { text: f.label }),
        el('span', { class: 'fact-value' }, [f.value + ' ', f.code ? el('span', { class: 'fact-code', text: '(' + f.code + ')' }) : null]),
        el('button', { type: 'button', class: 'link', text: 'Değiştir', onclick: function () { resetFrom(steps, f.index); render(); } })
      ]);
    })));

    var notes = [];
    out.cards.forEach(function (c) { notes = notes.concat(c.notes || []); (c.variants || []).forEach(function (v) { notes = notes.concat(v.notes || []); }); });
    notes = notes.concat(out.notes || []);
    var nl = UI.noteList(notes);
    if (nl) { root.appendChild(nl); }

    var speakText = out.cards.map(function (c) {
      var s = (c.label ? c.label + '. ' : '') + c.title + ' ' + (c.plain || '');
      (c.variants || []).forEach(function (v) { s += ' ' + v.label + ': ' + v.title; });
      (c.checks || []).forEach(function (x) { s += ' ' + x.text + ': ' + (x.ok ? 'sağlanıyor.' : 'sağlanmıyor.'); });
      return s;
    }).join(' ');

    var actions = el('div', { class: 'actions' });
    if (UI.speech.supported) {
      var speakBtn = el('button', { type: 'button', class: 'btn secondary', text: 'Sesli oku', 'aria-pressed': 'false' });
      speakBtn.addEventListener('click', function () { UI.speech.speak(speakText, speakBtn); });
      actions.appendChild(speakBtn);
    }
    if (UI.canPrint) { actions.appendChild(el('button', { type: 'button', class: 'btn secondary', text: 'Yazdır', onclick: UI.print })); }
    var copyBtn = el('button', { type: 'button', class: 'btn secondary', text: 'Kopyala' });
    copyBtn.addEventListener('click', function () { UI.copySummary(copyBtn); });
    actions.appendChild(copyBtn);
    actions.appendChild(el('button', { type: 'button', class: 'btn', text: 'Yeni sorgu', onclick: function () { start(null); } }));
    root.appendChild(actions);
    root.appendChild(el('div', { class: 'nav' }, [
      el('button', { type: 'button', class: 'btn quiet', text: '← Geri', onclick: function () { goBack(steps, steps.length); } })
    ]));

    var refs = [];
    out.cards.forEach(function (c) { refs = refs.concat(c.refs || []); (c.variants || []).forEach(function (v) { refs = refs.concat(v.refs || []); }); });
    UI.setPrintSummary({
      title: flow.baslik,
      facts: facts.map(function (f) { return [f.label, f.value + (f.code ? ' (' + f.code + ')' : '')]; }),
      cards: out.cards,
      refs: refs,
      notes: notes
    });
    var keys = refs.map(function (f) { return f.key; });
    UI.showSources(keys);
    UI.highlightRefs(refs);
  }

  window.SGK_WIZARD = { render: render, start: start };
  if (document.body.getAttribute('data-mode') !== 'expert') { render(); }
})();
