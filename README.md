# Çift Aylık Sorgusu

Ölen eşinden, anne ve babasından ya da birden fazla eşinden aylığa hak kazanan
kadına **iki aylık mı, tek aylık mı** bağlanacağını, kaynak Excel tablosundaki
satıra dayanarak gösteren statik web uygulaması.

Kaynak: `data/kadinlara_esinden_anne_babasindan.xls` (3 sayfa, 88 veri satırı).
Uygulama yalnızca bu tablodaki satırları uygular; tabloda bulunmayan
kombinasyonlar için yorum yapmaz, "tabloda karşılığı yok" der.

## Modüller

| Sekme | Excel sayfası | Girdi | Sonuç |
| --- | --- | --- | --- |
| Eşten ve anne-babadan | `eşten-anne-babadan` (60 satır) | Ölen eşin statüsü, ölen anne/babanın statüsü, anne/babadan 1.10.2008 öncesi aylık bağlanıp bağlanmadığı | İki aylık / Tek aylık |
| Anne ve babadan | `anne-babadan`, Tablo-6 (11 satır) | Baba ve annenin statüsü, ölüm tarihleri durumu, gerekirse 5.12.2017 uygulama dönemi | Yüksek tam-düşük yarım / Tercih edilen (tam) / İki tam aylık / Yüksek olan |
| İki eşten | `dul eşe` (16 satır) | Ölen ilk ve ikinci eşin tabi olduğu kanun | Tercih edilen aylık / İki aylık |

Cevabın altında dayanak olan Excel satırının numarası yer alır; bağlantı,
satırı sayfanın altındaki kaynak tabloda vurgular. Evet/Hayır ve 5.12.2017
soruları yalnızca sonucu etkilediğinde görünür.

## Çalıştırma

Derleme adımı yoktur; `index.html` doğrudan açılabilir veya herhangi bir statik
sunucuyla yayınlanabilir:

```bash
npm start            # http://localhost:8080  (python3 -m http.server)
```

GitHub Pages için: Settings → Pages → "Deploy from a branch", kök dizin.

## Dosya yapısı

```
index.html            Arayüz
css/app.css           Stil (açık/koyu tema, mobil uyumlu)
js/excel-rows.js      Excel satırlarının ham metni (üretilir, elle düzenlenmez)
js/rules.js           Excel satırlarının kodlanmış hali (statü kodları, kurallar)
js/engine.js          Eşleştirme motoru (arayüzden bağımsız)
js/app.js             Arayüz mantığı
data/*.xls            Kaynak Excel
data/excel-rows.json  Testlerin karşılaştırma için kullandığı ham satırlar
scripts/extract_excel.py  Excel'den excel-rows.js / .json üretir
tests/engine.test.js  Kural ve motor doğrulama testleri
```

## Doğrulama

```bash
npm test
```

Testler şunları garanti eder:

- `js/rules.js` içindeki her kural, Excel'deki karşılık gelen satırın hücre
  metinlerinden **otomatik türetilen** kodlarla birebir aynıdır (statüler,
  tarih koşulları, Evet/Hayır sütunu, sonuç).
- Motor, her Excel satırını (satırın kapsadığı her statü, tarih ve Evet/Hayır
  değeri için) aynen üretir.
- Hiçbir girdi kombinasyonu birbiriyle çelişen satırlara düşmez.

## Excel'i güncelleme

1. `data/kadinlara_esinden_anne_babasindan.xls` dosyasını değiştirin.
2. `pip install xlrd && npm run extract` ile `js/excel-rows.js` ve
   `data/excel-rows.json` dosyalarını yeniden üretin.
3. Yeni veya değişen satırlar için `js/rules.js` içine kural ekleyin.
4. `npm test` çalıştırın; testler eksik ya da tutarsız kuralı satır numarasıyla
   bildirir.

## Kodlama notları

- Excel'de statü ve ölüm tarihi birlikte anlam taşır (ör. "SSK, 1.10.2008
  öncesi" ile "4/I-(a), 30.9.2008 sonrası"). Bu yüzden her seçenek tek bir
  kod altında "kurum + tarih koşulu" olarak sunulur.
- "Ölüm tarihinin önemi yok" yazan hücreler, o kurumun hem eski kanun hem 5510
  karşılığını kapsar (ör. "Tarım Bağkur" → Tarım Bağ-Kur ve 4/I-(b) Tarım).
- Tablo-6'nın 2. satırı yalnızca 4/I-(a), (b), (c) sayar; 4/I-(b.4) bu satıra
  eklenmemiştir. Uygulama bu durumu sonuçta açıklar.
- "Anne ve babadan" ile "İki eşten" tablolarında eşleştirme sıradan
  bağımsızdır (baba/anne ve ilk/ikinci eş yer değiştirebilir).
