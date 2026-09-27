// Arayüz metinleri (DOM'suz). tests/texts.test.js bu metinlerde Excel dışı
// yorum ve yasak ifade bulunmadığını doğrular.
(function (root) {
  'use strict';

  var TITLES = { esAnneBaba: 'Eşten ve anne-babadan aylık', anneBaba: 'Anne ve babadan aylık', dulEs: 'İki eşten aylık' };

  // Sonucun sade Türkçe karşılığı: tablonun ifadesini yeniden söyler, yorum eklemez.
  var PLAIN = {
    esAnneBaba: {
      iki: 'Hem eşinizden hem de annenizden ya da babanızdan aylık bağlanır.',
      tek: 'Eşinizden ve annenizden ya da babanızdan aylıklar birlikte bağlanmaz; yalnızca tek aylık bağlanır.'
    },
    anneBaba: {
      yuksekTamDusukYarim: 'Yüksek olan aylığın tamamı, düşük olan aylığın yarısı bağlanır.',
      tercihTam: 'İki aylıktan tercih edilen biri tam olarak bağlanır.',
      ikiTam: 'Annenizden ve babanızdan her iki aylık da tam olarak bağlanır.',
      yuksekOlan: 'Yalnızca yüksek olan aylık bağlanır.'
    },
    dulEs: {
      tercih: 'İki eşinizden birinin aylığı tercih edilir; yalnızca o aylık bağlanır.',
      iki: 'Her iki eşinizden de aylık bağlanır.'
    }
  };

  // Çapraz tablo hücreleri için kısa ad
  var SHORT = {
    esAnneBaba: { iki: 'İki', tek: 'Tek' },
    anneBaba: { yuksekTamDusukYarim: 'Yüksek tam, düşük yarım', tercihTam: 'Tercih edilen (tam)', ikiTam: 'İki tam', yuksekOlan: 'Yüksek olan' },
    dulEs: { tercih: 'Tercih edilen', iki: 'İki' }
  };

  var NONE = {
    title: 'Kaynak tabloda bu durum için satır yok.',
    dual: 'Cevap, bilmediğiniz bilgiye göre değişiyor.',
    dualHelp: 'İki olasılığın cevabı aşağıda.',
    printNote: 'Bu sayfa kaynak tablodaki satırın aktarımıdır; SGK\'nın yazılı kararı yerine geçmez.'
  };

  var TEXTS = { TITLES: TITLES, PLAIN: PLAIN, SHORT: SHORT, NONE: NONE };

  root.SGK_TEXTS = TEXTS;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TEXTS;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
