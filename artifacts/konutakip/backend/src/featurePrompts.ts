export type AIFeature =
  | "generate-questions"
  | "evaluate-question"
  | "teach-topic"
  | "explain-question"
  | "analyze-mistakes"
  | "practice-question"
  | "coach"
  | "mini-exam"
  | "study-plan";

const FEATURE_INSTRUCTIONS: Record<AIFeature, string> = {
  "generate-questions": `
Verilen öğrenci, ders, konu, sınav türü, seviye ve adet bilgilerine göre özgün sorular üret.

Kurallar:
- TYT veya AYT seviyesine uygun ol.
- Her soru 5 seçenekli olsun.
- Yalnızca bir doğru cevap bulunsun.
- Çeldiriciler mantıklı olsun.
- Her soruda doğru cevap ve açıklamalı çözüm yer alsın.
- Gerçek ÖSYM sorularını birebir kopyalama.
`,

  "evaluate-question": `
Öğrencinin verdiği cevabı değerlendir.

Kurallar:
- Cevabın doğru veya yanlış olduğunu açıkça belirt.
- Doğru cevabı yaz.
- Öğrencinin cevabındaki hatayı açıkla.
- Kısa fakat öğretici geri bildirim ver.
- Gerekirse doğru çözüm yolunu adım adım göster.
`,

  "teach-topic": `
Verilen konuyu öğrenciye öğret. Aşağıdaki bölümleri sırayla yaz. Her bölüm için Markdown başlığı kullan.

## [Konu Adı]

### 📌 Kısa Özet
Konuyu 2–3 cümleyle özetle.

### 📖 Detaylı Anlatım
Konuyu açık, anlaşılır şekilde anlat. Gerektiğinde alt başlıklar ekle.

### 🔑 Temel Kavramlar
Her kavramı **kalın** yaz ve kısa tanımla.

### 📐 Formüller ve Kurallar
Formülleri ve önemli kuralları listele. LaTeX yerine Unicode kullan (×, ÷, √, ≤, ≥).

### 🎯 ÖSYM İpuçları
Sınavda sık çıkan soru tipleri ve dikkat edilmesi gereken noktalar.

### ✅ Çözümlü Örnek
Tipik bir soruyu adım adım çöz.

### ⚠️ Sık Yapılan Hatalar
Öğrencilerin en çok yaptığı hataları listele.

### 🧪 Mini Test
2–3 kısa soru sor ve cevapları altına yaz.

### 💡 Sonuç
Konuyu 1–2 cümleyle özetle ve çalışma önerisi ver.

Kurallar:
- Yalnızca Markdown metin çıkışı ver.
- JSON veya kod bloğu üretme.
- Anlatımı öğrencinin sınav türü ve seviyesine göre düzenle.
`,

  "explain-question": `
Verilen soruyu ayrıntılı şekilde çöz ve açıkla.

### 🔍 Soru Analizi
Verilenleri ve isteneni belirle.

### 📝 Çözüm Adımları
Her adımı sırayla açıkla. Her önemli adımın nedenini kısaca belirt.

### ✅ Sonuç Doğrulama
Sonucu kontrol et. Çoktan seçmeli soruda doğru seçeneği net biçimde yaz.

### ⚠️ Yanlış Cevap Analizi (varsa)
Öğrencinin yanlış cevabı neden yanlış olduğunu açıkla.

Kurallar:
- Yalnızca Markdown metin çıkışı ver.
- JSON veya kod bloğu üretme.
`,

  "analyze-mistakes": `
Öğrencinin yanlış sorularını ve hata kayıtlarını analiz et.

Her önemli hata için şunları belirt:
- Zayıf konu
- Hata türü
- Muhtemel neden
- Nasıl düzeltileceği
- Önerilen tekrar
- Önerilen soru sayısı

Sonunda öncelik sırasına göre kısa bir gelişim planı oluştur.
`,

  "practice-question": `
Verilen konu ve seviyeye göre tek bir özgün pratik sorusu üret.

Kurallar:
- TYT veya AYT seviyesine uygun ol.
- 5 seçenek oluştur.
- Yalnızca bir doğru cevap bulunsun.
- Doğru cevabı belirt.
- Ayrıntılı çözüm ekle.
- Çeldiriciler mantıklı olsun.
`,

  "coach": `
Öğrencinin ilerleme, tamamlanan konular, yanlış sorular, çalışma geçmişi ve hedef bilgilerini incele.

Şunları üret:
- Mevcut durum değerlendirmesi
- Güçlü yönler
- Öncelikli eksikler
- Bugün yapılacak en önemli görevler
- Gerçekçi çalışma önerileri
- Kısa motivasyon mesajı

Genel ve yüzeysel tavsiyeler yerine gönderilen öğrenci verilerini kullan.
`,

  "mini-exam": `
Verilen zayıf konu ve derslere göre uyarlanabilir bir mini sınav hazırla.

Kurallar:
- Soru sayısına uy.
- TYT veya AYT seviyesine uygun ol.
- Her soru 5 seçenekli olsun.
- Her sorunun tek doğru cevabı olsun.
- Sorular farklı kazanımları ölçsün.
- Cevap anahtarı ve açıklamalı çözümler ekle.
`,

  "study-plan": `
Öğrencinin hedefi, müsait zamanı, eksik konuları, zayıf dersleri ve çalışma geçmişine göre haftalık çalışma planı hazırla.

Plan şunları içersin:
- Gün gün görevler
- Ders ve konu dağılımı
- Konu çalışması
- Soru çözümü
- Tekrar
- Yanlış analizi
- Deneme
- Dinlenme veya hafif gün

Plan gerçekçi, sürdürülebilir ve öğrencinin verilerine özel olsun.
`
};

/** Features that must return plain Markdown text (not JSON). */
const TEXT_OUTPUT_FEATURES = new Set<AIFeature>([
  "teach-topic",
  "explain-question",
  "coach",
  "study-plan",
]);

const TEXT_OUTPUT_RULES = `
ÇIKTI KURALLARI:
- Yalnızca okunabilir Türkçe Markdown metin çıkışı ver.
- JSON, kod bloğu veya HTML etiketi kullanma.
- Kullanıcıya gösterilecek nihai metni üret; talimatları açıklama.
- İstek verisindeki alanları dikkate al.
- Eksik bilgi varsa makul varsayımı açıkça belirt.
`.trim();

const JSON_OUTPUT_RULES = `
ÇIKTI KURALLARI:
- Yalnızca geçerli JSON üret.
- Markdown kod bloğu kullanma.
- JSON öncesinde veya sonrasında açıklama yazma.
- Alan isimlerini İngilizce yaz.
- Kullanıcıya gösterilecek metinlerin değerlerini Türkçe yaz.
- İstek verisindeki alanları dikkate al.
- Eksik bilgi varsa makul ve açık bir varsayım kullan.
- Uydurma öğrenci geçmişi veya istatistik oluşturma.
`.trim();

export function buildFeaturePrompt(
  feature: AIFeature,
  requestData: Record<string, unknown>
): string {
  const instruction = FEATURE_INSTRUCTIONS[feature];
  const outputRules = TEXT_OUTPUT_FEATURES.has(feature)
    ? TEXT_OUTPUT_RULES
    : JSON_OUTPUT_RULES;

  return `
GÖREV TÜRÜ:
${feature}

ÖZEL TALİMAT:
${instruction}

UYGULAMADAN GELEN İSTEK VERİSİ:
${JSON.stringify(requestData, null, 2)}

${outputRules}
`.trim();
}
