// Kural motoru: kullanıcının seçimlerini Excel tablolarındaki satırlarla
// eşleştirir. Arayüzden bağımsızdır; Node testleri de aynı dosyayı kullanır.
(function (root) {
  'use strict';

  var RULES = root.SGK_RULES || (typeof require === 'function' ? require('./rules.js') : null);
  if (!RULES) { throw new Error('SGK_RULES yüklenmemiş'); }

  function uniq(list) {
    var out = [];
    list.forEach(function (x) { if (out.indexOf(x) === -1) { out.push(x); } });
    return out;
  }

  function findStatus(list, code) {
    for (var i = 0; i < list.length; i++) { if (list[i].code === code) { return list[i]; } }
    return null;
  }

  function finish(table, matched, candidates, extra) {
    var keys = uniq(matched.map(function (r) { return r.sonuc; }));
    var out = {
      status: keys.length === 1 ? 'ok' : (keys.length === 0 ? 'none' : 'conflict'),
      sonuc: keys.length === 1 ? table.sonuc[keys[0]] : null,
      sonuclar: keys.map(function (k) { return table.sonuc[k]; }),
      rows: matched,
      candidates: candidates,
      reason: ''
    };
    for (var k in extra) { if (Object.prototype.hasOwnProperty.call(extra, k)) { out[k] = extra[k]; } }
    return out;
  }

  /* ---------------- 1) Eşten ve anne-babadan ---------------- */

  function evalEsAnneBaba(input) {
    var table = RULES.esAnneBaba;
    var es = input.es || null;
    var ab = input.ab || null;
    var once = input.once || null; // 'evet' | 'hayir' | null

    if (!es || !ab) {
      return { status: 'incomplete', sonuc: null, sonuclar: [], rows: [], candidates: [], needsOnce: false, reason: 'Ölen eşin ve ölen anne/babanın sigorta statüsünü seçin.' };
    }

    var candidates = table.rules.filter(function (r) {
      return r.es.indexOf(es) !== -1 && r.ab.indexOf(ab) !== -1;
    });
    var needsOnce = candidates.some(function (r) { return r.once === 'evet' || r.once === 'hayir'; });

    var esSt = findStatus(table.status, es);
    var abSt = findStatus(table.status, ab);

    if (candidates.length === 0) {
      var reason = 'Bu statü kombinasyonu için tabloda satır bulunmuyor.';
      if (esSt && abSt && esSt.kurum === abSt.kurum) {
        reason = 'Tablo yalnızca farklı kurum/statü kombinasyonlarını listeler; ' +
          esSt.kurum + ' grubunun kendi içindeki kombinasyonu için satır bulunmuyor.';
      }
      return finish(table, [], [], { needsOnce: false, reason: reason });
    }

    var matched = candidates.filter(function (r) {
      return r.once === 'any' || r.once === 'na' || r.once === once;
    });

    if (matched.length === 0) {
      if (needsOnce && !once) {
        return { status: 'needsOnce', sonuc: null, sonuclar: [], rows: [], candidates: candidates, needsOnce: true, reason: 'Sonuç, anne/babadan 1.10.2008 öncesi aylık bağlanıp bağlanmadığına göre değişiyor. Soruyu yanıtlayın.' };
      }
      var onlyFor = uniq(candidates.map(function (r) { return r.once; })).filter(function (o) { return o === 'evet' || o === 'hayir'; });
      return finish(table, [], candidates, {
        needsOnce: needsOnce,
        reason: 'Tabloda bu kombinasyon yalnızca "' + onlyFor.map(function (o) { return o === 'evet' ? 'Evet' : 'Hayır'; }).join('/') + '" durumu için tanımlı; seçilen "' + (once === 'evet' ? 'Evet' : 'Hayır') + '" durumu için satır yok.'
      });
    }

    return finish(table, matched, candidates, { needsOnce: needsOnce });
  }

  /* ---------------- 2) Anne ve babadan ---------------- */

  function pairMatches(setX, setY, x, y) {
    return (setX.indexOf(x) !== -1 && setY.indexOf(y) !== -1) ||
           (setX.indexOf(y) !== -1 && setY.indexOf(x) !== -1);
  }

  function evalAnneBaba(input) {
    var table = RULES.anneBaba;
    var x = input.baba || null;
    var y = input.anne || null;
    var tarih = input.tarih || null;
    var donem = input.donem || null;

    if (!x || !y || !tarih) {
      return { status: 'incomplete', sonuc: null, sonuclar: [], rows: [], candidates: [], needsDonem: false, reason: 'Babanın ve annenin sigorta statüsü ile ölüm tarihi durumunu seçin.' };
    }

    var candidates = table.rules.filter(function (r) {
      return (r.tarih === 'any' || r.tarih === tarih) && pairMatches(r.x, r.y, x, y);
    });
    var needsDonem = candidates.some(function (r) { return !!r.donem; });

    if (candidates.length === 0) {
      // Tarihten bağımsız olarak aynı statü çiftini içeren satırlar (yakın satırlar)
      var yakin = table.rules.filter(function (r) { return pairMatches(r.x, r.y, x, y); });
      var reason = 'Bu statü ve ölüm tarihi kombinasyonu için tabloda satır bulunmuyor.';
      if (tarih === 'sonra' && (x === 'BT' || y === 'BT')) {
        reason += ' Tablonun 2. satırı yalnızca 5510 sayılı Kanun 4/I-(a), 4/I-(b) ve 4/I-(c) statülerini sayar; 4/I-(b.4) bu satırda ayrıca belirtilmemiştir.';
      } else if (tarih === 'ikisi' && x !== y) {
        reason += ' Tablo, her iki ölümün de 1.10.2008 öncesi olduğu durumda yalnızca aynı kanuna tabi çiftleri (SSK-SSK, Bağ-Kur-Bağ-Kur, Tarım Bağ-Kur-Tarım Bağ-Kur) listeler.';
      }
      return finish(table, [], yakin, { needsDonem: false, reason: reason });
    }

    var matched = candidates.filter(function (r) { return !r.donem || r.donem === donem; });
    if (matched.length === 0) {
      if (needsDonem && !donem) {
        return { status: 'needsDonem', sonuc: null, sonuclar: [], rows: [], candidates: candidates, needsDonem: true, reason: 'Sonuç, uygulama dönemine (5.12.2017 öncesi / sonrası) göre değişiyor. Dönemi seçin.' };
      }
      return finish(table, [], candidates, { needsDonem: needsDonem, reason: 'Seçilen dönem için satır bulunmuyor.' });
    }
    return finish(table, matched, candidates, { needsDonem: needsDonem });
  }

  /* ---------------- 3) Dul eşe, iki eşten ---------------- */

  function evalDulEs(input) {
    var table = RULES.dulEs;
    var ilk = input.ilk || null;
    var ikinci = input.ikinci || null;

    if (!ilk || !ikinci) {
      return { status: 'incomplete', sonuc: null, sonuclar: [], rows: [], candidates: [], reason: 'Ölen ilk eşin ve ikinci eşin tabi olduğu kanunu seçin.' };
    }

    var matched = table.rules.filter(function (r) { return pairMatches(r.ilk, r.ikinci, ilk, ikinci); });
    var sirali = matched.some(function (r) { return r.ilk.indexOf(ilk) !== -1 && r.ikinci.indexOf(ikinci) !== -1; });

    if (matched.length === 0) {
      var a = findStatus(table.status, ilk);
      var b = findStatus(table.status, ikinci);
      var reason = 'Bu kanun kombinasyonu için tabloda satır bulunmuyor.';
      if (a && b && a.kurum === b.kurum && ilk !== ikinci) {
        reason = 'Tablo, aynı kurum grubunda yalnızca eski kanun ile 5510 karşılığını eşleştirir; ' + a.kurum + ' grubundaki bu ikili için satır bulunmuyor.';
      } else if (ilk === ikinci) {
        reason = 'Tabloda bu kanunun kendisiyle kombinasyonu (' + (a ? a.label : ilk) + ' + aynı kanun) yer almıyor.';
      }
      return finish(table, [], [], { sirali: false, reason: reason });
    }
    return finish(table, matched, matched, { sirali: sirali });
  }

  var ENGINE = {
    evalEsAnneBaba: evalEsAnneBaba,
    evalAnneBaba: evalAnneBaba,
    evalDulEs: evalDulEs,
    findStatus: findStatus
  };

  root.SGK_ENGINE = ENGINE;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ENGINE;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
