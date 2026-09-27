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

  // Ortak sonuç nesnesi. status: 'ok' | 'none' | 'conflict' (+ çağıranın eklediği durumlar)
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

  function pending(status, candidates, extra) {
    var out = { status: status, sonuc: null, sonuclar: [], rows: [], candidates: candidates || [], reason: '' };
    for (var k in extra) { if (Object.prototype.hasOwnProperty.call(extra, k)) { out[k] = extra[k]; } }
    return out;
  }

  function pairMatches(setX, setY, x, y) {
    return (setX.indexOf(x) !== -1 && setY.indexOf(y) !== -1) ||
           (setX.indexOf(y) !== -1 && setY.indexOf(x) !== -1);
  }

  /* ---------------- 1) Eşten ve anne-babadan ---------------- */

  function evalEsAnneBaba(input) {
    var table = RULES.esAnneBaba;
    var es = input.es || null;
    var ab = input.ab || null;
    var once = input.once || null; // 'evet' | 'hayir' | null

    if (!es || !ab) { return pending('incomplete', [], { needsOnce: false }); }

    var candidates = table.rules.filter(function (r) {
      return r.es.indexOf(es) !== -1 && r.ab.indexOf(ab) !== -1;
    });
    var needsOnce = candidates.some(function (r) { return r.once === 'evet' || r.once === 'hayir'; });

    if (candidates.length === 0) {
      var esSt = findStatus(table.status, es);
      var abSt = findStatus(table.status, ab);
      var reason = '';
      if (esSt && abSt && esSt.kurum === abSt.kurum) {
        reason = 'Tablo, aynı kurum içindeki (' + esSt.kurum + ') kombinasyonları içermiyor.';
      }
      return finish(table, [], [], { needsOnce: false, reason: reason });
    }

    var matched = candidates.filter(function (r) {
      return r.once === 'any' || r.once === 'na' || r.once === once;
    });

    if (matched.length === 0) {
      if (needsOnce && !once) { return pending('needsOnce', candidates, { needsOnce: true }); }
      var onlyFor = uniq(candidates.map(function (r) { return r.once; }))
        .filter(function (o) { return o === 'evet' || o === 'hayir'; })
        .map(function (o) { return o === 'evet' ? 'Evet' : 'Hayır'; });
      return finish(table, [], candidates, {
        needsOnce: needsOnce,
        reason: 'Tabloda bu kombinasyon yalnızca "' + onlyFor.join('/') + '" için tanımlı.'
      });
    }

    return finish(table, matched, candidates, { needsOnce: needsOnce });
  }

  /* ---------------- 2) Anne ve babadan ---------------- */

  function evalAnneBaba(input) {
    var table = RULES.anneBaba;
    var x = input.baba || null;
    var y = input.anne || null;
    var tarih = input.tarih || null;
    var donem = input.donem || null;

    if (!x || !y || !tarih) { return pending('incomplete', [], { needsDonem: false }); }

    var candidates = table.rules.filter(function (r) {
      return (r.tarih === 'any' || r.tarih === tarih) && pairMatches(r.x, r.y, x, y);
    });
    var needsDonem = candidates.some(function (r) { return !!r.donem; });

    if (candidates.length === 0) {
      // Tarihten bağımsız olarak aynı statü çiftini içeren satırlar (yakın satırlar)
      var yakin = table.rules.filter(function (r) { return pairMatches(r.x, r.y, x, y); });
      var reason = '';
      if (tarih === 'sonra' && (x === 'BT' || y === 'BT')) {
        reason = 'Tablonun 2. satırı 4/I-(b.4) statüsünü ayrıca saymıyor.';
      } else if (tarih === 'ikisi' && x !== y) {
        reason = 'Her iki ölüm de 1.10.2008 öncesiyse tablo yalnızca aynı kanuna tabi çiftleri listeliyor.';
      }
      return finish(table, [], yakin, { needsDonem: false, reason: reason });
    }

    var matched = candidates.filter(function (r) { return !r.donem || r.donem === donem; });
    if (matched.length === 0) {
      if (needsDonem && !donem) { return pending('needsDonem', candidates, { needsDonem: true }); }
      return finish(table, [], candidates, { needsDonem: needsDonem });
    }
    return finish(table, matched, candidates, { needsDonem: needsDonem });
  }

  /* ---------------- 3) Dul eşe, iki eşten ---------------- */

  function evalDulEs(input) {
    var table = RULES.dulEs;
    var ilk = input.ilk || null;
    var ikinci = input.ikinci || null;

    if (!ilk || !ikinci) { return pending('incomplete', [], { sirali: false }); }

    var matched = table.rules.filter(function (r) { return pairMatches(r.ilk, r.ikinci, ilk, ikinci); });
    var sirali = matched.some(function (r) { return r.ilk.indexOf(ilk) !== -1 && r.ikinci.indexOf(ikinci) !== -1; });

    if (matched.length === 0) {
      return finish(table, [], [], {
        sirali: false,
        reason: 'Tabloda 5510 statüleri ve Banka Sandığı yalnızca 506, 1479, 2925, 2926 ve 5434 ile eşleştirilmiş.'
      });
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
