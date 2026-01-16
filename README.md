# API İzleyici

## Proje Tanımı
API İzleyici, Chrome DevTools içine eklenen bir paneldir. `chrome.devtools.network.onRequestFinished` kullanarak ağ isteklerini yakalar, son 200 kaydı bellek ve `chrome.storage.session` içinde tutar. DevTools sekme adı "API Monitor" olarak görünür.

## Özellikler
- DevTools paneli: "API Monitor" sekmesi
- İstek/yanıt yakalama ve zamanlama bilgileri
- Arama ve filtreler (hatalar, XHR/Fetch, /api)
- Detay çekmecesi (İstek / Yanıt / Başlıklar / Zamanlama)
- cURL kopyalama, yanıt JSON kopyalama, JSON dışa aktarma
- Gövde boyutu limiti: 200KB (güvenli kısaltma)
- Kısayol ile açılan bağımsız "API İzleyici" ekranı

## Kurulum
```bash
npm i
npm run build
```

## Chrome’a Yükleme
1) `chrome://extensions` adresine gidin
2) Geliştirici modu (Developer mode) seçeneğini açın
3) Paketlenmemiş yükle (Load unpacked) seçeneğini kullanın
4) Proje içindeki `dist` klasörünü seçin
5) DevTools’u açın ve "API Monitor" sekmesini bulun

## Kullanım
- DevTools paneli: `F12` -> "API Monitor" sekmesi
- Kısayol: `Ctrl+Shift+Y` (Mac: `Command+Shift+Y`) -> "API İzleyici" sekmesi açılır
- Arama kutusu ile URL/endpoint/içerik içinde arama yapabilirsiniz.
- Filtreler ile sadece hatalar, XHR/Fetch veya `/api` isteklerini görüntüleyebilirsiniz.
- Bir satıra tıklayın ve sağdaki detay çekmecesinde istek/yanıt içeriklerini inceleyin.
- "cURL olarak kopyala" ile isteği CLI formatında alın.
- "Yanıt JSON'unu kopyala" ile yanıt içeriğini panoya kopyalayın.
- "Dışa Aktar (JSON)" ile tüm kayıtları JSON olarak indirin.

## Kısayol Değiştirme
- `chrome://extensions/shortcuts` adresinden kısayolu değiştirebilirsiniz.

## Sık Karşılaşılan Sorunlar
- Panel görünmüyor: DevTools açık mı? Uzantı yüklü mü? `dist` klasörünü doğru seçtiğinizden emin olun.
- Gövde görünmüyor: Yanıt binary olabilir, içerik çok büyük olabilir veya CORS/DevTools sınırlamaları nedeniyle içerik alınamamış olabilir.
- /api filtresi çalışmıyor: URL içinde "/api" geçmiyorsa filtre doğal olarak boş döner.

## Lisans
MIT

---

MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.