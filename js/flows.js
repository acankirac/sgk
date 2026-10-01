// Modüllerin soru akışları ve sonuç hesabı (DOM'suz).
// Her akış: steps(a) -> sıradaki cevapsız soruya kadar soru listesi,
//           evaluate(a) -> { cards, notes } (tüm sorular cevaplandığında).
// js/wizard.js akışları çizer; tests/flows.test.js bu dosyayı Node'da doğrular.
(function (root) {
  'use strict';

  var req = typeof require === 'function' ? require : null;
  var RULES = root.SGK_RULES || (req && req('./rules.js'));
  var ENGINE = root.SGK_ENGINE || (req && req('./engine.js'));
  var DERIVE = root.SGK_DERIVE || (req && req('./derive.js'));
  var HUKUM = root.SGK_HUKUM || (req && req('./hukum.js'));
  var TEXTS = root.SGK_TEXTS || (req && req('./texts.js'));

  var E2008 = ['2008-10-01', '2008-10-15'];
  var EBK = E2008.concat(['1972-10-01', '2000-10-04', '2001-08-08', '2003-08-02']);
  var THIS_YEAR = new Date().getFullYear();

  /* ---------------- ortak seçenekler ---------------- */

  var EH = [{ code: 'evet', label: 'Evet' }, { code: 'hayir', label: 'Hayır' }];
  var BILMIYORUM = { code: 'bilmiyorum', label: 'Bilmiyorum', desc: 'İki olasılığın cevabı birlikte gösterilir.' };
  var BASVURU = [
    { code: 'sonra2017', label: '5 Aralık 2017 veya sonrası', desc: 'Bugün yapılacak başvurular da bu gruptadır.' },
    { code: 'once2017', label: '5 Aralık 2017’den önce' }
  ];
  var DONEM2016 = [
    { code: 'once', label: '1 Ekim 2016’dan önceki dönem' },
    { code: 'sonra', label: '1 Ekim 2016 – 4 Aralık 2017 arası' }
  ];

  function yesNo(v) { return v === 'evet' ? true : v === 'hayir' ? false : null; }
  function known(v) { return v && v !== 'bilmiyorum' ? v : null; }

  /* ---------------- adım dizisi ---------------- */

  function Seq(a) { this.a = a; this.list = []; this.stop = false; }
  // Soru eklenir; cevaplıysa true döner (devam), değilse dizi burada durur.
  Seq.prototype.add = function (step) {
    if (this.stop) { return false; }
    this.list.push(step);
    if (this.a[step.id] == null) { this.stop = true; return false; }
    return true;
  };

  function person(prefix, ad, adIn, adGen) {
    return { prefix: prefix, ad: ad, adIn: adIn, adGen: adGen };
  }

  function tarihOf(prefix, a) {
    var yil = a[prefix + '.yil'];
    if (!yil) { return null; }
    var gun = a[prefix + '.gun'];
    if (gun && Number(gun.slice(0, 4)) === yil) { return gun; }
    return String(yil) + '-07-01';
  }

  function personInput(prefix, a) {
    var d = a[prefix + '.devir'];
    var kurum = a[prefix + '.kurum'] || null;
    // Devir sorusu sorulmayan modüllerde banka sandığının aktif/devir ayrımı sonucu değiştirmez.
    var devir = d === 'evet' ? true : d === 'hayir' ? false : (kurum === 'banka' && d == null ? false : null);
    return { kurum: kurum, tarih: tarihOf(prefix, a), memur: a[prefix + '.memur'] || null, devir: devir };
  }

  // opt: { kurumlar: [kod], devir: bool, yil: function(kurum) -> bool, esikler: [iso] }
  Seq.prototype.person = function (p, opt) {
    var a = this.a;
    var kurumlar = DERIVE.KURUMLAR.filter(function (k) { return !opt.kurumlar || opt.kurumlar.indexOf(k.code) !== -1; });
    if (!this.add({ id: p.prefix + '.kurum', type: 'choice', person: p.prefix, q: p.adIn + ' nerede çalışıyordu?', options: kurumlar.map(function (k) { return { code: k.code, label: k.label, desc: k.aciklama }; }) })) { return false; }
    var kurum = a[p.prefix + '.kurum'];
    if (kurum === 'banka' && opt.devir) {
      if (!this.add({ id: p.prefix + '.devir', type: 'choice', person: p.prefix, q: p.adGen + ' bağlı olduğu sandık SGK’ya devredildi mi?', options: [{ code: 'evet', label: 'Evet, SGK’ya devredildi' }, { code: 'hayir', label: 'Hayır, devredilmedi' }] })) { return false; }
    }
    var yilGerek = kurum === 'emekli' || opt.yil(kurum, a);
    if (yilGerek) {
      if (!this.add({ id: p.prefix + '.yil', type: 'year', person: p.prefix, q: p.adIn + ' hangi yıl vefat etti?' })) { return false; }
      var yil = a[p.prefix + '.yil'];
      var esikler = (opt.esikler || E2008).filter(function (d) { return esikIlgili(d, kurum); });
      if (esikler.some(function (d) { return Number(d.slice(0, 4)) === yil; })) {
        if (!this.add({ id: p.prefix + '.gun', type: 'date', person: p.prefix, year: yil, q: p.adIn + ' ' + yil + ' yılında hangi gün vefat etti?' })) { return false; }
      }
    }
    if (kurum === 'emekli') {
      var t = tarihOf(p.prefix, a);
      if (t && t >= DERIVE.ESIK_4C) {
        if (!this.add({ id: p.prefix + '.memur', type: 'choice', person: p.prefix, q: p.adIn + ' memurluğa ilk kez ne zaman başladı?', options: [{ code: 'once', label: '15 Ekim 2008’den önce' }, { code: 'sonra', label: '15 Ekim 2008 veya sonrası' }] })) { return false; }
      }
    }
    return true;
  };

  // Eşik tarihi bu kurum için sonucu etkiler mi?
  function esikIlgili(d, kurum) {
    if (d === '2008-10-01') { return true; }
    if (d === '2008-10-15') { return kurum === 'emekli'; }
    if (d === '1999-09-08') { return kurum === 'tarimssk'; }
    if (d === '2003-08-06') { return kurum === 'ssk'; }
    return kurum === 'bagkur' || kurum === 'tarimbagkur';
  }

  function always() { return true; }
  function datedOnly(kurum) { return kurum !== 'tarimssk' && kurum !== 'banka'; }

  /* ---------------- sonuç kartları ---------------- */

  function cardFrom(label, res, plainMap, extra) {
    var c = { label: label, refs: res.refs || [], notes: res.notes || [] };
    if (res.status === 'ok') {
      c.title = res.sonuc.title; c.tone = res.sonuc.tone; c.key = res.sonuc.key;
      c.plain = res.sonuc.plain || (plainMap && plainMap[res.sonuc.key]) || '';
      if (res.checks) { c.checks = res.checks; }
    } else if (res.status === 'conflict') {
      c.title = 'Kaynak tabloda farklı sonuç veren satırlar var.'; c.tone = 'warn';
    } else {
      c.title = HUKUM.S.yok.title; c.tone = 'none'; c.key = 'yok'; c.plain = res.reason || (res.sonuc && res.sonuc.plain) || '';
      c.near = res.candidates || [];
    }
    return Object.assign(c, extra || {});
  }

  function excelRefs(key, rows) { return (rows || []).map(function (r) { return { key: key, row: r.row }; }); }

  /* ================================================================== */
  /* 1) Eşten ve anne-babadan                                            */
  /* ================================================================== */

  var ES_P = [
    person('es', 'Eşiniz', 'Eşiniz', 'Eşinizin'),
    person('ab', 'Anneniz / babanız', 'Vefat eden anneniz ya da babanız', 'Vefat eden annenizin ya da babanızın')
  ];

  function esInputs(a) {
    var es = personInput('es', a), ab = personInput('ab', a);
    return {
      excelEs: DERIVE.derive('esAnneBaba', es).code, excelAb: DERIVE.derive('esAnneBaba', ab).code,
      es: DERIVE.statu(es).code, ab: DERIVE.statu(ab).code, esTarih: es.tarih, abTarih: ab.tarih
    };
  }

  function esRegime(a, once) {
    var x = esInputs(a);
    if (a.basvuru === 'once2017') {
      return HUKUM.esAb2017Oncesi({ es: x.es, esTarih: x.esTarih, ab: x.ab, abTarih: x.abTarih, donem2016: a.donem2016 || null, gelirAlti: yesNo(a.gelirAlti) });
    }
    return HUKUM.esAb2017Sonrasi({ es: x.excelEs, ab: x.excelAb, once: once });
  }

  var esAnneBaba = {
    id: 'esAnneBaba', group: 'iki',
    title: 'Eşimden ve annemden ya da babamdan aylık',
    desc: 'Vefat eden eşimden ve vefat eden annemden ya da babamdan aylık hakkım var.',
    baslik: 'Eşten ve anne-babadan aylık',
    steps: function (a) {
      var s = new Seq(a);
      if (!s.add({ id: 'basvuru', type: 'choice', fact: 'Başvuru', q: 'Aylık başvurusu ne zaman yapıldı ya da yapılacak?', options: BASVURU })) { return s.list; }
      var esik = a.basvuru === 'once2017' ? EBK : E2008;
      for (var i = 0; i < ES_P.length; i++) {
        if (!s.person(ES_P[i], { devir: true, yil: always, esikler: esik })) { return s.list; }
      }
      if (a.basvuru === 'once2017') {
        var r = esRegime(a);
        if (r.needs && r.needs.indexOf('donem2016') !== -1 || a.donem2016) {
          if (!s.add({ id: 'donem2016', type: 'choice', fact: 'Değerlendirme dönemi', q: 'Aylık hangi dönem için değerlendiriliyor?', options: DONEM2016 })) { return s.list; }
        }
        r = esRegime(a);
        if ((r.needs && r.needs.indexOf('gelirAlti') !== -1) || a.gelirAlti) {
          s.add({ id: 'gelirAlti', type: 'choice', fact: 'Toplam gelir brüt asgari ücretin altında', q: 'Eşinizden aldığınız aylık dahil toplam geliriniz brüt asgari ücretin altında mı?', options: EH });
        }
      } else {
        var r2 = esRegime(a, known(a.once));
        if (r2.needsOnce) {
          s.add({ id: 'once', type: 'choice', fact: '1 Ekim 2008 öncesi aylık', q: 'Annenizden ya da babanızdan 1 Ekim 2008’den önce aylık bağlanmış mıydı?', help: 'Aylık sonradan kesilmiş olsa bile "Evet" seçin.', options: EH.concat([BILMIYORUM]) });
        }
      }
      return s.list;
    },
    evaluate: function (a) {
      var x = esInputs(a);
      var cards = [];
      var plain = TEXTS.PLAIN.esAnneBaba;
      if (a.basvuru === 'once2017') {
        cards.push(cardFrom('SGK uygulaması · 5.12.2017 öncesi', esRegime(a), plain));
      } else if (a.once === 'bilmiyorum') {
        var v = ['evet', 'hayir'].map(function (o) {
          var r = esRegime(a, o);
          return cardFrom(o === 'evet' ? 'Evet ise' : 'Hayır ise', r, plain);
        });
        cards.push({ label: 'SGK uygulaması · 5.12.2017 sonrası', title: TEXTS.NONE.dual, tone: 'none', plain: TEXTS.NONE.dualHelp, variants: v, refs: [] });
      } else {
        cards.push(cardFrom('SGK uygulaması · 5.12.2017 sonrası', esRegime(a, known(a.once)), plain));
      }
      cards.push(cardFrom('Yargıtay görüşü', HUKUM.yargitayEsAb({ es: x.es, esTarih: x.esTarih, ab: x.ab, abTarih: x.abTarih }), plain, { alt: true }));
      return { cards: cards, notes: ['ilke4'] };
    }
  };

  /* ================================================================== */
  /* 2) Anne ve babadan (Tablo-6)                                        */
  /* ================================================================== */

  var AB_P = [person('baba', 'Babanız', 'Babanız', 'Babanızın'), person('anne', 'Anneniz', 'Anneniz', 'Annenizin')];

  function abInput(a) {
    var b = personInput('baba', a), n = personInput('anne', a);
    return { baba: DERIVE.derive('anneBaba', b).code, anne: DERIVE.derive('anneBaba', n).code, tarih: DERIVE.tarihKategorisi(b.tarih, n.tarih) };
  }

  var anneBaba = {
    id: 'anneBaba', group: 'iki',
    title: 'Annemden ve babamdan aylık',
    desc: 'Vefat eden annemden ve babamdan aylık hakkım var.',
    baslik: 'Anne ve babadan aylık',
    steps: function (a) {
      var s = new Seq(a);
      if (!s.add({ id: 'tur', type: 'choice', fact: 'Durum', q: 'Kimden aylık hakkınız var?', options: [
        { code: 'annebaba', label: 'Annemden ve babamdan' },
        { code: 'evlatlik', label: 'Biyolojik ve evlat edinen babamdan', desc: 'Ya da biyolojik ve evlat edinen annemden' }
      ] })) { return s.list; }
      if (a.tur === 'evlatlik') { return s.list; }
      for (var i = 0; i < AB_P.length; i++) {
        if (!s.person(AB_P[i], { kurumlar: ['ssk', 'bagkur', 'emekli', 'tarimssk', 'tarimbagkur'], yil: always, esikler: E2008 })) { return s.list; }
      }
      var input = abInput(a);
      input.donem = known(a.donem);
      if (ENGINE.evalAnneBaba(input).needsDonem) {
        s.add({ id: 'donem', type: 'choice', fact: 'Dönem', q: 'Aylık hangi dönemde bağlanıyor?', options: [{ code: 'once2017', label: '5 Aralık 2017’den önce' }, { code: 'sonra2017', label: '5 Aralık 2017 veya sonrası' }, BILMIYORUM] });
      }
      return s.list;
    },
    evaluate: function (a) {
      if (a.tur === 'evlatlik') {
        return { cards: [{ label: 'Sonuç', title: 'İki tam aylık bağlanır.', tone: 'good', plain: 'Biyolojik ve evlat edinen ebeveynden iki aylıkla sınırlı olarak aylık bağlanır; iki aylık da tam ödenir.', refs: [], notes: ['evlatlik'] }], notes: [] };
      }
      var input = abInput(a);
      var plain = TEXTS.PLAIN.anneBaba;
      function one(donem, label) {
        var r = ENGINE.evalAnneBaba(Object.assign({}, input, { donem: donem }));
        var res = { status: r.status, sonuc: r.sonuc, refs: excelRefs('anneBaba', r.rows), candidates: excelRefs('anneBaba', r.candidates), reason: r.reason, notes: [] };
        if (r.sonuc && r.sonuc.key === 'ikiTam' && (input.baba === 'ES' || input.anne === 'ES')) { res.notes.push('es5434'); }
        if (r.sonuc && r.sonuc.key === 'yuksekOlan') { res.notes.push('dn29'); }
        if (input.tarih === 'ikisi' && input.baba === 'B' && input.anne === 'B') { res.notes.push('dn28'); }
        return cardFrom(label, res, plain);
      }
      if (a.donem === 'bilmiyorum') {
        return { cards: [{ label: 'Sonuç', title: TEXTS.NONE.dual, tone: 'none', plain: TEXTS.NONE.dualHelp, refs: [], variants: [one('once2017', '5.12.2017 tarihi öncesi ise'), one('sonra2017', '5.12.2017 tarihinden itibaren ise')] }], notes: [] };
      }
      return { cards: [one(known(a.donem), 'Sonuç')], notes: [] };
    }
  };

  /* ================================================================== */
  /* 3) İki eşten (Tablo-2)                                              */
  /* ================================================================== */

  var DUL_P = [person('ilk', 'İlk eşiniz', 'İlk eşiniz', 'İlk eşinizin'), person('ikinci', 'İkinci eşiniz', 'İkinci eşiniz', 'İkinci eşinizin')];

  var dulEs = {
    id: 'dulEs', group: 'iki',
    title: 'İki eşimden aylık',
    desc: 'Vefat eden iki eşimden de aylık hakkım var.',
    baslik: 'İki eşten aylık',
    steps: function (a) {
      var s = new Seq(a);
      for (var i = 0; i < DUL_P.length; i++) {
        if (!s.person(DUL_P[i], { yil: datedOnly, esikler: E2008 })) { return s.list; }
      }
      return s.list;
    },
    evaluate: function (a) {
      var r = ENGINE.evalDulEs({ ilk: DERIVE.derive('dulEs', personInput('ilk', a)).code, ikinci: DERIVE.derive('dulEs', personInput('ikinci', a)).code });
      var res = { status: r.status, sonuc: r.sonuc, refs: excelRefs('dulEs', r.rows), reason: r.reason, notes: ['dn16', 'dn17', 'gelirAylik'] };
      return { cards: [cardFrom('Sonuç', res, TEXTS.PLAIN.dulEs)], notes: ['evlenme'] };
    }
  };

  /* ================================================================== */
  /* Koşul soruları (kız çocuğu ve anne)                                 */
  /* ================================================================== */

  var KOSUL_SORU = {
    evli: { q: 'Şu anda evli misiniz?', help: 'Hiç evlenmemiş, boşanmış veya eşi vefat etmiş iseniz "Hayır" seçin.', fact: 'Evli' },
    malul: { q: 'Kurum Sağlık Kurulu kararıyla en az %60 malul olduğunuz tespit edildi mi?', fact: 'En az %60 malul' },
    calisma: { q: 'Sigortalı olarak çalışıyor musunuz?', help: 'Türkiye’de veya yurtdışında.', fact: 'Sigortalı çalışıyor' },
    asliAylik: { q: 'Kendi çalışmanız nedeniyle gelir veya aylık alıyor musunuz?', help: 'Emeklilik, malullük gibi kendi sigortalılığınızdan doğan aylıklar.', fact: 'Kendi sigortalılığından aylık' },
    hicAylik: { q: 'Herhangi bir aylık alıyor musunuz?', help: 'Eşinizden veya başka birinden alınan ölüm aylığı da sayılır.', fact: 'Herhangi bir aylık' },
    memur: { q: 'Devlet memuru olarak çalışıyor musunuz?', help: 'Emekli Sandığı (5434) veya 4/I-(c) kapsamında.', fact: 'Devlet memuru' },
    memurAylik: { q: 'Emekli Sandığı veya 4/I-(c) kapsamında aylık alıyor musunuz?', fact: '5434 / 4-c kapsamında aylık' },
    gelirBrutUstu: { q: 'Toplam geliriniz brüt asgari ücretin üzerinde mi?', fact: 'Gelir brüt asgari ücretin üzerinde' },
    anneAylik: { q: 'Kendi çalışmanızdan gelir/aylık ya da eşinizden ölüm aylığı alıyor musunuz?', help: 'Vefat eden diğer çocuklarınızdan alınan aylıklar sayılmaz.', fact: 'Gelir/aylık alıyor' },
    gelirNetAlti: { q: 'Hanenizde kişi başına düşen gelir net asgari ücretin altında mı?', help: 'Anne ve baba birlikte yaşıyorsa ikisinin toplam geliri, ayrı yaşıyorsa yalnızca annenin geliri esas alınır.', fact: 'Kişi başı gelir net asgari ücretin altında' },
    yas65: { q: '65 yaşından büyük müsünüz?', fact: '65 yaş üstü' },
    artanHisse: { q: 'Çocuğunuzun eşine ve çocuklarına bağlanan aylıklardan sonra artan hisse var mı?', help: 'Eşle birlikte ikiden fazla çocuk varsa genellikle artan hisse kalmaz. Emin değilseniz SGK’dan öğrenebilirsiniz.', fact: 'Artan hisse var' },
    gecim: { q: 'Geçiminizi vefat eden çocuğunuz mu sağlıyordu?', help: 'Onunla birlikte yaşıyorsanız, düzenli para desteği olmasa da "Evet" seçebilirsiniz.', fact: 'Geçimi çocuğu sağlıyordu' },
    gelirBrutAlti: { q: 'Kişi başına düşen geliriniz brüt asgari ücretin altında mı?', fact: 'Kişi başı gelir brüt asgari ücretin altında' },
    herhangiAylik: { q: 'Herhangi bir gelir veya aylık alıyor musunuz?', fact: 'Herhangi bir gelir/aylık' },
    dulMuhtac: { q: 'Çocuğunuz vefat ettiğinde dul ve muhtaç mıydınız?', fact: 'Dul ve muhtaç' }
  };
  var KOSUL_SIRA = ['evli', 'malul', 'calisma', 'asliAylik', 'hicAylik', 'memur', 'memurAylik', 'gelirBrutUstu', 'anneAylik', 'gelirNetAlti', 'yas65', 'artanHisse', 'gecim', 'gelirBrutAlti', 'herhangiAylik', 'dulMuhtac'];

  function kosullar(a) {
    var c = {};
    KOSUL_SIRA.forEach(function (k) { var v = yesNo(a['c.' + k]); if (v !== null) { c[k] = v; } });
    return c;
  }

  // Koşul sorularını, cevaplar sırayla verilmiş gibi yeniden oynatarak diziye ekler.
  // Böylece cevaplanmış sorular da sırasıyla listede yer alır (Geri ve Değiştir için).
  function replayKosul(s, a, evalFn) {
    var c = {};
    for (var guard = 0; guard <= KOSUL_SIRA.length; guard++) {
      var need = [];
      evalFn(c).forEach(function (r) { (r && r.needs || []).forEach(function (k) { if (KOSUL_SORU[k] && need.indexOf(k) === -1) { need.push(k); } }); });
      if (!need.length) { return true; }
      need.sort(function (x, y) { return KOSUL_SIRA.indexOf(x) - KOSUL_SIRA.indexOf(y); });
      var k = need[0], q = KOSUL_SORU[k];
      if (!s.add({ id: 'c.' + k, type: 'choice', fact: q.fact, q: q.q, help: q.help, options: EH })) { return false; }
      c[k] = yesNo(a['c.' + k]);
    }
    return true;
  }

  /* ================================================================== */
  /* 4) Kız çocuğunun hak sahipliği (Tablo-3, 4, 5)                      */
  /* ================================================================== */

  var KIZ_P = person('eb', 'Vefat eden anne/baba', 'Vefat eden anneniz ya da babanız', 'Vefat eden annenizin ya da babanızın');

  function kizInput(a, donem, c) {
    var p = personInput('eb', a);
    return { code: DERIVE.statu(p).code, tarih: p.tarih, donem: donem, donem2016: a.donem2016 || null, c: c };
  }

  var kiz = {
    id: 'kiz', group: 'hak',
    title: 'Kız çocuğu olarak hak sahipliği',
    desc: 'Vefat eden annemden veya babamdan aylık alabilir miyim?',
    baslik: 'Kız çocuğunun hak sahipliği',
    steps: function (a) {
      var s = new Seq(a);
      if (!s.person(KIZ_P, { yil: always, esikler: EBK.concat(['1999-09-08']) })) { return s.list; }
      if (!s.add({ id: 'basvuru', type: 'choice', fact: 'Başvuru', q: 'Aylık başvurusu ne zaman yapıldı ya da yapılacak?', options: BASVURU })) { return s.list; }
      var probe = HUKUM.kizKural(kizInput(a).code, kizInput(a).tarih, a.basvuru, null);
      if ((probe.needs === 'donem2016') || a.donem2016) {
        if (!s.add({ id: 'donem2016', type: 'choice', fact: 'Değerlendirme dönemi', q: 'Aylık hangi dönem için değerlendiriliyor?', options: DONEM2016 })) { return s.list; }
      }
      replayKosul(s, a, function (c) { return [HUKUM.kizHak(kizInput(a, a.basvuru, c)), HUKUM.kizHak(kizInput(a, 'yargitay', c))]; });
      return s.list;
    },
    evaluate: function (a) {
      var c = kosullar(a);
      var sgk = HUKUM.kizHak(kizInput(a, a.basvuru, c));
      var yar = HUKUM.kizHak(kizInput(a, 'yargitay', c));
      return { cards: [
        cardFrom('SGK uygulaması · ' + (a.basvuru === 'once2017' ? '5.12.2017 öncesi' : '5.12.2017 sonrası'), sgk),
        cardFrom('Yargıtay görüşü', yar, null, { alt: true })
      ], notes: [] };
    }
  };

  /* ================================================================== */
  /* 5) Annenin hak sahipliği (Tablo-7)                                  */
  /* ================================================================== */

  var ANNE_P = person('co', 'Vefat eden çocuğunuz', 'Vefat eden çocuğunuz', 'Vefat eden çocuğunuzun');

  function anneInput(a, c) {
    var p = personInput('co', a);
    return { ozCocuk: yesNo(a.ozCocuk), code: DERIVE.statu(p).code, tarih: p.tarih, donem: a.basvuru || 'sonra2017', hizmet: a.hizmet || null, c: c };
  }

  var anne = {
    id: 'anne', group: 'hak',
    title: 'Anne olarak hak sahipliği',
    desc: 'Vefat eden çocuğumdan aylık alabilir miyim?',
    baslik: 'Annenin hak sahipliği',
    steps: function (a) {
      var s = new Seq(a);
      if (!s.add({ id: 'ozCocuk', type: 'choice', fact: 'Öz çocuğu', q: 'Vefat eden kişi öz çocuğunuz mu?', options: EH })) { return s.list; }
      if (a.ozCocuk === 'hayir') { return s.list; }
      if (!s.person(ANNE_P, { yil: datedOnly, esikler: EBK.concat(['2003-08-06']) })) { return s.list; }
      var code = anneInput(a).code;
      if (code === 'ES') {
        if (!s.add({ id: 'hizmet', type: 'choice', fact: 'Hizmet süresi', q: 'Çocuğunuzun Emekli Sandığı hizmet süresi ne kadardı?', options: [
          { code: '10+', label: '10 yıl veya daha fazla' }, { code: '5-10', label: '5 yıl ile 10 yıl arası' }, { code: '5-', label: '5 yıldan az' }] })) { return s.list; }
      }
      if (['SSK', 'BK', 'TBK'].indexOf(code) !== -1) {
        if (!s.add({ id: 'basvuru', type: 'choice', fact: 'Başvuru', q: 'Aylık başvurusu ne zaman yapıldı ya da yapılacak?', options: BASVURU })) { return s.list; }
      }
      replayKosul(s, a, function (c) { return [HUKUM.anneHak(anneInput(a, c))]; });
      return s.list;
    },
    evaluate: function (a) {
      var r = HUKUM.anneHak(anneInput(a, kosullar(a)));
      var label = 'SGK uygulaması' + (a.basvuru ? ' · ' + (a.basvuru === 'once2017' ? '5.12.2017 öncesi' : '5.12.2017 sonrası') : '');
      return { cards: [cardFrom(label, r)], notes: [] };
    }
  };

  /* ================================================================== */
  /* 6) Dul eşin hak sahipliği ve aylık hissesi                          */
  /* ================================================================== */

  var DULH_P = person('de', 'Vefat eden eşiniz', 'Vefat eden eşiniz', 'Vefat eden eşinizin');

  var dulHak = {
    id: 'dulHak', group: 'hak',
    title: 'Eş olarak hak sahipliği',
    desc: 'Vefat eden eşimden aylık alabilir miyim, hissem ne kadar?',
    baslik: 'Dul eşin hak sahipliği',
    steps: function (a) {
      var s = new Seq(a);
      if (!s.add({ id: 'evlilik', type: 'choice', fact: 'Vefat tarihinde resmi nikahlı', q: 'Eşiniz vefat ettiğinde resmi nikahlı olarak evli miydiniz?', options: EH })) { return s.list; }
      if (a.evlilik === 'hayir') { return s.list; }
      if (!s.add({ id: 'evlendi', type: 'choice', fact: 'Sonradan evlenme', q: 'Eşinizin vefatından sonra yeniden evlendiniz mi?', options: [
        { code: 'hayir', label: 'Hayır' }, { code: 'evet', label: 'Evet, şu anda evliyim' }, { code: 'sona', label: 'Evet, ama o evlilik de eşimin vefatıyla sona erdi' }] })) { return s.list; }
      if (a.evlendi !== 'hayir') { return s.list; }
      if (!s.person(DULH_P, { yil: datedOnly, esikler: E2008 })) { return s.list; }
      if (!s.add({ id: 'cocuk', type: 'choice', fact: 'Aylık alan çocuk', q: 'Bu eşinizden aylık alan çocuğunuz var mı?', options: [{ code: 'yok', label: 'Yok' }, { code: 'bir', label: 'Bir çocuk' }, { code: 'birden', label: 'Birden fazla çocuk' }] })) { return s.list; }
      var code = DERIVE.statu(personInput('de', a)).code;
      if (a.cocuk === 'yok' && ['4A', '4B', '4B4', '4C', 'BSA', 'BSD'].indexOf(code) !== -1) {
        s.add({ id: 'kendi', type: 'choice', fact: 'Çalışıyor veya kendi aylığı var', q: 'Sigortalı olarak çalışıyor ya da kendi sigortalılığınızdan gelir veya aylık alıyor musunuz?', options: EH });
      } else if (code === 'ES' && a.cocuk !== 'birden') {
        s.add({ id: 'kendi5434', type: 'choice', fact: '5434 kapsamında aylık/iştirakçi', q: 'Emekli Sandığı kapsamında emekli veya malullük aylığı alıyor ya da iştirakçi misiniz?', options: EH });
      }
      return s.list;
    },
    evaluate: function (a) {
      if (a.evlilik === 'hayir') {
        return { cards: [{ label: 'Sonuç', title: 'Hak sahibi değildir.', tone: 'none', plain: 'Dul eşe aylık bağlanması için ölüm tarihinde evlilik birliğinin bulunması gerekir.', refs: [], notes: ['evlilik'] }], notes: [] };
      }
      if (a.evlendi === 'evet') {
        return { cards: [{ label: 'Sonuç', title: 'Şu anda hak sahibi değildir.', tone: 'none', plain: 'Dul eşin evlenmesi halinde aylığı kesilir.', refs: [], notes: ['evlenme'] }], notes: [] };
      }
      if (a.evlendi === 'sona') {
        return { cards: [{ label: 'Sonuç', title: 'Hak sahibidir.', tone: 'good', plain: 'Evlilik ölümle sona erdiği için yeniden aylık bağlanır. İki eşten de hak varsa "İki eşimden aylık" sorgusunu kullanın.', refs: [], notes: ['evlenme'], link: 'dulEs' }], notes: [] };
      }
      var code = DERIVE.statu(personInput('de', a)).code;
      var hisse, notes = ['evlilik'];
      if (['4A', '4B', '4B4', '4C', 'BSA', 'BSD'].indexOf(code) !== -1) {
        notes.push('hisse5510');
        hisse = a.cocuk === 'yok' ? (a.kendi === 'evet' ? '%50' : '%75') : null;
      } else if (code === 'ES') {
        notes.push('hisse5434');
        hisse = a.kendi5434 === 'evet' ? '%50' : a.cocuk === 'yok' ? '%75' : a.cocuk === 'bir' ? '%60' : null;
      }
      var cards = [{ label: 'Hak sahipliği', title: 'Hak sahibidir.', tone: 'good', plain: 'Gelir veya aylık almanız ya da sigortalı çalışmanız ölüm aylığı almanıza engel değildir.', refs: [], notes: ['miras'] }];
      cards.push(hisse
        ? { label: 'Aylık hissesi', title: 'Ölüm aylığı hissesi ' + hisse + '.', tone: 'info', refs: [], notes: [], alt: true }
        : { label: 'Aylık hissesi', title: 'Kaynakta bu durum için oran belirtilmemiş.', tone: 'none', refs: [], notes: [], alt: true });
      return { cards: cards, notes: notes };
    }
  };

  /* ================================================================== */
  /* 7) Ölüm aylığı için prim şartı (Tablo-1)                            */
  /* ================================================================== */

  var PRIM_P = person('si', 'Vefat eden sigortalı', 'Vefat eden sigortalı', 'Vefat eden sigortalının');

  function primInput(a) {
    var p = personInput('si', a);
    return { code: DERIVE.statu(p).code, tarih: p.tarih, aylikAlirken: yesNo(a.aylikAlirken), prim: typeof a.prim === 'number' ? a.prim : undefined, yil: typeof a.sigYil === 'number' ? a.sigYil : undefined };
  }

  var prim = {
    id: 'prim', group: 'sart',
    title: 'Ölüm aylığı için prim şartı',
    desc: 'Vefat eden sigortalının prim günü ölüm aylığına yetiyor mu?',
    baslik: 'Ölüm aylığı için prim şartı',
    steps: function (a) {
      var s = new Seq(a);
      if (!s.person(PRIM_P, { yil: always, esikler: EBK })) { return s.list; }
      if (!s.add({ id: 'aylikAlirken', type: 'choice', fact: 'Vefatında emekli/malullük aylığı alıyordu', q: 'Sigortalı vefat ettiğinde emekli (yaşlılık) veya malullük aylığı alıyor muydu?', options: EH })) { return s.list; }
      if (a.aylikAlirken === 'evet') { return s.list; }
      if (!s.add({ id: 'prim', type: 'number', fact: 'Prim gün sayısı', unit: 'gün', min: 0, max: 20000, q: 'Sigortalının toplam prim gün sayısı kaç?', help: 'Hizmet dökümünde yazar.' })) { return s.list; }
      var r = HUKUM.primSarti(primInput(a));
      if (r.needs === 'yil' || typeof a.sigYil === 'number') {
        var code = primInput(a).code;
        s.add({ id: 'sigYil', type: 'number', fact: 'Sigortalılık süresi', unit: 'yıl', min: 0, max: 80, q: 'Sigortalılık süresi kaç yıl?', help: code === '4A' || code === 'BSA' || code === 'BSD' ? 'Borçlanmalar hariç, işe ilk girişten vefat tarihine kadar geçen süre.' : 'İşe ilk girişten vefat tarihine kadar geçen süre.' });
      }
      return s.list;
    },
    evaluate: function (a) {
      var r = HUKUM.primSarti(primInput(a));
      return { cards: [cardFrom('Sonuç', r)], notes: ['prim0', 'miras'] };
    }
  };

  /* ---------------- genel yardımcılar ---------------- */

  var FLOWS = [esAnneBaba, anneBaba, dulEs, kiz, anne, dulHak, prim];
  var GROUPS = [
    { id: 'iki', title: 'İki aylık sorgusu' },
    { id: 'hak', title: 'Hak sahipliği' },
    { id: 'sart', title: 'Ölüm aylığı şartı' }
  ];

  function byId(id) { for (var i = 0; i < FLOWS.length; i++) { if (FLOWS[i].id === id) { return FLOWS[i]; } } return null; }

  function currentIndex(steps, a) {
    for (var i = 0; i < steps.length; i++) { if (a[steps[i].id] == null) { return i; } }
    return -1;
  }

  // Cevap verilmiş adımlardan gösterilecek bilgiler (kişi başına bir satır)
  function facts(flow, a) {
    var steps = flow.steps(a);
    var out = [], seen = {};
    steps.forEach(function (st, i) {
      if (a[st.id] == null) { return; }
      if (st.person) {
        if (seen[st.person]) { return; }
        seen[st.person] = true;
        out.push({ person: st.person, index: i });
        return;
      }
      var val = a[st.id];
      var label = st.fact || st.q;
      var text;
      if (st.type === 'choice') { var o = st.options.filter(function (x) { return x.code === val; })[0]; text = o ? o.label : String(val); }
      else if (st.type === 'number') { text = val + (st.unit ? ' ' + st.unit : ''); }
      else { text = String(val); }
      out.push({ label: label, value: text, index: i });
    });
    return out;
  }

  var FLOWS_API = {
    FLOWS: FLOWS, GROUPS: GROUPS, byId: byId, currentIndex: currentIndex, facts: facts,
    tarihOf: tarihOf, personInput: personInput, THIS_YEAR: THIS_YEAR, KOSUL_SORU: KOSUL_SORU
  };

  root.SGK_FLOWS = FLOWS_API;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FLOWS_API;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
