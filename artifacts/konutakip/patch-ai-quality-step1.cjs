const fs = require("fs");

const featurePath = "./backend/src/featurePrompts.ts";
const systemPath = "./backend/src/prompts.ts";

let feature = fs.readFileSync(featurePath, "utf8");
let system = fs.readFileSync(systemPath, "utf8");

function replaceBlock(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  if (start === -1) {
    throw new Error(label + " başlangıcı bulunamadı.");
  }

  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end === -1) {
    throw new Error(label + " sonu bulunamadı.");
  }

  return (
    source.slice(0, start) +
    replacement +
    source.slice(end)
  );
}

const questionQualityRules = `
SORU ÜRETİMİ KALİTE KONTROLÜ:
- Soruyu göndermeden önce sessizce çöz.
- Tam olarak bir doğru seçenek bulunduğunu doğrula.
- Birden fazla doğru seçenek varsa soruyu veya seçenekleri yeniden oluştur.
- Hiçbir doğru seçenek yoksa soruyu yeniden oluştur.
- Doğru cevabı soru kökünde, açıklamada, başlıkta veya seçeneklerin biçiminde ele verme.
- Soru kökünde "doğru cevap", "cevap", "çözüm" veya seçeneği açık eden ifade kullanma.
- Seçenekler birbirinden anlamlı biçimde farklı olsun.
- Aynı veya eş anlamlı seçenekleri tekrar etme.
- Çeldiriciler konuya uygun, makul ve öğrencinin yapabileceği hatalara dayalı olsun.
- "Hepsi", "Hiçbiri", "Yukarıdakilerin tümü" gibi seçenekler kullanma.
- Seçenek uzunlukları birbirine yakın olsun.
- Doğru seçenek sürekli aynı harfte bulunmasın.
- Gerçek ÖSYM sorusunu kopyalama; yalnızca ölçme mantığına uygun özgün soru üret.
- Soru, verilen sınav türü ve zorluk seviyesine gerçekten uygun olsun.
- Soru metni açık, eksiksiz ve tek anlamlı olsun.
- Gereksiz ipucu, açıklama ve öğretici notu soru köküne ekleme.
- Çözüm ile doğru seçenek birbiriyle tam uyumlu olsun.

TÜRKÇE VE DİL BİLGİSİ SORULARI:
- Bağlaç olan "de/da" ayrı yazılır ve cümleden çıkarıldığında temel anlam bozulmaz.
- Bulunma hâl eki "-de/-da/-te/-ta" kelimeye bitişik yazılır.
- Bağlaç olan "ki" ayrı, ek olan "-ki" bitişik yazılır.
- "mi" soru edatı ayrı yazılır.
- Yazım veya dil bilgisi sorularında bütün seçenekleri kurala göre tek tek kontrol et.
- Birden fazla seçeneğin doğru olmasına izin verme.
- Tartışmalı, bağlama göre değişebilen veya istisnası belirsiz örnek kullanma.
- Kural adını yanlış kullanma; bağlaç ile hâl ekini birbirine karıştırma.

MATEMATİK VE FEN SORULARI:
- Sayısal sonucu çözerek doğrula.
- Mümkünse sonucu yerine koyarak veya ters işlemle kontrol et.
- Birim, işaret, koşul ve tanım kümesi hatası yapma.
- Çeldiricileri gerçek işlem hatalarından üret.
`.trim();

const generateQuestions = `  "generate-questions": \`
Verilen öğrenci, ders, konu, sınav türü, seviye ve adet bilgilerine göre özgün sorular üret.

Kurallar:
- TYT veya AYT seviyesine uygun ol.
- İstenen soru sayısına tam uy.
- Her soru 5 seçenekli olsun: A, B, C, D ve E.
- Her soruda yalnızca bir doğru cevap bulunsun.
- Her sorunun doğru cevabını ve adım adım çözümünü soru metninden ayrı alanda ver.
- Gerçek ÖSYM sorularını birebir kopyalama.
- Ham LaTeX kullanma.
- JSON alanlarını eksiksiz ve tutarlı doldur.

\${questionQualityRules}
\`,
`;

const practiceQuestion = `  "practice-question": \`
Verilen konu ve seviyeye göre tek bir özgün pratik sorusu üret.

Kurallar:
- TYT veya AYT seviyesine uygun ol.
- Tam olarak 5 seçenek oluştur: A, B, C, D ve E.
- Yalnızca bir doğru cevap bulunsun.
- Doğru cevabı soru metninden ayrı alanda belirt.
- Çözümü adım adım göster.
- Ham LaTeX kullanma.
- Soru kökünde cevabı veya çözümü ele veren açıklama yazma.

\${questionQualityRules}

\${STEP_BY_STEP_RULES}
\`,
`;

const miniExam = `  "mini-exam": \`
Verilen zayıf konu ve derslere göre uyarlanabilir mini sınav hazırla.

Kurallar:
- İstenen soru sayısına tam uy.
- TYT veya AYT seviyesine uygun ol.
- Her soru 5 seçenekli olsun: A, B, C, D ve E.
- Her sorunun yalnızca bir doğru cevabı olsun.
- Sorular farklı kazanımları ölçsün.
- Cevap anahtarını sorulardan sonra ayrı bölümde ver.
- Adım adım çözümleri cevap anahtarından sonra ayrı bölümde ver.
- Soru metninde cevap veya çözüm ipucu bulunmasın.
- Ham LaTeX kullanma.

\${questionQualityRules}
\`,
`;

feature = feature.replace(
  "const FEATURE_INSTRUCTIONS: Record<AIFeature, string> = {",
  questionQualityRules +
    "\n\nconst FEATURE_INSTRUCTIONS: Record<AIFeature, string> = {"
);

feature = replaceBlock(
  feature,
  '  "generate-questions": `',
  '  "evaluate-question": `',
  generateQuestions,
  "generate-questions"
);

feature = replaceBlock(
  feature,
  '  "practice-question": `',
  '  "coach": `',
  practiceQuestion,
  "practice-question"
);

feature = replaceBlock(
  feature,
  '  "mini-exam": `',
  '  "study-plan": `',
  miniExam,
  "mini-exam"
);

system = system.replace(
`ÖSYM VE YKS UYUMU
- TYT veya AYT seviyesini dikkate al.
- Soru üretirken aksi söylenmedikçe 5 seçenek oluştur.
- Yalnızca bir doğru cevap bulunmasını sağla.
- Gerçek ÖSYM sorularını birebir kopyalama.
- Çeldiricileri mantıklı oluştur.`,
`ÖSYM VE YKS UYUMU
- TYT veya AYT seviyesini dikkate al.
- Soru üretirken aksi söylenmedikçe A, B, C, D ve E olmak üzere 5 seçenek oluştur.
- Her soruyu göndermeden önce sessizce çöz.
- Tam olarak bir doğru seçenek bulunduğunu doğrula.
- Birden fazla doğru seçenek varsa soruyu yeniden oluştur.
- Hiçbir doğru seçenek yoksa soruyu yeniden oluştur.
- Doğru cevabı soru kökünde, başlıkta, açıklamada veya biçimlendirmede ele verme.
- Çözüm ve cevap anahtarını soru metninden ayrı tut.
- Aynı veya eş anlamlı seçenekleri tekrar etme.
- Çeldiricileri öğrencinin yapabileceği gerçek hatalara dayandır.
- "Hepsi", "Hiçbiri" ve benzeri toplu seçenekleri kullanma.
- Seçeneklerin uzunluklarını ve anlatım biçimlerini birbirine yakın tut.
- Gerçek ÖSYM sorularını birebir kopyalama.
- Soruyu açık, tek anlamlı ve ölçülebilir biçimde yaz.

TÜRKÇE SORULARI İÇİN ZORUNLU KONTROL
- Bağlaç olan "de/da" ayrı yazılır.
- Bulunma hâl eki "-de/-da/-te/-ta" bitişik yazılır.
- Bağlaç ile eki birbirine karıştırma.
- Bağlaç olan "ki" ayrı, ek olan "-ki" bitişik yazılır.
- "mi" soru edatı ayrı yazılır.
- Bütün seçenekleri kurala göre tek tek kontrol et.
- Birden fazla doğru cevap doğurabilecek tartışmalı örnek kullanma.
- Soru kökünde doğru cevabı açıklayan öğretici not verme.

MATEMATİK VE FEN SORULARI İÇİN ZORUNLU KONTROL
- Sayısal sonucu işlem yaparak doğrula.
- Mümkünse yerine koyma veya ters işlemle kontrol et.
- Birim, işaret, koşul ve tanım kümesini kontrol et.
- Çeldiricileri gerçek işlem veya yorum hatalarından üret.`
);

system = system.replace(
`SON KONTROL
Cevabı göndermeden önce sessizce kontrol et:
- Türkçe düzgün mü?
- Adımlar eksiksiz mi?
- Sonuç doğru mu?
- Ham LaTeX kaldı mı?
- Bozuk karakter var mı?
- Gereksiz uzunluk veya tekrar var mı?
- Kullanıcının asıl sorusu cevaplandı mı?`,
`SON KONTROL
Cevabı göndermeden önce sessizce kontrol et:
- Türkçe düzgün mü?
- Adımlar eksiksiz mi?
- Sonuç doğru mu?
- Ham LaTeX kaldı mı?
- Bozuk karakter var mı?
- Gereksiz uzunluk veya tekrar var mı?
- Kullanıcının asıl sorusu cevaplandı mı?
- Soru üretildiyse tam olarak bir doğru seçenek var mı?
- Soru üretildiyse bütün seçenekleri tek tek kontrol ettim mi?
- Çözüm ile cevap anahtarı aynı sonucu veriyor mu?
- Soru metni doğru cevabı ele veriyor mu?
- Türkçe sorusunda bağlaç ile eki doğru ayırdım mı?
- Birden fazla doğru cevaba yol açan belirsizlik var mı?

Bu kontrollerden biri başarısızsa cevabı göndermeden önce düzelt.`
);

fs.writeFileSync(featurePath, feature, "utf8");
fs.writeFileSync(systemPath, system, "utf8");

console.log("PROMPT KALİTE KURALLARI GÜNCELLENDİ");
