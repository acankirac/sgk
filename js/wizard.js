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

  var BILMIYORUM = { code: 'bilmiyorum', label: 'Bilmiyorum', desc: 'İki olasılığın cevabını birlikte gösterelim.' };
  var YESNO = [{ code: 'evet', label: 'Evet' }, { code: 'hayir', label: 'Hayır' }, BILMIYORUM];
  var MEMUR = [{ code: 'once', label: '15 Ekim 2008\'den önce' }, { code: 'sonra', label: '15 Ekim 2008 veya sonrası' }];
  var DEVIR = [{ code: 'evet', label: 'Evet, SGK\'ya devredildi' }, { code: 'hayir', label: 'Hayır, devredilmedi' }];
  var DONEM = [{ code: 'once2017', label: '5 Aralık 2017\'den önce' }, { code: 'sonra2017', label: '5 Aralık 2017 veya sonrası' }, BILMIYORUM];

  // "Bilmiyorum" seçilince gösterilen iki olasılık
  var VARIANTS = {
    once: [{ value: 'evet', label: 'Önceden aylık bağlanmışsa (Evet)' }, { value: 'hayir', label: 'Önceden aylık bağlanmamışsa (Hayır)' }],
    donem: [{ value: 'once2017', label: 'Başvuru 5 Aralık 2017\'den önceyse' }, { value: 'sonra2017', label: 'Başvuru 5 Aralık 2017 veya sonrasıysa' }]
  };

  var thisYear = new Date().getFullYear();

  var state = { modul: null, answers: {} };

  /* ---------- Adım modeli ---------- */

  function tarihOf(prefix, a) {
    var yil = a[prefix + '.yil'];
    if (!yil) { return null; }
    if (yil === 2008) { return a[prefix + '.gun'] || null; }
    return String(yil) + '-07-01';
  }

  function deriveInput(prefix, a) {
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

    var probe = DERIVE.derive(modul, { kurum: kurum, tarih: null, memur: null, devir: deriveInput(p.prefix, a).devir });
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

    var r = DERIVE.derive(modul, deriveInput(p.prefix, a));
    if (r.needs === 'memur') {
      steps.push({ id: p.prefix + '.memur', type: 'choice', q: p.memurQ, options: MEMUR });
      if (!a[p.prefix + '.memur']) { return steps; }
    }
    return steps;
  }

  function personDone(modul, p, a) {
    return personSteps(modul, p, a).every(function (st) { return a[st.id] != null; });
  }

  function known(v) { return v && v !== 'bilmiyorum' ? v : null; }

  function engineInput(modul, a, once, donem) {
    var ps = PERSONS[modul];
    var c0 = DERIVE.derive(modul, deriveInput(ps[0].prefix, a)).code;
    var c1 = DERIVE.derive(modul, deriveInput(ps[1].prefix, a)).code;
    if (modul === 'esAnneBaba') { return { es: c0, ab: c1, once: once }; }
    if (modul === 'anneBaba') {
      return { baba: c0, anne: c1, tarih: DERIVE.tarihKategorisi(tarihOf('baba', a), tarihOf('anne', a)), donem: donem };
    }
    return { ilk: c0, ikinci: c1 };
  }

  function runEngine(modul, input) {
    if (modul === 'esAnneBaba') { return ENGINE.evalEsAnneBaba(input); }
    if (modul === 'anneBaba') { return ENGINE.evalAnneBaba(input); }
    return ENGINE.evalDulEs(input);
  }

  // Sorulacak soruları belirlemek için (Bilmiyorum = cevapsız sayılır)
  function baseEvaluate(modul, a) {
    return runEngine(modul, engineInput(modul, a, known(a.once), known(a.donem)));
  }

  // Sonuç için: Bilmiyorum seçildiyse iki olasılık birlikte döner
  function finalEvaluate(modul, a) {
    var which = a.once === 'bilmiyorum' ? 'once' : a.donem === 'bilmiyorum' ? 'donem' : null;
    if (!which) { return { dual: false, res: baseEvaluate(modul, a) }; }
    return {
      dual: true,
      which: which,
      variants: VARIANTS[which].map(function (v) {
        var input = engineInput(modul, a, which === 'once' ? v.value : known(a.once), which === 'donem' ? v.value : known(a.donem));
        return { label: v.label, res: runEngine(modul, input) };
      })
    };
  }

  function allSteps(modul, a) {
    var steps = [];
    var ps = PERSONS[modul];
    for (var i = 0; i < ps.length; i++) {
      steps = steps.concat(personSteps(modul, ps[i], a));
      if (!personDone(modul, ps[i], a)) { return steps; }
    }
    var res = baseEvaluate(modul, a);
    if (res.needsOnce) {
      steps.push({ id: 'once', type: 'choice', q: 'Annenizden ya da babanızdan 1 Ekim 2008\'den önce aylık bağlanmış mıydı?', options: YESNO, help: 'Aylık sonradan kesilmiş olsa bile "Evet" seçin.' });
    } else if (res.needsDonem) {
      steps.push({ id: 'donem', type: 'choice', q: 'Aylık için başvuru ne zaman yapıldı?', options: DONEM });
    }
    return steps;
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

  // Bir kişinin cevaplarını (ve sonraki ortak soruları) silip o kişinin ilk sorusuna döner
  function changePerson(prefix) {
    var a = state.answers;
    Object.keys(a).forEach(function (k) { if (k.indexOf(prefix + '.') === 0) { delete a[k]; } });
    delete a.once; delete a.donem;
    UI.speech.stop();
    render();
  }

  function formatDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    return m ? m[3] + '.' + m[2] + '.' + m[1] : '';
  }

  function personFact(modul, p, a) {
    var kurum = DERIVE.KURUMLAR.filter(function (k) { return k.code === a[p.prefix + '.kurum']; })[0];
    var code = DERIVE.derive(modul, deriveInput(p.prefix, a)).code;
    var st = ENGINE.findStatus(RULES[modul].status, code);
    var parts = [kurum ? kurum.label : ''];
    if (a[p.prefix + '.devir']) { parts.push(a[p.prefix + '.devir'] === 'evet' ? 'SGK\'ya devredilmiş' : 'devredilmemiş'); }
    if (a[p.prefix + '.yil']) { parts.push('vefat ' + (a[p.prefix + '.yil'] === 2008 ? formatDate(a[p.prefix + '.gun']) : a[p.prefix + '.yil'])); }
    if (a[p.prefix + '.memur']) { parts.push(a[p.prefix + '.memur'] === 'once' ? 'memurluğa 15.10.2008\'den önce başlamış' : 'memurluğa 15.10.2008 veya sonrasında başlamış'); }
    return { label: p.ad, value: parts.join(', '), code: st ? st.label + (st.tarih ? ' · ' + st.tarih : '') : code, change: function () { changePerson(p.prefix); } };
  }

  function answerOf(res) {
    if (res.status === 'ok') { return { text: res.sonuc.title, tone: 'tone-' + res.sonuc.tone, plain: (UI.PLAIN[state.modul] || {})[res.sonuc.key] || '' }; }
    if (res.status === 'conflict') { return { text: res.sonuclar.map(function (s) { return s.title; }).join(' / '), tone: 'tone-warn', plain: 'Kaynak tabloda bu durum için farklı sonuç veren satırlar var.' }; }
    return { text: 'Kaynak tabloda bu durum için satır yok.', tone: 'tone-none', plain: res.reason || 'Bu durum için tablo bir sonuç vermiyor. Lütfen aylık bağlayan kuruma başvurun.' };
  }

  function renderResult(steps) {
    var modul = state.modul;
    var a = state.answers;
    var out = finalEvaluate(modul, a);

    var facts = PERSONS[modul].map(function (p) { return personFact(modul, p, a); });
    if (a.once) {
      facts.push({ label: '1 Ekim 2008 öncesi aylık', value: a.once === 'evet' ? 'Evet' : a.once === 'hayir' ? 'Hayır' : 'Bilmiyorum', code: '', change: function () { delete a.once; render(); } });
    }
    if (a.donem) {
      facts.push({ label: 'Başvuru', value: a.donem === 'once2017' ? '5 Aralık 2017\'den önce' : a.donem === 'sonra2017' ? '5 Aralık 2017 veya sonrası' : 'Bilmiyorum', code: '', change: function () { delete a.donem; render(); } });
    }

    root.appendChild(el('h1', { class: 'question', text: 'Sonuç' }));

    var rows = [], speakText = '', printAnswer = '', printPlain = '';
    if (!out.dual) {
      var ans = answerOf(out.res);
      rows = out.res.rows || [];
      root.appendChild(el('p', { class: 'answer-big ' + ans.tone, text: ans.text }));
      if (ans.plain) { root.appendChild(el('p', { class: 'plain', text: ans.plain })); }
      speakText = ans.text + ' ' + ans.plain;
      printAnswer = ans.text; printPlain = ans.plain;
      if (rows.length) {
        root.appendChild(el('p', { class: 'src' }, ['Kaynak tablo, '].concat(UI.rowLinks(modul, rows))));
        root.appendChild(UI.rowCard(modul, rows));
      } else if (out.res.candidates && out.res.candidates.length) {
        root.appendChild(el('p', { class: 'src' }, ['Koşulları farklı yakın satır: '].concat(UI.rowLinks(modul, out.res.candidates))));
      }
    } else {
      root.appendChild(el('p', { class: 'answer-big tone-none', text: 'Cevap, bilmediğiniz bilgiye göre değişiyor.' }));
      root.appendChild(el('p', { class: 'plain', text: 'İki olasılığın cevabı aşağıda. Bu bilgiyi SGK kayıtlarından öğrenebilirsiniz.' }));
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
      root.appendChild(list);
      speakText = 'Cevap, bilmediğiniz bilgiye göre değişiyor. ' + parts.join('. ');
      printAnswer = 'Cevap, bilinmeyen bilgiye göre değişiyor.'; printPlain = parts.join(' · ');
      if (rows.length) { root.appendChild(UI.rowCard(modul, rows)); }
    }

    root.appendChild(el('ul', { class: 'facts' }, facts.map(function (f) {
      return el('li', null, [
        el('b', { text: f.label }),
        el('span', { class: 'fact-value' }, [f.value + ' ', f.code ? el('span', { class: 'fact-code', text: '(' + f.code + ')' }) : null]),
        el('button', { type: 'button', class: 'link', text: 'Değiştir', onclick: f.change })
      ]);
    })));

    var actions = el('div', { class: 'actions' });
    if (UI.speech.supported) {
      var speakBtn = el('button', { type: 'button', class: 'btn secondary', text: 'Sesli oku' });
      speakBtn.addEventListener('click', function () { UI.speech.speak(speakText, speakBtn); });
      actions.appendChild(speakBtn);
    }
    if (UI.canPrint) { actions.appendChild(el('button', { type: 'button', class: 'btn secondary', text: 'Yazdır', onclick: UI.print })); }
    actions.appendChild(el('button', { type: 'button', class: 'btn', text: 'Baştan başla', onclick: function () { UI.speech.stop(); state.modul = null; state.answers = {}; render(); } }));
    root.appendChild(actions);
    root.appendChild(el('div', { class: 'nav' }, [
      el('button', { type: 'button', class: 'btn quiet', text: '← Geri', onclick: function () { UI.speech.stop(); goBack(steps, steps.length); } })
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
