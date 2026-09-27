// Adım adım mod: her ekranda tek soru, büyük seçenekler, sonunda tek cevap.
// Statü, kurum + vefat yılı (2008 ise gün) bilgisinden js/derive.js ile türetilir.
(function () {
  'use strict';

  var RULES = window.SGK_RULES;
  var ENGINE = window.SGK_ENGINE;
  var DERIVE = window.SGK_DERIVE;
  var UI = window.SGK_UI;
  var el = UI.el;

  var MODULES = [
    { key: 'esAnneBaba', title: 'Eşimden ve annemden ya da babamdan aylık', desc: 'Vefat eden eşimden ve vefat eden annemden ya da babamdan aylık hakkım var.' },
    { key: 'anneBaba', title: 'Annemden ve babamdan aylık', desc: 'Vefat eden annemden ve babamdan aylık hakkım var.' },
    { key: 'dulEs', title: 'İki eşimden aylık', desc: 'Vefat eden iki eşimden de aylık hakkım var.' }
  ];

  // ad: sonuç listesindeki kısa ad; adIn: soru cümlesindeki özne; adGen: -in hali
  function person(prefix, ad, adIn, adGen) {
    return {
      prefix: prefix,
      ad: ad,
      kurumQ: adIn + ' nerede çalışıyordu?',
      yilQ: adIn + ' hangi yıl vefat etti?',
      gunQ: adIn + ' 2008 yılında hangi gün vefat etti?',
      memurQ: adIn + ' memurluğa ilk kez ne zaman başladı?',
      devirQ: adGen + ' bağlı olduğu sandık SGK\'ya devredildi mi?'
    };
  }

  var PERSONS = {
    esAnneBaba: [
      person('es', 'Eşiniz', 'Eşiniz', 'Eşinizin'),
      person('ab', 'Anneniz / babanız', 'Vefat eden anneniz ya da babanız', 'Vefat eden annenizin ya da babanızın')
    ],
    anneBaba: [person('baba', 'Babanız', 'Babanız', 'Babanızın'), person('anne', 'Anneniz', 'Anneniz', 'Annenizin')],
    dulEs: [person('ilk', 'İlk eşiniz', 'İlk eşiniz', 'İlk eşinizin'), person('ikinci', 'İkinci eşiniz', 'İkinci eşiniz', 'İkinci eşinizin')]
  };

  var YESNO = [{ code: 'evet', label: 'Evet' }, { code: 'hayir', label: 'Hayır' }];
  var MEMUR = [{ code: 'once', label: '15 Ekim 2008\'den önce' }, { code: 'sonra', label: '15 Ekim 2008 veya sonrası' }];
  var DEVIR = [{ code: 'evet', label: 'Evet, SGK\'ya devredildi' }, { code: 'hayir', label: 'Hayır, devredilmedi' }];
  var DONEM = [{ code: 'once2017', label: '5 Aralık 2017\'den önce' }, { code: 'sonra2017', label: '5 Aralık 2017 veya sonrası' }];

  var thisYear = new Date().getFullYear();

  var state = { modul: null, answers: {} };

  /* ---------- Adım modeli ---------- */

  function tarihOf(prefix, a) {
    var yil = a[prefix + '.yil'];
    if (!yil) { return null; }
    if (yil === 2008) { return a[prefix + '.gun'] || null; }
    return String(yil) + '-07-01';
  }

  function deriveInput(modul, prefix, a) {
    var devir = a[prefix + '.devir'];
    return {
      kurum: a[prefix + '.kurum'] || null,
      tarih: tarihOf(prefix, a),
      memur: a[prefix + '.memur'] || null,
      devir: devir === 'evet' ? true : devir === 'hayir' ? false : null
    };
  }

  // Bir kişi için soru listesi; cevaplanmamış ilk soruda durur.
  function personSteps(modul, p, a) {
    var steps = [];
    var kurumOptions = DERIVE.kurumlar(modul).map(function (k) { return { code: k.code, label: k.label, desc: k.aciklama }; });
    steps.push({ id: p.prefix + '.kurum', type: 'choice', q: p.kurumQ, options: kurumOptions });
    var kurum = a[p.prefix + '.kurum'];
    if (!kurum) { return steps; }

    if (kurum === 'banka' && modul !== 'dulEs') {
      steps.push({ id: p.prefix + '.devir', type: 'choice', q: p.devirQ, options: DEVIR });
      if (!a[p.prefix + '.devir']) { return steps; }
    }

    var probe = DERIVE.derive(modul, deriveInput(modul, p.prefix, Object.assign({}, a, tarihless(p.prefix, a))));
    var needTarih = modul === 'anneBaba' || probe.needs === 'tarih';
    if (needTarih) {
      steps.push({ id: p.prefix + '.yil', type: 'year', q: p.yilQ });
      var yil = a[p.prefix + '.yil'];
      if (!yil) { return steps; }
      if (yil === 2008) {
        steps.push({ id: p.prefix + '.gun', type: 'date', q: p.gunQ });
        if (!a[p.prefix + '.gun']) { return steps; }
      }
    }

    var r = DERIVE.derive(modul, deriveInput(modul, p.prefix, a));
    if (r.needs === 'memur') {
      steps.push({ id: p.prefix + '.memur', type: 'choice', q: p.memurQ, options: MEMUR });
      if (!a[p.prefix + '.memur']) { return steps; }
    }
    return steps;
  }

  // Tarih cevaplarını yok sayan kopya (tarih gerekip gerekmediğini sormak için)
  function tarihless(prefix, a) {
    var o = {};
    o[prefix + '.yil'] = undefined;
    o[prefix + '.gun'] = undefined;
    return o;
  }

  function personDone(modul, p, a) {
    var s = personSteps(modul, p, a);
    return s.every(function (st) { return a[st.id] != null; });
  }

  function engineInput(modul, a) {
    var ps = PERSONS[modul];
    var c0 = DERIVE.derive(modul, deriveInput(modul, ps[0].prefix, a)).code;
    var c1 = DERIVE.derive(modul, deriveInput(modul, ps[1].prefix, a)).code;
    if (modul === 'esAnneBaba') { return { es: c0, ab: c1, once: a.once || null }; }
    if (modul === 'anneBaba') {
      return { baba: c0, anne: c1, tarih: DERIVE.tarihKategorisi(tarihOf('baba', a), tarihOf('anne', a)), donem: a.donem || null };
    }
    return { ilk: c0, ikinci: c1 };
  }

  function allSteps(modul, a) {
    var steps = [];
    var ps = PERSONS[modul];
    for (var i = 0; i < ps.length; i++) {
      steps = steps.concat(personSteps(modul, ps[i], a));
      if (!personDone(modul, ps[i], a)) { return steps; }
    }
    var res = evaluate(modul, a);
    if (res.status === 'needsOnce') {
      steps.push({ id: 'once', type: 'choice', q: 'Annenizden ya da babanızdan 1 Ekim 2008\'den önce aylık bağlanmış mıydı?', options: YESNO, help: 'Aylık sonradan kesilmiş olsa bile "Evet" seçin.' });
    } else if (res.status === 'needsDonem') {
      steps.push({ id: 'donem', type: 'choice', q: 'Aylık için başvuru ne zaman yapıldı?', options: DONEM });
    }
    return steps;
  }

  function evaluate(modul, a) {
    var input = engineInput(modul, a);
    if (modul === 'esAnneBaba') { return ENGINE.evalEsAnneBaba(input); }
    if (modul === 'anneBaba') { return ENGINE.evalAnneBaba(input); }
    return ENGINE.evalDulEs(input);
  }

  /* ---------- Görünüm ---------- */

  var root = document.getElementById('wizard');

  function focusQuestion() {
    var q = root.querySelector('.question');
    if (q) { q.setAttribute('tabindex', '-1'); q.focus({ preventScroll: true }); }
    try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch (e) { /* yok say */ }
  }

  function render() {
    root.innerHTML = '';
    if (!state.modul) { renderStart(); UI.showSource(null); focusQuestion(); return; }
    var a = state.answers;
    var steps = allSteps(state.modul, a);
    var idx = -1;
    for (var i = 0; i < steps.length; i++) { if (a[steps[i].id] == null) { idx = i; break; } }
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
      root.appendChild(el('p', { class: 'help', text: 'Sadece yılı yazmanız yeterli.' }));
      var yInput = el('input', { type: 'number', id: 'wiz-year', inputmode: 'numeric', min: '1900', max: String(thisYear), placeholder: 'örneğin 2012', 'aria-label': 'Vefat yılı' });
      var yErr = el('p', { class: 'error', hidden: true });
      var submitYear = function () {
        var v = parseInt(yInput.value, 10);
        if (!(v >= 1900 && v <= thisYear)) { yErr.textContent = 'Lütfen dört haneli bir yıl yazın (örneğin 2012).'; yErr.hidden = false; yInput.focus(); return; }
        a[step.id] = v;
        render();
      };
      yInput.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); submitYear(); } });
      root.appendChild(el('div', { class: 'entry' }, [yInput, el('button', { type: 'button', class: 'btn', text: 'Devam et', onclick: submitYear })]));
      root.appendChild(yErr);
    } else if (step.type === 'date') {
      root.appendChild(el('p', { class: 'help', text: 'Gün, ay ve yıl olarak seçin.' }));
      var dInput = el('input', { type: 'date', id: 'wiz-date', min: '2008-01-01', max: '2008-12-31', 'aria-label': 'Vefat tarihi' });
      var dErr = el('p', { class: 'error', hidden: true });
      var submitDate = function () {
        var v = dInput.value;
        if (!DERIVE.validDate(v) || v < '2008-01-01' || v > '2008-12-31') { dErr.textContent = 'Lütfen 2008 yılı içinde bir tarih seçin.'; dErr.hidden = false; dInput.focus(); return; }
        a[step.id] = v;
        render();
      };
      dInput.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); submitDate(); } });
      root.appendChild(el('div', { class: 'entry' }, [dInput, el('button', { type: 'button', class: 'btn', text: 'Devam et', onclick: submitDate })]));
      root.appendChild(dErr);
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

  function formatDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    return m ? m[3] + '.' + m[2] + '.' + m[1] : '';
  }

  function personFact(modul, p, a) {
    var kurum = DERIVE.KURUMLAR.filter(function (k) { return k.code === a[p.prefix + '.kurum']; })[0];
    var code = DERIVE.derive(modul, deriveInput(modul, p.prefix, a)).code;
    var st = ENGINE.findStatus(RULES[modul].status, code);
    var parts = [kurum ? kurum.label : ''];
    if (a[p.prefix + '.devir']) { parts.push(a[p.prefix + '.devir'] === 'evet' ? 'SGK\'ya devredilmiş' : 'devredilmemiş'); }
    if (a[p.prefix + '.yil']) { parts.push('vefat ' + (a[p.prefix + '.yil'] === 2008 ? formatDate(a[p.prefix + '.gun']) : a[p.prefix + '.yil'])); }
    if (a[p.prefix + '.memur']) { parts.push(a[p.prefix + '.memur'] === 'once' ? 'memurluğa 15.10.2008\'den önce başlamış' : 'memurluğa 15.10.2008 veya sonrasında başlamış'); }
    return [p.ad, parts.join(', '), st ? st.label + (st.tarih ? ' · ' + st.tarih : '') : code];
  }

  function renderResult(steps) {
    var modul = state.modul;
    var a = state.answers;
    var res = evaluate(modul, a);
    var facts = PERSONS[modul].map(function (p) { return personFact(modul, p, a); });
    if (a.once) { facts.push(['1 Ekim 2008 öncesi aylık', a.once === 'evet' ? 'Evet' : 'Hayır', '']); }
    if (a.donem) { facts.push(['Başvuru', a.donem === 'once2017' ? '5 Aralık 2017\'den önce' : '5 Aralık 2017 veya sonrası', '']); }

    var answer, plain, tone, rows = res.rows || [];
    if (res.status === 'ok') {
      answer = res.sonuc.title;
      plain = (UI.PLAIN[modul] || {})[res.sonuc.key] || '';
      tone = 'tone-' + res.sonuc.tone;
    } else if (res.status === 'conflict') {
      answer = res.sonuclar.map(function (s) { return s.title; }).join(' / ');
      plain = 'Kaynak tabloda bu durum için farklı sonuç veren satırlar var.';
      tone = 'tone-warn';
    } else {
      answer = 'Kaynak tabloda bu durum için satır yok.';
      plain = res.reason || 'Bu durum için tablo bir sonuç vermiyor. Lütfen aylık bağlayan kuruma başvurun.';
      tone = 'tone-none';
    }

    root.appendChild(el('h1', { class: 'question', text: 'Sonuç' }));
    root.appendChild(el('p', { class: 'answer-big ' + tone, text: answer }));
    if (plain) { root.appendChild(el('p', { class: 'plain', text: plain })); }

    root.appendChild(el('ul', { class: 'facts' }, facts.map(function (f) {
      return el('li', null, [el('b', { text: f[0] }), f[1] + (f[2] ? ' ' : ''), f[2] ? el('span', { text: '(' + f[2] + ')' }) : null]);
    })));

    if (rows.length) {
      root.appendChild(el('p', { class: 'src' }, ['Kaynak tablo, '].concat(UI.rowLinks(modul, rows))));
    } else if (res.candidates && res.candidates.length) {
      root.appendChild(el('p', { class: 'src' }, ['Koşulları farklı yakın satır: '].concat(UI.rowLinks(modul, res.candidates))));
    }

    var speakBtn = null;
    if (UI.speech.supported) {
      speakBtn = el('button', { type: 'button', class: 'btn secondary', text: 'Sesli oku' });
      speakBtn.addEventListener('click', function () { UI.speech.speak(answer + ' ' + plain, speakBtn); });
    }
    var actions = el('div', { class: 'actions' });
    if (speakBtn) { actions.appendChild(speakBtn); }
    if (UI.canPrint) { actions.appendChild(el('button', { type: 'button', class: 'btn secondary', text: 'Yazdır', onclick: UI.print })); }
    actions.appendChild(el('button', { type: 'button', class: 'btn', text: 'Baştan başla', onclick: function () { UI.speech.stop(); state.modul = null; state.answers = {}; render(); } }));
    root.appendChild(actions);
    root.appendChild(el('div', { class: 'nav' }, [
      el('button', { type: 'button', class: 'btn quiet', text: '← Geri', onclick: function () { UI.speech.stop(); goBack(steps, steps.length); } })
    ]));

    UI.setPrintSummary({
      key: modul,
      facts: facts.map(function (f) { return [f[0], f[1] + (f[2] ? ' (' + f[2] + ')' : '')]; }),
      answer: answer,
      plain: plain,
      rows: rows
    });
    UI.showSource(modul);
    UI.highlightRows(modul, rows.map(function (r) { return r.row; }));
  }

  window.SGK_WIZARD = { render: render, reset: function () { state.modul = null; state.answers = {}; render(); } };
  if (document.body.getAttribute('data-mode') !== 'expert') { render(); }
})();
