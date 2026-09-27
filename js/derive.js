// Kurum + vefat tarihi (+ gerekirse ek soru) bilgisinden Excel tablosundaki
// statü kodunu türetir. Adım adım (sihirbaz) modu bu dosyayı kullanır;
// hızlı giriş modu statüyü doğrudan seçtirir. Arayüzden bağımsızdır.
//
// Eşikler (tablodaki ifadeler):
//   "1.10.2008 öncesi"  -> tarih <  2008-10-01
//   "30.9.2008 sonrası" -> tarih >= 2008-10-01
//   "14.10.2008 sonrası"-> tarih >= 2008-10-15  (5510 4/I-(c))
(function (root) {
  'use strict';

  var ESIK_5510 = '2008-10-01';   // 4/a, 4/b, 4/b Tarım, Banka Sandığı (Devir)
  var ESIK_4C = '2008-10-15';     // 4/c

  // Sihirbazda sunulan kurumlar (sade dil)
  var KURUMLAR = [
    { code: 'ssk', label: 'SSK', aciklama: 'İşçi olarak çalışıyordu' },
    { code: 'bagkur', label: 'Bağ-Kur', aciklama: 'Esnaf ya da serbest çalışıyordu' },
    { code: 'emekli', label: 'Emekli Sandığı', aciklama: 'Memurdu' },
    { code: 'tarimssk', label: 'Tarım SSK', aciklama: 'Tarımda işçi olarak çalışıyordu' },
    { code: 'tarimbagkur', label: 'Tarım Bağ-Kur', aciklama: 'Kendi adına çiftçilik yapıyordu' },
    { code: 'banka', label: 'Banka Sandığı', aciklama: 'Banka ya da sigorta şirketi sandığına bağlıydı' }
  ];

  function validDate(iso) {
    if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) { return false; }
    var d = new Date(iso + 'T00:00:00Z');
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
  }

  function before(iso, esik) { return iso < esik; }

  // Girdi: { kurum, tarih (YYYY-AA-GG), memur ('once' | 'sonra' | null), devir (true | false | null) }
  // Çıktı: { code } veya { needs: 'tarih' | 'memur' | 'devir' }
  //   memur: memuriyete ilk kez 15.10.2008'den önce mi başladı? ('once' -> 5434, 'sonra' -> 4/c)
  //   devir: Banka Sandığı SGK'ya devredildi mi?
  // Her modül için kod haritası ayrı verilir.
  var HARITA = {
    esAnneBaba: { sskPre: 'SSK', sskPost: 'A', bkPre: 'BK', bkPost: 'B', es: 'ES', c: 'C', tssk: 'TSSK', tbkPre: 'TBK', tbkPost: 'BT', bankaAktif: 'BSA', bankaDevirPre: 'BSD', bankaDevirPost: 'BSD2' },
    anneBaba: { sskPre: 'A', sskPost: 'A', bkPre: 'B', bkPost: 'B', es: 'ES', c: 'C', tssk: 'TSSK', tbkPre: 'BT', tbkPost: 'BT' },
    dulEs: { sskPre: '506', sskPost: 'A', bkPre: '1479', bkPost: 'B', es: '5434', c: 'C', tssk: '2925', tbkPre: '2926', tbkPost: 'BT', bankaAktif: 'BS', bankaDevirPre: 'BS', bankaDevirPost: 'BS' }
  };

  function derive(modul, input) {
    var h = HARITA[modul];
    if (!h) { throw new Error('Bilinmeyen modül: ' + modul); }
    var kurum = input.kurum || null;
    var tarih = validDate(input.tarih) ? input.tarih : null;
    var memur = input.memur || null;
    var devir = typeof input.devir === 'boolean' ? input.devir : null;

    if (!kurum) { return { needs: 'kurum' }; }

    switch (kurum) {
      case 'ssk':
        if (!tarih) { return { needs: 'tarih' }; }
        return { code: before(tarih, ESIK_5510) ? h.sskPre : h.sskPost };
      case 'bagkur':
        if (!tarih) { return { needs: 'tarih' }; }
        return { code: before(tarih, ESIK_5510) ? h.bkPre : h.bkPost };
      case 'tarimbagkur':
        if (!tarih) { return { needs: 'tarih' }; }
        return { code: before(tarih, ESIK_5510) ? h.tbkPre : h.tbkPost };
      case 'tarimssk':
        return { code: h.tssk };
      case 'emekli':
        if (!tarih) { return { needs: 'tarih' }; }
        if (before(tarih, ESIK_4C)) { return { code: h.es }; }
        if (!memur) { return { needs: 'memur' }; }
        return { code: memur === 'once' ? h.es : h.c };
      case 'banka':
        if (!h.bankaAktif) { return { needs: 'kurum' }; }
        if (modul === 'dulEs') { return { code: h.bankaAktif }; }
        if (devir === null) { return { needs: 'devir' }; }
        if (!devir) { return { code: h.bankaAktif }; }
        if (!tarih) { return { needs: 'tarih' }; }
        return { code: before(tarih, ESIK_5510) ? h.bankaDevirPre : h.bankaDevirPost };
      default:
        return { needs: 'kurum' };
    }
  }

  // Tablo-6 için ölüm tarihi kategorisi: iki tarihten 'sonra' | 'biri' | 'ikisi'
  function tarihKategorisi(tarih1, tarih2) {
    if (!validDate(tarih1) || !validDate(tarih2)) { return null; }
    var n = (before(tarih1, ESIK_5510) ? 1 : 0) + (before(tarih2, ESIK_5510) ? 1 : 0);
    return n === 0 ? 'sonra' : (n === 1 ? 'biri' : 'ikisi');
  }

  // Sihirbazda hangi kurumların sunulacağı (Tablo-6'da Banka Sandığı yok)
  function kurumlar(modul) {
    return KURUMLAR.filter(function (k) { return !!HARITA[modul] && (k.code !== 'banka' || !!HARITA[modul].bankaAktif); });
  }

  var DERIVE = {
    ESIK_5510: ESIK_5510,
    ESIK_4C: ESIK_4C,
    KURUMLAR: KURUMLAR,
    kurumlar: kurumlar,
    validDate: validDate,
    derive: derive,
    tarihKategorisi: tarihKategorisi
  };

  root.SGK_DERIVE = DERIVE;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DERIVE;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
