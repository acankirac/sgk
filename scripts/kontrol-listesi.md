# Elle kontrol listesi (demo öncesi)

Otomatik testler (`npm test`) kural–Excel tutarlılığını ve sihirbaz mantığını
doğrular. Aşağıdakiler tarayıcıda elle bir kez kontrol edilir.

## Görünüm

- [ ] 360 px genişlikte, A+ ile en büyük yazı kademesinde yatay kaydırma yok
      (Chrome DevTools → cihaz modu; `document.documentElement.scrollWidth <= innerWidth`).
- [ ] Koyu temada (sistem ayarı) tüm sonuç kutuları okunuyor.
- [ ] Windows "Yüksek kontrast" ve macOS "Kontrastı artır" açıkken kutu kenarlıkları görünüyor.

## Adım adım mod

- [ ] Her ekranda tek soru; kart tıklanınca ilerliyor; "← Geri" önceki soruya dönüyor
      ve sonraki cevapları siliyor.
- [ ] Yıl alanına yalnızca yıl yazıp Enter'a basınca ilerliyor; 2008 yazınca gün soruluyor.
- [ ] Emekli Sandığı + 15.10.2008 sonrası vefatta memuriyet başlangıcı soruluyor;
      öncesinde sorulmuyor.
- [ ] "Bilmiyorum" seçilince iki olasılık ve satır numaraları görünüyor.
- [ ] Sonuçta "Değiştir" ilgili kişinin ilk sorusuna dönüyor.

## Ekran okuyucu ve klavye

- [ ] NVDA + Chrome, VoiceOver + Safari, TalkBack + Chrome: her adımda soru bir kez
      okunuyor, sonuç kutusu (role=status) duyuruluyor, odak kaybolmuyor.
- [ ] Tüm akış yalnızca klavyeyle (Tab, Enter, Boşluk) tamamlanıyor; odak halkası görünür.

## Sesli okuma ve yazdırma

- [ ] "Sesli oku" Türkçe sesle okuyor; "Durdur" durduruyor; adım değişince susuyor.
- [ ] "Yazdır" → PDF: tek sayfa, verilen bilgiler, sonuç, dayanak satırın hücreleri,
      sürüm damgası ve not satırı görünüyor; ekranın geri kalanı basılmıyor.
- [ ] "Kopyala" ve "Bağlantıyı kopyala" panoya yazıyor; bağlantı yeni sekmede aynı sonucu açıyor.

## Çevrimdışı

- [ ] HTTPS'te bir kez açıldıktan sonra DevTools → Application → Offline ile yenilenince
      uygulama açılıyor ve sorgu çalışıyor.
- [ ] Telefonda "Ana ekrana ekle" simgesi ve adı ("Çift Aylık") doğru.
