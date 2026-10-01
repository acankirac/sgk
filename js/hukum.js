// Makale tablolarının (1, 3, 4, 5, 7, 8, 9) ve metindeki ilkelerin hesap kuralları.
// Arayüzden bağımsızdır; her sonuç dayanak tablo satırını (refs) döndürür.
// Statü kodları js/derive.js içindeki kanun bazlı kodlardır:
//   SSK · 4A · BK · 4B · TBK · 4B4 · TSSK · ES · 4C · BSA · BSD
(function (root) {
  'use strict';

  var req = typeof require === 'function' ? require : null;
  var DERIVE = root.SGK_DERIVE || (req && req('./derive.js'));
  var ENGINE = root.SGK_ENGINE || (req && req('./engine.js'));
  var G = root.SGK_GENELGE || (req && req('./genelge.js'));

  var ESIK = '2008-10-01';
  function pre(t) { return !!t && t < ESIK; }
  function post(t) { return !!t && t >= ESIK; }
  function ref(key, row) { return { key: key, row: row }; }
  function within(code, list) { return list.indexOf(code) !== -1; }

  var S = {
    iki: { key: 'iki', title: 'İki aylık bağlanır.', tone: 'good' },
    tek: { key: 'tek', title: 'Tek aylık bağlanır.', tone: 'warn' },
    tercih: { key: 'tercih', title: 'Tercih ettiği aylık bağlanır.', tone: 'warn' },
    tercihYuksek: { key: 'tercihYuksek', title: 'Tercih ettiği veya yüksek olan aylık bağlanır.', tone: 'warn' },
    fazla: { key: 'fazla', title: 'Fazla olan aylık bağlanır.', tone: 'warn' },
    yalnizEs: { key: 'yalnizEs', title: 'Anne/babadan aylık bağlanamaz; yalnızca eşten aylık bağlanır.', tone: 'warn' },
    yok: { key: 'yok', title: 'Kaynak tabloda bu durum için satır yok.', tone: 'none' }
  };

  /* ------------------------------------------------------------------ */
  /* Tablo-1: ölüm aylığı için prim şartı                                 */
  /* ------------------------------------------------------------------ */

  // girdi: { code, tarih, aylikAlirken (bool), prim (gün), yil (sigortalılık yılı) }
  // çıktı: { status: 'ok'|'needs'|'none', needs, sonuc, refs, notes }
  function primSarti(g) {
    var code = g.code, t = g.tarih;
    if (g.aylikAlirken === true) {
      return { status: 'ok', sonuc: { key: 'var', title: 'Prim şartı aranmaz; ölüm aylığı bağlanır.', tone: 'good', plain: 'Malullük veya yaşlılık aylığı almakta iken ölen sigortalının hak sahiplerine ölüm aylığı bağlanır.' }, refs: [], notes: ['prim0'] };
    }
    var row = null, kural = null;
    var banka = code === 'BSA' || code === 'BSD';
    if (within(code, ['4A', '4B', '4C']) || (banka && post(t))) { row = banka ? 10 : 1; kural = (code === '4A' || banka) ? '1800|5y900' : '1800'; }
    else if (code === '4B4') { row = 1; kural = '1800'; }
    else if (code === 'ES') { row = 2; kural = 'ES'; }
    else if (code === 'SSK') { row = 3; kural = '1800|5y900'; }
    else if (code === 'TSSK') { row = 4; kural = '1800|5y900'; }
    else if (banka && pre(t)) { row = 9; kural = '1800|5y900'; }
    else if (code === 'BK' || code === 'TBK') {
      var d = DERIVE.bkDonem(t);
      if (!d) { return { status: 'needs', needs: 'tarih' }; }
      row = (code === 'BK' ? 5 : 7) + (d === 'B' ? 1 : 0);
      kural = d === 'A' ? '1080' : '1800';
    }
    if (!row) { return { status: 'none', sonuc: S.yok, refs: [] }; }
    var refs = [ref('t1', row)];
    if (typeof g.prim !== 'number') { return { status: 'needs', needs: 'prim', refs: refs }; }
    var p = g.prim;
    var ok = { key: 'var', title: 'Prim şartı sağlanıyor.', tone: 'good' };
    var no = { key: 'yokPrim', title: 'Prim şartı sağlanmıyor.', tone: 'none' };
    var borc = ' Eksik kalan süreler borçlanmayla tamamlanabilir.';
    if (kural === 'ES') {
      if (p >= 3600) { return { status: 'ok', sonuc: ok, refs: refs }; }
      if (p >= 1800) { return { status: 'ok', sonuc: { key: 'var5510', title: 'Prim şartı 5510 sayılı Kanuna göre sağlanıyor.', tone: 'good', plain: '10 yıldan az, 5 yıl (1800 gün) veya daha fazla prim ödemesi olduğundan aylık 5510 sayılı Kanunun 32 ve 34. maddeleri kapsamından bağlanır.' }, refs: refs }; }
      return { status: 'ok', sonuc: Object.assign({}, no, { plain: '5434 sayılı Kanunda en az 10 yıl (3600 gün), 5510 kapsamında en az 1800 gün prim aranır.' }), refs: refs };
    }
    var esik = kural === '1080' ? 1080 : 1800;
    if (p >= esik) { return { status: 'ok', sonuc: ok, refs: refs }; }
    if (kural === '1800|5y900') {
      if (p < 900) { return { status: 'ok', sonuc: Object.assign({}, no, { plain: 'En az 1800 gün veya 5 yıl sigortalılık ile 900 gün prim aranır.' + (row === 3 || row === 4 || row === 9 ? borc : '') }), refs: refs }; }
      if (typeof g.yil !== 'number') { return { status: 'needs', needs: 'yil', refs: refs }; }
      if (g.yil >= 5) { return { status: 'ok', sonuc: ok, refs: refs }; }
      return { status: 'ok', sonuc: Object.assign({}, no, { plain: 'Prim gün sayısı 1800’ün, sigortalılık süresi 5 yılın altında.' + (row === 3 || row === 4 || row === 9 ? borc : '') }), refs: refs };
    }
    return { status: 'ok', sonuc: Object.assign({}, no, { plain: 'En az ' + esik + ' gün prim aranır.' + (kural === '1080' || row === 6 || row === 8 ? borc : '') }), refs: refs };
  }

  /* ------------------------------------------------------------------ */
  /* Koşul listeleri (kız çocuğu ve anne)                                */
  /* ------------------------------------------------------------------ */

  var CHECKS = {
    medeni: { text: 'Evli olmamak (hiç evlenmemiş, boşanmış veya dul)', soru: 'evli', ok: function (c, ctx) { return c.evli === false || (ctx.malul && c.malul === true); } },
    calisma: { text: 'Türkiye’de veya yurtdışında sigortalı çalışmamak', soru: 'calisma', ok: function (c) { return c.calisma === false; } },
    calismaTR: { text: 'Türkiye’de sigortalı çalışmamak', soru: 'calisma', ok: function (c) { return c.calisma === false; } },
    asliAylik: { text: 'Kendi sigortalılığından gelir veya aylık almamak', soru: 'asliAylik', ok: function (c) { return c.asliAylik === false; } },
    hicAylik: { text: 'Herhangi bir statüde aylık almamak (ölüm gelir/aylığı dahil)', soru: 'hicAylik', ok: function (c) { return c.hicAylik === false; } },
    memur: { text: 'Devlet memuru olmamak (5434 veya 4/I-(c) sigortalısı olmamak)', soru: 'memur', ok: function (c) { return c.memur === false; } },
    memurAylik: { text: '5434 veya 4/I-(c) kapsamında aylık almamak', soru: 'memurAylik', ok: function (c) { return c.memurAylik === false; } },
    gelirBrut: { text: 'Geçimini sağlayacak başka geliri olmamak (gelirleri toplamı brüt asgari ücreti aşmamak)', soru: 'gelirBrutUstu', ok: function (c) { return c.gelirBrutUstu === false; } },
    anneAylik: { text: 'Kendi sigortalılığından gelir/aylık veya diğer çocukları dışında ölüm aylığı/geliri almamak', soru: 'anneAylik', ok: function (c) { return c.anneAylik === false; } },
    gelirNet: { text: 'Kişi başına düşen geliri net asgari ücretin altında olmak', soru: 'gelirNetAlti', ok: function (c) { return c.gelirNetAlti === true; } },
    hisse65: { text: 'Diğer hak sahiplerinden artan hisse bulunması (65 yaş üstü için aranmaz)', soru: 'artanHisse', soru2: 'yas65', ok: function (c) { return c.artanHisse === true || c.yas65 === true; } },
    hisse: { text: 'Diğer hak sahiplerinden artan hisse bulunması', soru: 'artanHisse', ok: function (c) { return c.artanHisse === true; } },
    gecim: { text: 'Geçiminin ölen çocuğu tarafından sağlanmış olması', soru: 'gecim', ok: function (c) { return c.gecim === true; } },
    gecimBrut: { text: 'Geçiminin ölen çocuğu tarafından sağlanmış olması (kişi başı gelir brüt asgari ücretin altında)', soru: 'gelirBrutAlti', ok: function (c) { return c.gelirBrutAlti === true; } },
    gelirAylikYok: { text: 'Herhangi bir gelir ve/veya aylık almamak', soru: 'herhangiAylik', ok: function (c) { return c.herhangiAylik === false; } },
    dulMuhtac: { text: 'Çocuğunun ölüm tarihinde dul ve muhtaç olmak', soru: 'dulMuhtac', ok: function (c) { return c.dulMuhtac === true; } }
  };

  // Sorulması gereken cevap anahtarları (cevaplanmamışlar)
  function missing(keys, c, ctx) {
    var out = [];
    keys.forEach(function (k) {
      var ch = CHECKS[k];
      if (k === 'medeni') {
        if (typeof c.evli !== 'boolean') { out.push('evli'); }
        else if (c.evli && ctx.malul && typeof c.malul !== 'boolean') { out.push('malul'); }
        return;
      }
      if (k === 'hisse65') {
        if (typeof c.yas65 !== 'boolean') { out.push('yas65'); }
        else if (!c.yas65 && typeof c.artanHisse !== 'boolean') { out.push('artanHisse'); }
        return;
      }
      if (typeof c[ch.soru] !== 'boolean') { out.push(ch.soru); }
    });
    return out;
  }

  function judge(keys, c, ctx, refs, extraNotes) {
    var need = missing(keys, c, ctx);
    var checks = keys.map(function (k) { return { key: k, text: CHECKS[k].text, ok: need.length ? null : CHECKS[k].ok(c, ctx) }; });
    if (need.length) { return { status: 'needs', needs: need, checks: checks, refs: refs, notes: extraNotes || [] }; }
    var all = checks.every(function (x) { return x.ok; });
    return {
      status: 'ok',
      hak: all,
      sonuc: all ? { key: 'hak', title: 'Hak sahibidir.', tone: 'good' } : { key: 'degil', title: 'Hak sahibi değildir.', tone: 'none' },
      checks: checks,
      refs: refs,
      notes: extraNotes || []
    };
  }

  /* ------------------------------------------------------------------ */
  /* Tablo-3 / 4 / 5: kız çocuğunun hak sahipliği                         */
  /* ------------------------------------------------------------------ */

  var K_C1 = ['medeni', 'calisma', 'asliAylik'];
  var K_ES = ['medeni', 'memur', 'memurAylik'];
  var K_HIC = ['medeni', 'calisma', 'hicAylik'];
  var K_GELIR = ['medeni', 'gelirBrut'];

  // Dayanak satırı ve koşul listesi; donem: 'once2017' (Tablo-3) | 'sonra2017' (Tablo-4) | 'yargitay' (Tablo-5)
  function kizKural(code, tarih, donem, donem2016) {
    if (donem === 'sonra2017' || donem === 'yargitay') {
      var key = donem === 'yargitay' ? 't5' : 't4';
      if (code === 'ES') { return { refs: [ref(key, 2)], keys: K_ES, malul: false }; }
      return { refs: [ref(key, 1)], keys: K_C1, malul: donem === 'sonra2017' };
    }
    switch (code) {
      case '4A': case '4B': case '4B4': case '4C': return { refs: [ref('t3', 1)], keys: K_C1, malul: true };
      case 'BSA': case 'BSD': return { refs: [ref('t3', 11)], keys: K_C1, malul: false };
      case 'SSK': return { refs: [ref('t3', 2)], keys: K_C1, malul: false };
      case 'ES': return { refs: [ref('t3', 3)], keys: K_ES, malul: false };
      case 'BK': {
        var d = DERIVE.bkDonem(tarih);
        if (!d) { return { needs: 'tarih' }; }
        if (d === 'B') { return { refs: [ref('t3', 6)], keys: K_C1, malul: false }; }
        if (!donem2016) { return { needs: 'donem2016' }; }
        return donem2016 === 'once' ? { refs: [ref('t3', 4)], keys: K_GELIR, malul: false } : { refs: [ref('t3', 5)], keys: K_C1, malul: false };
      }
      case 'TBK': {
        var d2 = DERIVE.bkDonem(tarih);
        if (!d2) { return { needs: 'tarih' }; }
        return d2 === 'A' ? { refs: [ref('t3', 7)], keys: K_HIC, malul: false } : { refs: [ref('t3', 8)], keys: K_C1, malul: false };
      }
      case 'TSSK':
        if (!tarih) { return { needs: 'tarih' }; }
        return tarih < '1999-09-08' ? { refs: [ref('t3', 9)], keys: K_HIC, malul: false } : { refs: [ref('t3', 10)], keys: K_C1, malul: false };
      default: return { none: true };
    }
  }

  function kizHak(g) {
    var k = kizKural(g.code, g.tarih, g.donem, g.donem2016);
    if (k.needs) { return { status: 'needs', needs: [k.needs] }; }
    if (k.none) { return { status: 'none', sonuc: S.yok, refs: [] }; }
    var notes = [];
    if (k.malul) { notes.push('malul'); }
    if (g.donem !== 'once2017' || within(g.code, ['4A', '4B', '4B4', '4C'])) { if (g.c && g.c.calisma === true) { notes.push('dn18'); } }
    if (g.donem === 'yargitay') { notes.push('yargitayKiz'); }
    return judge(k.keys, g.c || {}, { malul: k.malul }, k.refs, notes);
  }

  /* ------------------------------------------------------------------ */
  /* Tablo-7: annenin hak sahipliği                                       */
  /* ------------------------------------------------------------------ */

  var A_5510 = ['anneAylik', 'gelirNet', 'hisse65'];

  function anneKural(code, tarih, donem, hizmet) {
    var sonra = donem === 'sonra2017';
    switch (code) {
      case '4A': case '4B': case '4B4': case '4C': return { refs: [ref('t7', 1)], keys: A_5510 };
      case 'SSK':
        if (!tarih) { return { needs: 'tarih' }; }
        if (tarih < '2003-08-06') { return sonra ? { refs: [ref('t7', 3)], keys: A_5510 } : { refs: [ref('t7', 2)], keys: ['gecim', 'hisse'], notes: ['anneGecim'] }; }
        return sonra ? { refs: [ref('t7', 5)], keys: A_5510 } : { refs: [ref('t7', 4)], keys: ['calisma', 'gelirAylikYok', 'hisse'] };
      case 'ES':
        if (!hizmet) { return { needs: 'hizmet' }; }
        if (hizmet === '10+') { return { refs: [ref('t7', 6)], keys: ['memur', 'memurAylik', 'dulMuhtac'], notes: ['anne5434'] }; }
        if (hizmet === '5-10') { return { refs: [ref('t7', 7)], keys: A_5510 }; }
        return { none: true, reason: 'Tablo-7, hizmeti 5 yıldan az Emekli Sandığı sigortalısının annesi için satır içermiyor; Tablo-1’e göre en az 1800 gün prim gerekir.' };
      case 'BK': case 'TBK': {
        var d = DERIVE.bkDonem(tarih);
        if (!d) { return { needs: 'tarih' }; }
        if (d === 'A') { return sonra ? { refs: [ref('t7', 9)], keys: A_5510 } : { refs: [ref('t7', 8)], keys: ['gecimBrut', 'hisse'] }; }
        return sonra
          ? { refs: [ref('t7', 11)], keys: A_5510, notes: ['t7r11'] }
          : { refs: [ref('t7', 10)], keys: ['calismaTR', 'anneAylik', 'hisse'], notes: ['t7r10'] };
      }
      default:
        return { none: true, reason: 'Tablo-7, ' + (DERIVE.STATU_ADLARI[code] || code) + ' statüsündeki sigortalının annesi için satır içermiyor.' };
    }
  }

  function anneHak(g) {
    if (g.ozCocuk === false) {
      return { status: 'ok', hak: false, sonuc: { key: 'degil', title: 'Hak sahibi değildir.', tone: 'none', plain: 'Anne yalnızca öz çocuğunun ölümü halinde hak sahibi olur.' }, refs: [], checks: [], notes: ['anneOz'] };
    }
    var k = anneKural(g.code, g.tarih, g.donem, g.hizmet);
    if (k.needs) { return { status: 'needs', needs: [k.needs] }; }
    if (k.none) { return { status: 'none', sonuc: Object.assign({}, S.yok, { plain: k.reason }), refs: [] }; }
    var notes = (k.notes || []).concat(['anneGelir', 'anneIki']);
    if (k.keys === A_5510) { notes.push('anneHisse'); }
    return judge(k.keys, g.c || {}, {}, k.refs, notes);
  }

  /* ------------------------------------------------------------------ */
  /* Tablo-8: aynı statü (eş ve anne-baba)                                */
  /* ------------------------------------------------------------------ */

  var T8_ROW = { SSK: 1, TSSK: 2, BK: 3, TBK: 4, ES: 5, '4A': 6, '4B': 7, '4B4': 8, '4C': 9, BSA: 10, BSD: 10 };

  function ayniStatu(es, ab) {
    if (es !== ab || !T8_ROW[es]) { return null; }
    var notes = (es === 'BSA' || es === 'BSD') ? ['t8banka'] : [];
    return { status: 'ok', sonuc: S.tercihYuksek, refs: [ref('t8', T8_ROW[es])], notes: notes };
  }

  /* ------------------------------------------------------------------ */
  /* Tablo-9: farklı statü, 5.12.2017 öncesi uygulama                     */
  /* ------------------------------------------------------------------ */

  var P5510 = ['4A', '4B', '4B4', '4C'];
  // d: 'pre' | 'post' | 'any' | 'A72' (1.10.1972–3.10.2000 / 8.8.2001–1.8.2003) | 'B'
  var T9 = [
    { row: 1, es: [P5510, 'post'], ab: [P5510, 'post'], s: 'tercih' },
    { row: 2, es: [['ES', '4C'], 'any'], ab: [['ES', '4C'], 'any'], s: 'tercih' },
    { row: 3, es: [['BK'], 'pre'], ab: [['BK'], 'pre'], s: 'fazla', fn: 'dn47' },
    { row: 4, es: [['BK'], 'pre'], ab: [['4B'], 'post'], s: 'tercih', fn: 'dn48' },
    { row: 5, es: [['4B'], 'post'], ab: [['BK'], 'pre'], s: 'tercih' },
    { row: 6, es: [['SSK'], 'pre'], ab: [['SSK'], 'pre'], s: 'fazla' },
    { row: 7, es: [['SSK'], 'pre'], ab: [['4A'], 'post'], s: 'tercih' },
    { row: 8, es: [['4A'], 'post'], ab: [['SSK'], 'pre'], s: 'tercih' },
    { row: 9, es: [['BK'], 'pre'], ab: [['SSK', 'ES', 'TSSK'], 'pre'], s: 'iki' },
    { row: 10, es: [['BK'], 'pre'], ab: [['4A', '4B4', '4C', 'ES'], 'post'], s: 'iki' },
    { row: 11, es: [['4B', '4B4'], 'post'], ab: [['SSK', 'ES', 'TSSK'], 'pre'], s: 'iki' },
    { row: 12, es: [['SSK'], 'pre'], ab: [['4B', '4C', '4B4', 'TSSK', 'ES'], 'post'], s: 'iki' },
    { row: 13, es: [['SSK'], 'pre'], ab: [['BK'], 'A72'], s: 'gelir' },
    { row: 14, es: [['SSK'], 'pre'], ab: [['BK'], 'B'], s: 'iki' },
    { row: 15, es: [['4A'], 'post'], ab: [['BK'], 'A72'], s: 'gelir' },
    { row: 16, es: [['4A'], 'post'], ab: [['BK'], 'B'], s: 'iki' },
    { row: 17, es: [['ES'], 'pre'], ab: [['SSK'], 'pre'], s: 'iki' },
    { row: 18, es: [['ES'], 'post'], ab: [['4A', '4B', '4B4'], 'post'], s: 'iki' },
    { row: 19, es: [['ES'], 'pre'], ab: [['4A', '4B', '4B4'], 'post'], s: 'iki' },
    { row: 20, es: [['ES'], 'post'], ab: [['SSK'], 'pre'], s: 'iki' },
    { row: 21, es: [['ES'], 'pre'], ab: [['BK'], 'A72'], s: 'gelir' },
    { row: 22, es: [['ES'], 'pre'], ab: [['BK'], 'B'], s: 'iki' },
    { row: 23, es: [['ES'], 'post'], ab: [['BK'], 'A72'], s: 'gelir' },
    { row: 24, es: [['ES'], 'post'], ab: [['BK'], 'B'], s: 'iki' },
    { row: 25, es: [['ES'], 'post'], ab: [['TBK'], 'A72'], s: 'tek' },
    { row: 26, es: [['ES'], 'post'], ab: [['TBK'], 'B'], s: 'iki' },
    { row: 27, es: [['SSK', 'BK', 'TSSK', 'TBK'], 'pre'], ab: [['ES'], 'pre'], s: 'iki' },
    { row: 28, es: [['4A', '4B', '4B4', 'TSSK'], 'post'], ab: [['ES'], 'post'], s: 'iki' },
    { row: 29, es: [['SSK', 'BK', 'TSSK', 'TBK'], 'pre'], ab: [['ES'], 'post'], s: 'iki' },
    { row: 30, es: [['4A', '4B', '4B4', 'TSSK'], 'post'], ab: [['ES'], 'pre'], s: 'iki' }
  ];

  function a72(t) { return !!t && (DERIVE.between(t, '1972-10-01', '2000-10-03') || DERIVE.between(t, '2001-08-08', '2003-08-01')); }
  function dateOk(d, t) {
    if (d === 'any') { return true; }
    if (d === 'pre') { return pre(t); }
    if (d === 'post') { return post(t); }
    if (d === 'A72') { return a72(t); }
    if (d === 'B') { return DERIVE.bkDonem(t) === 'B'; }
    return false;
  }
  function side(spec, code, t) { return within(code, spec[0]) && dateOk(spec[1], t); }

  function t9Rows(es, esT, ab, abT) {
    return T9.filter(function (r) { return side(r.es, es, esT) && side(r.ab, ab, abT); });
  }

  // girdi: { es, esTarih, ab, abTarih, donem2016: 'once'|'sonra'|null, gelirAlti: bool|null }
  function esAb2017Oncesi(g) {
    var same = ayniStatu(g.es, g.ab);
    if (same) { return same; }
    var rows = t9Rows(g.es, g.esTarih, g.ab, g.abTarih);
    if (!rows.length) { return { status: 'none', sonuc: S.yok, refs: [], candidates: [] }; }
    var r = rows[0];
    var refs = rows.map(function (x) { return ref('t9', x.row); });
    var kinds = rows.map(function (x) { return x.s; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
    if (kinds.length > 1) { return { status: 'conflict', refs: refs }; }
    if (r.s === 'gelir') {
      if (!g.donem2016) { return { status: 'needs', needs: ['donem2016'], refs: refs }; }
      if (g.donem2016 === 'sonra') { return { status: 'ok', sonuc: S.iki, refs: refs }; }
      if (typeof g.gelirAlti !== 'boolean') { return { status: 'needs', needs: ['gelirAlti'], refs: refs }; }
      return { status: 'ok', sonuc: g.gelirAlti ? S.iki : S.yalnizEs, refs: refs };
    }
    if (r.s === 'fazla' && r.fn === 'dn47' && a72(g.abTarih)) {
      if (typeof g.gelirAlti !== 'boolean') { return { status: 'needs', needs: ['gelirAlti'], refs: refs }; }
      return { status: 'ok', sonuc: g.gelirAlti ? S.fazla : S.yalnizEs, refs: refs, notes: ['dn47'] };
    }
    return { status: 'ok', sonuc: S[r.s], refs: refs, notes: r.fn ? [r.fn] : [] };
  }

  /* ------------------------------------------------------------------ */
  /* 5.12.2017 sonrası uygulama: Tablo-8 + s.148–150 tablosu (Excel)       */
  /* ------------------------------------------------------------------ */

  // Excel tablosundaki kodlar -> kanun bazlı kodlar
  var EXCEL_TO_KANUN = { SSK: 'SSK', A: '4A', BK: 'BK', B: '4B', ES: 'ES', C: '4C', TSSK: 'TSSK', TBK: 'TBK', BT: '4B4', BSA: 'BSA', BSD: 'BSD', BSD2: 'BSD' };

  // girdi: Excel kodları { es, ab, once }
  function esAb2017Sonrasi(g) {
    var same = ayniStatu(EXCEL_TO_KANUN[g.es], EXCEL_TO_KANUN[g.ab]);
    if (same) { return Object.assign({ needsOnce: false }, same); }
    var res = ENGINE.evalEsAnneBaba(g);
    var out = { status: res.status, sonuc: res.sonuc, sonuclar: res.sonuclar, needsOnce: res.needsOnce, reason: res.reason,
      refs: (res.rows || []).map(function (r) { return ref('esAnneBaba', r.row); }),
      candidates: (res.candidates || []).map(function (r) { return ref('esAnneBaba', r.row); }) };
    if (res.status === 'needsOnce') { out.status = 'needs'; out.needs = ['once']; }
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Yargıtay ilkesi (eş ve anne-baba)                                    */
  /* ------------------------------------------------------------------ */

  var Y_5434_DIGER = ['SSK', 'BK', 'TSSK', 'TBK', '4A', '4B', '4B4'];

  function yargitayEsAb(g) {
    var notes = ['yargitayEs'];
    if (!g.esTarih || !g.abTarih) { return { status: 'needs', needs: ['tarih'] }; }
    if (g.es === g.ab) {
      return { status: 'ok', sonuc: { key: 'yok', title: 'İki aylık koşulu oluşmuyor (statüler aynı).', tone: 'none' }, refs: [], notes: notes };
    }
    if (pre(g.esTarih) || pre(g.abTarih)) { return { status: 'ok', sonuc: S.iki, refs: [], notes: notes }; }
    if ((g.es === 'ES' && within(g.ab, Y_5434_DIGER)) || (g.ab === 'ES' && within(g.es, Y_5434_DIGER))) {
      return { status: 'ok', sonuc: S.iki, refs: [], notes: notes };
    }
    return { status: 'ok', sonuc: { key: 'tercih', title: 'Tercih edilen aylık bağlanır (5510 m.54).', tone: 'warn', plain: 'Her iki ölüm de 30.9.2008 sonrası olduğundan ve 5434 istisnası bulunmadığından Yargıtay ilkesine göre iki aylık koşulu oluşmuyor.' }, refs: [], notes: notes };
  }

  var EK_NOTLAR = {
    t8banka: { sayfa: '142', text: 'Tablo-8’deki satır, eş ve anne-babanın aynı banka sandığına tabi olması halini kapsar.' },
    t7r10: { sayfa: '138–139', text: 'Kaynak metne göre bu dönemde ölen Bağ-Kur sigortalısının annesine aylık bağlanması için diğer hak sahiplerinden artan hisse bulunması da aranır.' },
    t7r11: { sayfa: '141', text: 'Kaynak tabloda bu satırın tarih aralığı 9. satırla aynı yazılmıştır; 10. satırın 5.12.2017 sonrası karşılığı olarak değerlendirilmiştir.' }
  };
  Object.keys(EK_NOTLAR).forEach(function (k) { if (G && G.NOTES && !G.NOTES[k]) { G.NOTES[k] = EK_NOTLAR[k]; } });

  var HUKUM = {
    S: S,
    CHECKS: CHECKS,
    T9: T9,
    T8_ROW: T8_ROW,
    EXCEL_TO_KANUN: EXCEL_TO_KANUN,
    primSarti: primSarti,
    kizKural: kizKural,
    kizHak: kizHak,
    anneKural: anneKural,
    anneHak: anneHak,
    ayniStatu: ayniStatu,
    t9Rows: t9Rows,
    esAb2017Oncesi: esAb2017Oncesi,
    esAb2017Sonrasi: esAb2017Sonrasi,
    yargitayEsAb: yargitayEsAb
  };

  root.SGK_HUKUM = HUKUM;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = HUKUM;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
