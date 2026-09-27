// Adım adım modun mantığı (DOM'suz): hangi sorunun sırada olduğu, cevaplardan
// motor girdisinin türetilmesi ve sonucun hesaplanması. js/wizard.js yalnızca
// görünümü çizer; tests/wizard-steps.test.js bu dosyayı Node'da doğrular.
(function (root) {
  'use strict';

  var RULES = root.SGK_RULES || (typeof require === 'function' ? require('./rules.js') : null);
  var ENGINE = root.SGK_ENGINE || (typeof require === 'function' ? require('./engine.js') : null);
  var DERIVE = root.SGK_DERIVE || (typeof require === 'function' ? require('./derive.js') : null);
  if (!RULES || !ENGINE || !DERIVE) { throw new Error('SGK_RULES / SGK_ENGINE / SGK_DERIVE yüklenmemiş'); }

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

  var BILMIYORUM = { code: 'bilmiyorum', label: 'Bilmiyorum', desc: 'İki olasılığın cevabı birlikte gösterilir.' };
  var YESNO = [{ code: 'evet', label: 'Evet' }, { code: 'hayir', label: 'Hayır' }, BILMIYORUM];
  var MEMUR = [{ code: 'once', label: '15 Ekim 2008\'den önce' }, { code: 'sonra', label: '15 Ekim 2008 veya sonrası' }];
  var DEVIR = [{ code: 'evet', label: 'Evet, SGK\'ya devredildi' }, { code: 'hayir', label: 'Hayır, devredilmedi' }];
  var DONEM = [{ code: 'once2017', label: '5 Aralık 2017\'den önce' }, { code: 'sonra2017', label: '5 Aralık 2017 veya sonrası' }, BILMIYORUM];

  var ONCE_STEP = { id: 'once', type: 'choice', q: 'Annenizden ya da babanızdan 1 Ekim 2008\'den önce aylık bağlanmış mıydı?', options: YESNO, help: 'Aylık sonradan kesilmiş olsa bile "Evet" seçin.' };
  var DONEM_STEP = { id: 'donem', type: 'choice', q: 'Aylık hangi dönemde bağlanıyor?', options: DONEM };

  // "Bilmiyorum" seçilince gösterilen iki olasılık (etiketler tablonun ifadesiyle)
  var VARIANTS = {
    once: [{ value: 'evet', label: 'Evet ise' }, { value: 'hayir', label: 'Hayır ise' }],
    donem: [{ value: 'once2017', label: '5.12.2017 tarihi öncesi ise' }, { value: 'sonra2017', label: '5.12.2017 tarihinden itibaren ise' }]
  };

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
    if (!which) { return { dual: false, res: baseEvaluate(modul, a), input: engineInput(modul, a, known(a.once), known(a.donem)) }; }
    return {
      dual: true,
      which: which,
      input: engineInput(modul, a, null, null),
      variants: VARIANTS[which].map(function (v) {
        var input = engineInput(modul, a, which === 'once' ? v.value : known(a.once), which === 'donem' ? v.value : known(a.donem));
        return { label: v.label, value: v.value, res: runEngine(modul, input) };
      })
    };
  }

  // Tüm soru listesi: kişiler sırayla, ardından gerekirse ortak soru
  function allSteps(modul, a) {
    var steps = [];
    var ps = PERSONS[modul];
    for (var i = 0; i < ps.length; i++) {
      steps = steps.concat(personSteps(modul, ps[i], a));
      if (!personDone(modul, ps[i], a)) { return steps; }
    }
    var res = baseEvaluate(modul, a);
    if (res.needsOnce) { steps.push(ONCE_STEP); }
    else if (res.needsDonem) { steps.push(DONEM_STEP); }
    return steps;
  }

  // Cevaplanmamış ilk sorunun sırası; hepsi cevaplıysa -1
  function currentIndex(steps, a) {
    for (var i = 0; i < steps.length; i++) { if (a[steps[i].id] == null) { return i; } }
    return -1;
  }

  var STEPS = {
    PERSONS: PERSONS,
    VARIANTS: VARIANTS,
    tarihOf: tarihOf,
    deriveInput: deriveInput,
    personSteps: personSteps,
    allSteps: allSteps,
    currentIndex: currentIndex,
    engineInput: engineInput,
    baseEvaluate: baseEvaluate,
    finalEvaluate: finalEvaluate,
    runEngine: runEngine
  };

  root.SGK_WIZARD_STEPS = STEPS;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = STEPS;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
