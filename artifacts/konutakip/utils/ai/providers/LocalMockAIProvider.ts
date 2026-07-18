/**
 * LocalMockAIProvider — deterministic mock provider for development and testing.
 *
 * • Always available (no credentials required)
 * • Returns realistic Turkish YKS-themed educational content
 * • Simulates a realistic network delay (400–900 ms)
 * • Never throws unless explicitly asked to via simulateError()
 *
 * This is the ONLY provider active until a real provider is wired in.
 * Swap it out in AIManager.configure() — the rest of the app is unaffected.
 */

import type { IAIProvider } from "../AIProvider";
import {
  AIProviderKind,
  type QuestionGenerationRequest,
  type QuestionGenerationResponse,
  type QuestionEvaluationRequest,
  type QuestionEvaluationResponse,
  type AITeacherRequest,
  type AITeacherResponse,
  type ExplanationStep,
  type StudyCoachRequest,
  type StudyCoachResponse,
  type MiniExamRequest,
  type MiniExamResponse,
  type StudyPlanRequest,
  type StudyPlanResponse,
  type GeneratedQuestion,
} from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAYS_TR = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

function mockDelay(minMs = 400, maxMs = 900): Promise<void> {
  return new Promise((r) => setTimeout(r, minMs + Math.random() * (maxMs - minMs)));
}

function now(): string {
  return new Date().toISOString();
}

function baseResponse(startMs: number): {
  provider: typeof AIProviderKind.LOCAL_MOCK;
  durationMs: number;
  generatedAt: string;
} {
  return {
    provider: AIProviderKind.LOCAL_MOCK,
    durationMs: Date.now() - startMs,
    generatedAt: now(),
  };
}

function makeQuestionId(topicId: string, index: number): string {
  return `mock_q_${topicId}_${index}_${Date.now()}`;
}

// ─── AI Teacher content bank ──────────────────────────────────────────────────

interface TeachContent {
  summary: string;
  steps: ExplanationStep[];
  keyPoints: string[];
  commonMistakes: string[];
  practiceHint: string;
}

function matches(question: string, keywords: string[]): boolean {
  return keywords.some((k) => question.includes(k));
}

function buildTeachContent(question: string, topicName: string): TeachContent {
  const q = question.toLowerCase();

  // ── Parabol / İkinci Derece ────────────────────────────────────────────────
  if (matches(q, ["parabol", "ikinci derece", "tepe nokta", "ax²", "discriminant"])) {
    return {
      summary:
        "Parabol, f(x) = ax² + bx + c biçiminde yazılan ikinci dereceden bir fonksiyonun grafiğidir. " +
        "'a' katsayısı parabolün yönünü belirler: a > 0 ise parabol yukarı açık (U şeklinde), " +
        "a < 0 ise aşağı açık (∩ şeklinde) olur. Parabolün tepe noktası x = -b/2a formülü ile bulunur " +
        "ve bu nokta grafiğin simetri eksenini verir. Diskriminant Δ = b² - 4ac, parabolün x ekseniyle " +
        "kaç noktada kesiştiğini söyler: Δ > 0 ise iki nokta, Δ = 0 ise bir nokta, Δ < 0 ise hiç kesişmez.",
      steps: [
        {
          stepNumber: 1,
          title: "Katsayıları Belirle",
          content: "f(x) = ax² + bx + c ifadesinde a, b ve c katsayılarını yaz. 'a' katsayısı hiçbir zaman sıfır olamaz; olsaydı doğrusal bir fonksiyon olurdu.",
          example: "f(x) = 2x² - 4x + 1 için a = 2, b = -4, c = 1",
        },
        {
          stepNumber: 2,
          title: "Tepe Noktasını Bul",
          content: "Tepe noktasının x koordinatı x = -b/2a formülüyle hesaplanır. y koordinatı ise bu x değeri fonksiyona yazılarak bulunur.",
          example: "x = -(-4)/(2·2) = 1  →  f(1) = 2-4+1 = -1  →  Tepe: (1, -1)",
        },
        {
          stepNumber: 3,
          title: "Diskriminant ve Kökler",
          content: "Δ = b² - 4ac hesapla. Δ > 0 ise iki gerçel kök var; kökleri x = (-b ± √Δ) / 2a formülüyle bul.",
          example: "Δ = 16 - 8 = 8 > 0  →  İki gerçel kök: x = (4 ± 2√2) / 4",
        },
      ],
      keyPoints: [
        "a > 0 → Parabol yukarı açık, a < 0 → Aşağı açık",
        "Tepe noktası: x = -b/2a ile bulunur; fonksiyonun minimum veya maksimum noktasıdır",
        "Δ = b² - 4ac; Δ > 0 iki kök, Δ = 0 bir kök, Δ < 0 gerçel kök yok",
        "Parabolün y-ekseniyle kesişme noktası daima (0, c) noktasıdır",
      ],
      commonMistakes: [
        "Tepe noktası formülünde işaret hatasına dikkat: x = -b/2a (eksi b bölü 2a)",
        "a katsayısının işaretini yanlış okumak ve parabolün yönünü ters çizmek",
      ],
      practiceHint:
        "Farklı a değerleriyle birkaç parabol çiz ve tepe noktasının nasıl değiştiğini gözlemle. TYT'de tepe noktası ve kök soruları sık çıkar.",
    };
  }

  // ── Limit ─────────────────────────────────────────────────────────────────
  if (matches(q, ["limit", "belirsizlik", "l'hôpital", "lhopital", "yaklaşım"])) {
    return {
      summary:
        "Limit, bir fonksiyonun belirli bir noktaya yaklaşırken hangi değere yöneldiğini ifade eder. " +
        "lim(x→a) f(x) = L yazımı, x değeri a'ya yaklaştıkça f(x)'in L'ye yaklaştığı anlamına gelir. " +
        "Limitin var olabilmesi için sol limit ve sağ limitin eşit olması gerekir. " +
        "0/0 veya ∞/∞ gibi belirsizlik durumlarında çarpanlara ayırma, eşlenik çarpma veya " +
        "L'Hôpital kuralı kullanılır.",
      steps: [
        {
          stepNumber: 1,
          title: "Doğrudan Yerine Koyma",
          content: "İlk adım olarak x = a değerini fonksiyona yaz. Sonuç belirli bir sayıysa limit o sayıdır.",
          example: "lim(x→2) (x² + 1) = 4 + 1 = 5",
        },
        {
          stepNumber: 2,
          title: "Belirsizlik Durumlarını Çöz",
          content: "0/0 durumunda pay ve paydayı çarpanlara ayır; ortak çarpanı sadeleştir. Ardından tekrar yerine koy.",
          example: "lim(x→1) (x²-1)/(x-1) = lim(x→1) (x+1)(x-1)/(x-1) = lim(x→1) (x+1) = 2",
        },
        {
          stepNumber: 3,
          title: "Sonsuzda Limit",
          content: "x→∞ durumunda en yüksek dereceli terimi bölen ve bölen için hesap yap; düşük dereceli terimler sıfıra gider.",
          example: "lim(x→∞) (3x²+x)/(x²-2) = 3/1 = 3",
        },
      ],
      keyPoints: [
        "Limitin varlığı için sol limit = sağ limit şartı zorunludur",
        "0/0 belirsizliğinde çarpanlara ayırma veya L'Hôpital dene",
        "x→∞ limitinde en yüksek kuvvetlere göre sadeleştir",
        "Paydada sıfır çıkıyorsa limit yoktur veya ±∞'dur (yan limitlere bak)",
      ],
      commonMistakes: [
        "Belirsizlik olmadan doğrudan L'Hôpital uygulamak (0/0 veya ∞/∞ yoksa kullanılmaz)",
        "Sol ve sağ limiti kontrol etmeden sonuca ulaşmaya çalışmak",
      ],
      practiceHint:
        "Her gün 5-10 limit sorusu çöz; belirsizlik türlerine (0/0, ∞/∞, ∞-∞) göre grupla ve her birinde hangi yöntemi kullanacağını ezberle.",
    };
  }

  // ── Türev ─────────────────────────────────────────────────────────────────
  if (matches(q, ["türev", "derivative", "diferansiyel", "yavaşlama", "hız fonksiyon"])) {
    return {
      summary:
        "Türev, bir fonksiyonun belirli bir noktadaki anlık değişim hızını verir. " +
        "Geometrik olarak türev, o noktadaki teğet doğrusunun eğimidir. " +
        "f'(x) ya da dy/dx notasyonuyla gösterilir. " +
        "Temel türev kuralları: (xⁿ)' = nxⁿ⁻¹, (sin x)' = cos x, (cos x)' = -sin x, " +
        "(eˣ)' = eˣ, (ln x)' = 1/x. Bileşke fonksiyonlar için zincir kuralı kullanılır.",
      steps: [
        {
          stepNumber: 1,
          title: "Kuvvet Kuralını Uygula",
          content: "f(x) = xⁿ fonksiyonunun türevi f'(x) = n·xⁿ⁻¹'dir. Sabitin türevi sıfırdır.",
          example: "f(x) = 3x⁴ + 2x - 5  →  f'(x) = 12x³ + 2",
        },
        {
          stepNumber: 2,
          title: "Çarpım ve Bölüm Kuralları",
          content: "(u·v)' = u'v + uv'  |  (u/v)' = (u'v - uv') / v²",
          example: "(x²·sin x)' = 2x·sin x + x²·cos x",
        },
        {
          stepNumber: 3,
          title: "Zincir Kuralı",
          content: "Bileşke fonksiyon f(g(x))'in türevi f'(g(x))·g'(x)'tir. Dıştan içe doğru türev alınır.",
          example: "(sin(3x))' = cos(3x)·3 = 3cos(3x)",
        },
      ],
      keyPoints: [
        "Kuvvet kuralı: (xⁿ)' = nxⁿ⁻¹ — en sık kullanılan kural",
        "Teğet doğrusunun eğimi m = f'(a) — geometrik yorum budur",
        "Zincir kuralı: dışın türevi × için türevi",
        "Türevin sıfır olduğu noktalar maksimum veya minimum adaydır",
      ],
      commonMistakes: [
        "Bileşke fonksiyonda zincir kuralını unutmak (örn. (sin 2x)' = cos 2x yazıp 2 ile çarpmamak)",
        "Çarpım kuralını uygulamak yerine her iki faktörün türevini ayrı almak",
      ],
      practiceHint:
        "Türev kurallarını tek tek değil beraber çalış: önce kuvvet + toplam, sonra çarpım + bölüm, en son zincir. AYT'de bileşke türevler çok sık çıkar.",
    };
  }

  // ── Trigonometri ──────────────────────────────────────────────────────────
  if (matches(q, ["trigonometri", "sinüs", "kosinüs", "tanjant", "sin", "cos", "tan", "birim çember"])) {
    return {
      summary:
        "Trigonometri, açılar ve kenar uzunlukları arasındaki ilişkileri inceler. " +
        "Birim çember (yarıçapı 1 olan çember) üzerinde, θ açısına karşılık gelen nokta (cos θ, sin θ) koordinatlarını verir. " +
        "Temel özdeşlikler: sin²θ + cos²θ = 1, tan θ = sin θ / cos θ. " +
        "Özel açılar (30°, 45°, 60°, 90°) için değerleri ezberlemek YKS'de büyük avantaj sağlar.",
      steps: [
        {
          stepNumber: 1,
          title: "Özel Açı Değerleri",
          content: "sin 30° = 1/2, cos 30° = √3/2 | sin 45° = cos 45° = √2/2 | sin 60° = √3/2, cos 60° = 1/2 | sin 90° = 1, cos 90° = 0",
          example: "sin 30° + cos 60° = 1/2 + 1/2 = 1",
        },
        {
          stepNumber: 2,
          title: "Temel Özdeşlikler",
          content: "sin²θ + cos²θ = 1 özdeşliği ile biri bilindiğinde diğeri bulunur. 1 + tan²θ = sec²θ da sıklıkla kullanılır.",
          example: "sin θ = 3/5 ise  cos²θ = 1 - 9/25 = 16/25  →  cos θ = ±4/5",
        },
        {
          stepNumber: 3,
          title: "Bağıntılar",
          content: "sin(90°-θ) = cos θ, cos(90°-θ) = sin θ. Bu bağıntılar soru çözümünü kolaylaştırır.",
          example: "sin 70° = cos 20°  (90°-20° = 70° olduğu için)",
        },
      ],
      keyPoints: [
        "Birim çember: P(θ) = (cos θ, sin θ) — açı büyüdükçe nokta çemberde dolaşır",
        "sin²θ + cos²θ = 1 — her zaman geçerli temel özdeşlik",
        "Özel açılar: 0°, 30°, 45°, 60°, 90° için sin ve cos değerleri",
        "İkinci bölgede sin(+), cos(-); üçüncü bölgede ikisi de (-)",
      ],
      commonMistakes: [
        "Özel açı değerlerini sin ve cos için karıştırmak (30° ve 60° sıklıkla yer değiştiriyor)",
        "ASTC kuralını (hangi bölgede hangi fonksiyon pozitif) unutmak",
      ],
      practiceHint:
        "Birim çemberi baştan çizerek özel açı değerlerini türet; ezberlemek yerine anlayarak öğren. TYT'de trigonometri sorularının büyük kısmı özel açı değerleri ve temel özdeşliklerden gelir.",
    };
  }

  // ── Newton Yasaları / Kuvvet ───────────────────────────────────────────────
  if (matches(q, ["newton", "kuvvet", "ivme", "hareket yasası", "eylemsizlik", "f=ma"])) {
    return {
      summary:
        "Newton'un hareket yasaları, klasik mekaniğin temelini oluşturur. " +
        "Birinci yasa (eylemsizlik): Üzerine net kuvvet etki etmeyen cisim duruyorsa durur, hareket ediyorsa sabit hızla hareket eder. " +
        "İkinci yasa: F = ma — net kuvvet, kütleyle ivmenin çarpımına eşittir. " +
        "Üçüncü yasa (etki-tepki): Her kuvvetin büyüklüğü eşit, yönü zıt bir karşı kuvveti vardır.",
      steps: [
        {
          stepNumber: 1,
          title: "Serbest Cisim Diyagramı",
          content: "Problemi çözmeden önce cisme etki eden tüm kuvvetleri (ağırlık, normal, sürtünme, gerilme) diyagram üzerinde göster.",
          example: "Eğik düzlemdeki bir kutu: ağırlık aşağı, normal dik, sürtünme eğime zıt yönde",
        },
        {
          stepNumber: 2,
          title: "Bileşenlere Ayır ve F = ma Uygula",
          content: "Kuvvetleri x ve y eksenlerine ayır, her eksen için ΣF = ma denklemini yaz ve ivmeyi çöz.",
          example: "ΣFx = F - f = ma  |  ΣFy = N - mg = 0  →  N = mg",
        },
        {
          stepNumber: 3,
          title: "Etki-Tepki Çiftleri",
          content: "Etki-tepki kuvvetleri farklı cisimler üzerine etki eder; aynı cismin kuvvetleriyle karıştırma.",
          example: "Zemin ayakkabıya N kuvveti uygular; ayakkabı da zemine N' = N kuvveti uygular (zıt yönde)",
        },
      ],
      keyPoints: [
        "F = ma — net kuvvet, kütle ve ivme arasındaki ilişki",
        "Ağırlık W = mg (m: kütle, g ≈ 10 m/s² yüzey yakınında)",
        "Eylemsizlik: net kuvvet sıfırsa hız değişmez (sıfır da olabilir)",
        "Etki-tepki çiftleri farklı cisimler üzerindedir",
      ],
      commonMistakes: [
        "Ağırlık (W = mg) ile kütleyi (m) karıştırmak — birimler farklıdır (kg vs N)",
        "Normal kuvvetin her zaman mg'ye eşit olduğunu sanmak (eğimde veya ivmeli düzende değişir)",
      ],
      practiceHint:
        "Her mekanik probleminde önce serbest cisim diyagramı çiz; bu alışkanlık hata oranını belirgin şekilde düşürür. TYT'de Newton yasaları her yıl en az 3-4 soru çıkar.",
    };
  }

  // ── Hücre / Biyoloji ──────────────────────────────────────────────────────
  if (matches(q, ["hücre", "dna", "rna", "mitoz", "mayoz", "protein", "biyoloji", "gen", "kromozom"])) {
    return {
      summary:
        "Hücre, canlıların yapısal ve işlevsel temel birimidir. Prokaryot hücreler (bakteriler) zarsız organel ve çekirdek içermez; " +
        "ökaryot hücreler (bitkiler, hayvanlar, mantarlar) ise zarlı organeller ve belirgin bir çekirdek içerir. " +
        "DNA, genetik bilgiyi taşıyan çift sarmal yapılı nükleik asittir; adenin-timin ve guanin-sitozin bazı eşleşmeleri temeldir. " +
        "Mitoz bölünme büyüme ve onarım için eşit kromozomlu iki hücre üretirken, mayoz bölünme üreme hücreleri için kromozom sayısını yarıya indirir.",
      steps: [
        {
          stepNumber: 1,
          title: "Prokaryot vs Ökaryot",
          content: "Prokaryotlar: zarsız organel yok, halkasal DNA, ribozom var. Ökaryotlar: çekirdek, mitokondri, endoplazmik retikulum vb.",
          example: "Bakteri (prokaryot) vs insan kas hücresi (ökaryot)",
        },
        {
          stepNumber: 2,
          title: "DNA ve Baz Eşleşmesi",
          content: "DNA çift sarmalda: Adenin-Timin (A=T, 2 H bağı), Guanin-Sitozin (G≡C, 3 H bağı). RNA'da timin yerine urasil kullanılır.",
          example: "5'-ATGCGA-3' kalıp ipliğinden 3'-TACGCT-5' tamamlayıcı iplik oluşur",
        },
        {
          stepNumber: 3,
          title: "Mitoz ve Mayoz",
          content: "Mitoz: profaz→metafaz→anafaz→telofaz; sonuç 2n+2n. Mayoz: iki bölünme; sonuç n+n+n+n (4 haploid hücre).",
          example: "İnsan: 2n=46 (mitoz) → 2 hücre (her biri 46 krom.) | Mayoz → 4 hücre (her biri 23 krom.)",
        },
      ],
      keyPoints: [
        "A-T (2 bağ), G-C (3 bağ) — DNA baz eşleşme kuralı",
        "Mitoz: eşit bölünme, 2n→2n | Mayoz: indirgemeli bölünme, 2n→n",
        "RNA'da urasil (U) vardır, timin (T) yoktur",
        "Hücre organelleri: ribozom protein sentezi, mitokondri ATP üretimi, kloroplast fotosentez",
      ],
      commonMistakes: [
        "Mitoz ile mayozu karıştırmak — hangi hücrelerde olduğuna ve sonuç hücre sayısına dikkat",
        "DNA replikasyonunda şablonun 3'→5' okunduğunu ve yeni ipliğin 5'→3' sentezlendiğini unutmak",
      ],
      practiceHint:
        "Mitoz evrelerini şema üzerinde çalış; her evre için kromozom sayısını ve hücre görünümünü ayrı ayrı yaz. AYT Biyoloji'de hücre bölünmesi her yıl sorulmaktadır.",
    };
  }

  // ── Paragraf / Türkçe ─────────────────────────────────────────────────────
  if (matches(q, ["paragraf", "türkçe", "ana düşünce", "yardımcı düşünce", "konu", "anlatım biçimi", "cümle"])) {
    return {
      summary:
        "Paragraf, bir ana düşünce etrafında örgütlenmiş, birbiriyle bağlantılı cümlelerden oluşan yazı birimidir. " +
        "Giriş, gelişme ve sonuç cümlelerinden meydana gelir. " +
        "Ana düşünce (ana fikir), paragrafta anlatılmak istenen temel mesajdır ve genellikle başta veya sonda yer alır. " +
        "Yardımcı düşünceler ise ana düşünceyi destekler, örnekler ve açıklamalar içerir. " +
        "TYT Türkçe'de paragraf soruları yaklaşık 20-25 puan ağırlığındadır.",
      steps: [
        {
          stepNumber: 1,
          title: "Ana Düşünceyi Bul",
          content: "Tüm cümleleri okuduktan sonra 'Bu paragrafın tek cümlelik özeti ne olur?' sorusunu sor. Verilen seçeneklerden hangisi bu özeti karşılıyorsa o ana düşüncedir.",
          example: "Paragrafta 'kitap okumanın insan gelişimine katkıları' anlatılıyorsa ana düşünce bu olmalı; 'herkes kitap okumalıdır' değil",
        },
        {
          stepNumber: 2,
          title: "Anlatım Biçimlerini Ayırt Et",
          content: "Açıklama (bilgi verme), tartışma (karşı görüş + savunma), betimleme (duyular + ayrıntı), hikâye etme (olay zinciri), kanıtlama (ispatlama) biçimlerini ayırt et.",
          example: "Bir doğa manzarası ayrıntılı anlatılıyorsa → betimleme; sıralı olaylar varsa → hikâye etme",
        },
        {
          stepNumber: 3,
          title: "Geçiş ve Bağlantı İfadeleri",
          content: "Paragrafta 'ancak', 'bununla birlikte', 'öte yandan', 'bu nedenle' gibi bağlantı sözcükleri cümlelerin ilişkisini gösterir.",
          example: "'Ancak' zıtlık, 'bu nedenle' sonuç, 'örneğin' örnekleme işlevi görür",
        },
      ],
      keyPoints: [
        "Ana düşünce: Paragrafın tüm cümlelerini kapsayan, tek başına anlam taşıyan cümledir",
        "Konu ≠ Ana düşünce: Konu ne hakkında, ana düşünce ne söylüyor",
        "Yardımcı düşünceler ana düşünceyi destekler; bağımsız iddia içermez",
        "Anlatım biçimleri: açıklama, tartışma, betimleme, hikâye etme, kanıtlama",
      ],
      commonMistakes: [
        "Konuyu ana düşünce olarak seçmek — konu isim öbeğidir, ana düşünce yargı içerir",
        "Ana düşüncenin mutlaka ilk cümlede olduğunu sanmak — son cümlede de olabilir",
      ],
      practiceHint:
        "Her paragraf sorusundan önce 30 saniye okuyup 'Bu paragraf bize ne söylüyor?' diye sor. Bu alışkanlık işlem hızını artırır.",
    };
  }

  // ── Kimya / Mol Kavramı ───────────────────────────────────────────────────
  if (matches(q, ["mol", "kimya", "avogadro", "denklem denkleştir", "stokiyometri", "asit baz", "ph"])) {
    return {
      summary:
        "Mol kavramı, kimyada madde miktarını ifade etmek için kullanılan temel birimdir. " +
        "1 mol, 6,02 × 10²³ tane parçacık (Avogadro sayısı) içerir. " +
        "Mol sayısı: n = m/M (m: kütle gram cinsinden, M: molar kütle g/mol). " +
        "Kimyasal denklemlerde katsayılar mol oranlarını verir; bu oran stokiyometri hesaplarının temelidir.",
      steps: [
        {
          stepNumber: 1,
          title: "Molar Kütle Hesapla",
          content: "Bileşiğin formülündeki her elementin atom kütlesini sayısıyla çarp ve topla.",
          example: "H₂O: 2×1 + 1×16 = 18 g/mol  |  NaCl: 23 + 35,5 = 58,5 g/mol",
        },
        {
          stepNumber: 2,
          title: "Mol ve Kütle Dönüşümü",
          content: "n = m/M formülünü kullan. Parçacık sayısı için N = n × Nₐ (Nₐ = 6,02×10²³)",
          example: "36 g su: n = 36/18 = 2 mol  →  2 × 6,02×10²³ = 1,204×10²⁴ molekül",
        },
        {
          stepNumber: 3,
          title: "Denklem Katsayı Oranları",
          content: "Denkleştirilen denklemde katsayılar mol oranını verir. Verilen miktardan bilinmeyeni oranla hesapla.",
          example: "2H₂ + O₂ → 2H₂O: 4 mol H₂ ile maksimum 4 mol H₂O üretilir (2 mol O₂ harcanır)",
        },
      ],
      keyPoints: [
        "1 mol = 6,02 × 10²³ parçacık (Avogadro sayısı)",
        "n = m/M | m = n×M | M = m/n — bu üç ilişkiyi tersten de kullanabilmelisin",
        "Gazlar için: n = V/22,4 (STP'de, 0°C ve 1 atm koşulunda)",
        "Denklem katsayıları mol oranı verir, gram oranı değil",
      ],
      commonMistakes: [
        "Atom kütlesi (mol başına gram) ile gerçek atom kütlesini (u cinsinden) karıştırmak",
        "Denklem katsayılarını doğrudan gram oranı olarak kullanmak",
      ],
      practiceHint:
        "Stokiyometri sorularını adım adım çöz: kütle → mol → denklem oranı → mol → kütle. Bu şemayı her soruda uygula.",
    };
  }

  // ── TYT / AYT genel yönlendirme ───────────────────────────────────────────
  if (matches(q, ["tyt matematik", "tyt mat"])) {
    return {
      summary:
        "TYT Matematik bölümü 40 sorudan oluşur ve genellikle 40 dakika ayrılır. " +
        "Konu dağılımı: temel sayı kavramları, dört işlem, kesirler, oran-orantı, yüzde, sayı basamakları, " +
        "köklü ve üslü sayılar, birinci ve ikinci dereceden denklemler, eşitsizlikler, " +
        "fonksiyonlar, trigonometri temelleri, olasılık ve istatistik.",
      steps: [
        {
          stepNumber: 1,
          title: "Çıkmış Soru Analizi",
          content: "Son 5 yılın TYT Matematik sorularını tara; 'sayı-cebir' %40, 'denklem-eşitsizlik' %25, 'fonksiyon-grafik' %20, 'veri-istatistik' %15 ağırlığındadır.",
          example: "Her kategoriden en çok çıkan 3 konu tipini listele ve önce bunları pekiştir",
        },
        {
          stepNumber: 2,
          title: "Zayıf Konu Planı",
          content: "Deneme sınavlarındaki hatalı sorularını konu bazlı listele; her zayıf konuya ayrı 'onarım seansı' yap.",
        },
        {
          stepNumber: 3,
          title: "Hız ve Doğruluk",
          content: "TYT'de soru başına ortalama 1 dakika düşer. 'Kolay → orta → zor' sıralamasıyla çalış; 80 saniyeyi geçen soruyu geç.",
        },
      ],
      keyPoints: [
        "TYT Matematik: 40 soru — sayı, cebir, denklem, fonksiyon, veri",
        "Yanlış hesaplamayı önlemek için işlemleri hep kenar boşluğuna yaz",
        "Net 30+ için soru bazlı değil konu bazlı çalışmak gerekir",
        "Son 30 dakikada tekrar tarama: boş bırakılan kolayları yakala",
      ],
      commonMistakes: [
        "Zor soruya takılıp kolay soruları atlayarak zaman kaybetmek",
        "Deneme çözmeden teorik tekrar yapmak — aktif pratik şart",
      ],
      practiceHint:
        "Haftada en az 2 tam TYT denemesi çöz ve her sonrasında hata analizini tamamla. Teori + pratik dengesi başarının anahtarıdır.",
    };
  }

  if (matches(q, ["ayt fizik", "ayt fiz"])) {
    return {
      summary:
        "AYT Fizik 14 soru içerir ve puanı doğrudan AYT katsayısıyla etkiler. " +
        "Konu dağılımı: vektörler, kinematik, dinamik (Newton yasaları), iş-güç-enerji, " +
        "momentum, dairesel hareket, basit harmonik hareket, dalgalar, elektrik, manyetizma, " +
        "modern fizik temelleri.",
      steps: [
        {
          stepNumber: 1,
          title: "Formül Listesi Çıkar",
          content: "Her konunun temel formüllerini ayrı bir karta yaz; bağlantıları ve hangi koşulda kullanıldığını not et.",
          example: "Kinematik: v=v₀+at, x=v₀t+½at², v²=v₀²+2ax — üç denklem birbiriyle bağlantılı",
        },
        {
          stepNumber: 2,
          title: "Problem Çözme Şeması",
          content: "Verilenler → Bilinmeyenler → Uygun formül → Çözüm → Birim kontrolü. Bu şemayı her soruda uygula.",
        },
        {
          stepNumber: 3,
          title: "Zor Konulara Odaklan",
          content: "Elektrik, manyetizma ve modern fizik genellikle en düşük başarı oranına sahip. Bu konulara daha fazla süre ayır.",
        },
      ],
      keyPoints: [
        "Serbest cisim diyagramı çizmek hata oranını yarıya indirir",
        "Enerji yöntemi bazen Newton yasalarından daha hızlı çözüm verir",
        "Birim analizi: her formülde birimleri kontrol et",
        "Vektör ve skaler büyüklükleri ayırt et (kuvvet vektör, iş skaler)",
      ],
      commonMistakes: [
        "Enerji korunumunda sürtünme kuvvetini (enerji kaybı) hesaba katmamak",
        "Yüklü parçacık problemlerinde elektrik ve manyetik kuvvetlerin yönünü karıştırmak",
      ],
      practiceHint:
        "AYT Fizik için günde minimum 5 soru çöz; konu bitirmeden soru çözme alışkanlığından vazgeç — anlama olmadan pratik boşa gider.",
    };
  }

  if (matches(q, ["biyoloji tekrar", "biyoloji özet", "biyoloji konu"])) {
    return {
      summary:
        "AYT Biyoloji 13 soru içerir. Konu ağırlıkları: hücre biyolojisi (hücre organelleri, bölünme, solunum, fotosentez) ~%35, " +
        "kalıtım (Mendel yasaları, kantitatif kalıtım, genetik hastalıklar) ~%30, " +
        "evrim ve ekoloji ~%15, insan fizyolojisi (sinir, hormonal sistem, üreme) ~%20.",
      steps: [
        {
          stepNumber: 1,
          title: "Hücre Konusunu Sağlam Otur",
          content: "Mitoz, mayoz, hücresel solunum ve fotosentez denklemleriyle birlikte çalış. Bu konular diğer biyoloji sorularında da kullanılır.",
        },
        {
          stepNumber: 2,
          title: "Kalıtım Problemleri",
          content: "Punnett karesi ve çapraz diyagramlarını hızlıca çizebilmelisin. Bağlı kalıtım, eşey bağlı kalıtım soruları pratik gerektirir.",
        },
        {
          stepNumber: 3,
          title: "Ezber Değil Bağlantı",
          content: "Biyoloji ezber değil bağlantı dersidir. Her organeli işleviyle birlikte öğren, yapı-işlev ilişkisini kur.",
        },
      ],
      keyPoints: [
        "Hücre organelleri: ribozom (protein), mitokondri (ATP), kloroplast (fotosentez)",
        "Mitoz: büyüme/onarım, 2n→2n | Mayoz: üreme, 2n→n",
        "Mendel yasaları: dominantlık, ayrılma, bağımsız dağılım",
        "ATP: hücrenin evrensel enerji birimi",
      ],
      commonMistakes: [
        "DNA replikasyonu ile transkripsiyon (RNA sentezi) ve translasyonu (protein sentezi) karıştırmak",
        "Kalıtım problemlerinde ebeveynlerin genotipini yanlış belirlemek",
      ],
      practiceHint:
        "AYT Biyoloji için konu haritası çiz ve konular arası bağlantıları görselleştir. Ders başına 10 soru çözüm yaparak anlama düzeyini test et.",
    };
  }

  // ── Genel / Varsayılan Yanıt ──────────────────────────────────────────────
  return buildGenericResponse(topicName, question);
}

function buildGenericResponse(topicName: string, question: string): TeachContent {
  // Detect if question is about a specific subject
  const q = question.toLowerCase();
  const isExamQuestion = matches(q, ["soru", "çöz", "hesapla", "bul", "nasıl"]);
  const subject = matches(q, ["matematik", "mat"]) ? "Matematik"
    : matches(q, ["fizik"]) ? "Fizik"
    : matches(q, ["kimya"]) ? "Kimya"
    : matches(q, ["biyoloji", "bio"]) ? "Biyoloji"
    : matches(q, ["türkçe", "edebiyat"]) ? "Türkçe/Edebiyat"
    : matches(q, ["tarih"]) ? "Tarih"
    : matches(q, ["coğrafya"]) ? "Coğrafya"
    : "Genel";

  if (isExamQuestion) {
    return {
      summary:
        `"${topicName}" sorusuna yönelik adım adım çözüm için konunun temel kavramlarından başlamak gerekir. ` +
        `${subject} dersinde bu tür soruları çözmek için önce verilenler ve bilinmeyenleri belirlemeli, ` +
        "ardından uygun yöntemi seçmeli ve işlemleri dikkatli yapmalısın. " +
        "Gerçek AI entegrasyonu tamamlandığında bu soruyu adım adım çözeceğim.",
      steps: [
        {
          stepNumber: 1,
          title: "Soruyu Analiz Et",
          content: "Verilenler ve istenenleri ayrı ayrı yaz. Hangi formül veya yöntemi kullanacağını belirle.",
        },
        {
          stepNumber: 2,
          title: "Çözüm Planı Yap",
          content: `${subject} sorularında sistematik yaklaşım başarıyı artırır. Tanıdık örüntüleri ara.`,
        },
        {
          stepNumber: 3,
          title: "Kontrol Et",
          content: "Sonucu vererek doğruluğunu test et; birimi ve mantığını gözden geçir.",
        },
      ],
      keyPoints: [
        `${subject} sorularında sistematik çözüm şeması: Anla → Planla → Uygula → Kontrol et`,
        "Benzer çözülmüş örneklere bak; örüntüleri tanımak hızı artırır",
        "Birden fazla yöntem denemeye hazır ol",
      ],
      commonMistakes: [
        "Soruyu tam okumadan çözmeye başlamak",
        "Birimleri ve işaret kurallarını gözden kaçırmak",
      ],
      practiceHint:
        `Bu soru türünü iyice anlamak için ${subject} kaynaklarındaki benzer örnekleri incele ve kendin çözmeyi dene.`,
    };
  }

  return {
    summary:
      `"${topicName}" konusu, YKS hazırlığında ele alman gereken önemli bir alandır. ` +
      `Bu konuyu anlamak için temel kavramları sağlam öğrenmek, ardından örnek sorularla pekiştirmek en etkili yoldur. ` +
      "Gerçek AI entegrasyonu tamamlandığında sana kişiselleştirilmiş, kapsamlı bir açıklama sunacağım. " +
      "Şimdilik genel bir çerçeve çiziyorum.",
    steps: [
      {
        stepNumber: 1,
        title: "Temel Kavramları Öğren",
        content: `${topicName} konusunda önce tanımları ve temel kuralları öğren. Ders kitabının ilgili bölümünü oku.`,
      },
      {
        stepNumber: 2,
        title: "Çözümlü Örneklerle Pekiştir",
        content: "Çözümü verilen örnekleri adım adım takip et ve her adımın mantığını anla; sadece sonuçları kopyalama.",
      },
      {
        stepNumber: 3,
        title: "Bağımsız Pratik Yap",
        content: "Örnekleri kendin kapatarak benzer soruları çöz. Hataları belirle ve tekrar çalış.",
      },
    ],
    keyPoints: [
      `${topicName} konusunu tam anlamak için temel ve ileri kavramları birlikte çalış`,
      "Pasif okuma değil aktif çözme alışkanlığı edinin",
      "Zayıf noktaları belirleyip onlara odaklanmak zamanı verimli kullandırır",
    ],
    commonMistakes: [
      "Konuyu yüzeysel okuyup anladığını sanmak — test etmeden geçme",
      "Hata yapılan soruları analiz etmeden geçmek",
    ],
    practiceHint:
      `Günde ${topicName} konusundan 5-10 soru çöz ve her hata yaptığında neden hata yaptığını yaz. Bu alışkanlık sınavda fark yaratır.`,
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export class LocalMockAIProvider implements IAIProvider {
  readonly kind = AIProviderKind.LOCAL_MOCK;
  readonly isAvailable = true;

  // ── Question Generation ────────────────────────────────────────────────────

  async generateQuestions(
    req: QuestionGenerationRequest
  ): Promise<QuestionGenerationResponse> {
    const start = Date.now();
    await mockDelay();

    const questions: GeneratedQuestion[] = Array.from({ length: req.count }, (_, i) => ({
      id: makeQuestionId(req.topicId, i),
      topicId: req.topicId,
      topicName: req.topicName,
      subjectName: req.subjectName,
      questionText: `${req.topicName} konusunda soru ${i + 1}: Bu konuyla ilgili hangisi doğrudur?`,
      options: [
        { key: "A", text: "Birinci şık — doğru yanıt" },
        { key: "B", text: "İkinci şık — yanlış" },
        { key: "C", text: "Üçüncü şık — yanlış" },
        { key: "D", text: "Dördüncü şık — yanlış" },
        { key: "E", text: "Beşinci şık — yanlış" },
      ],
      correctAnswer: "A",
      explanation: `Bu soruda ${req.topicName} konusunun temel kavramı test edilmektedir. Doğru yanıt A şıkkıdır çünkü tanım bunu gerektirir.`,
      difficulty: req.difficulty === "mixed" ? (["easy", "medium", "hard"] as const)[i % 3] : req.difficulty,
      estimatedTimeSeconds: req.difficulty === "hard" ? 90 : req.difficulty === "medium" ? 60 : 45,
    }));

    return {
      ...baseResponse(start),
      requestId: req.requestId,
      questions,
      requestedCount: req.count,
      deliveredCount: questions.length,
    };
  }

  // ── Question Evaluation ────────────────────────────────────────────────────

  async evaluateQuestion(
    req: QuestionEvaluationRequest
  ): Promise<QuestionEvaluationResponse> {
    const start = Date.now();
    await mockDelay(300, 600);

    const isCorrect = req.userAnswer === req.correctAnswer;

    return {
      ...baseResponse(start),
      requestId: req.requestId,
      isCorrect,
      explanation: `${req.topicName} sorusunun doğru yanıtı "${req.correctAnswer}" şıkkıdır. ${isCorrect ? "Tebrikler, doğru yanıtladın!" : `Sen "${req.userAnswer}" seçtin ancak bu yanlış.`}`,
      improvementTip: isCorrect
        ? ""
        : `${req.topicName} konusunu tekrar çalışmanı öneririz. Özellikle temel tanımlara odaklan.`,
      relatedTopicsToReview: isCorrect ? [] : [req.topicName, req.subjectName],
    };
  }

  // ── AI Teacher ─────────────────────────────────────────────────────────────

  async teachTopic(req: AITeacherRequest): Promise<AITeacherResponse> {
    const start = Date.now();
    await mockDelay();

    const question = req.userQuestion ?? req.topicName;
    const content = buildTeachContent(question, req.topicName);

    return {
      ...baseResponse(start),
      requestId: req.requestId,
      summary: content.summary,
      steps: content.steps,
      keyPoints: content.keyPoints,
      commonMistakes: content.commonMistakes,
      practiceHint: content.practiceHint,
    };
  }

  // ── Study Coach ────────────────────────────────────────────────────────────

  async coachStudent(req: StudyCoachRequest): Promise<StudyCoachResponse> {
    const start = Date.now();
    await mockDelay();

    const { learnerSnapshot: s } = req;

    return {
      ...baseResponse(start),
      requestId: req.requestId,
      overallAssessment: `TYT ilerlemesi %${s.tytProgressPct}, AYT ilerlemesi %${s.aytProgressPct}. ${s.studyStreakDays} günlük seri harika! Sınava ${s.daysUntilExam} gün kaldı.`,
      recommendations: [
        {
          id: "mock_rec_1",
          type: "action",
          priority: "high",
          title: "Bu Haftanın Önceliği",
          body: s.weakSubjectNames.length > 0
            ? `${s.weakSubjectNames.slice(0, 2).join(", ")} derslerinde eksikler var. Bu hafta bunlara odaklan.`
            : "Genel ilerleme iyi görünüyor. Tempoyu koru.",
          estimatedImpact: "high",
          relatedTopicIds: [],
        },
        {
          id: "mock_rec_2",
          type: "insight",
          priority: "medium",
          title: "Tempo Analizi",
          body: `Günde ortalama ${Math.ceil(s.totalTopicsCompleted / Math.max(1, 30))} konu tamamlıyorsun. Sınava yetişmek için bu tempoyu koru.`,
          estimatedImpact: "medium",
        },
        {
          id: "mock_rec_3",
          type: "encouragement",
          priority: "low",
          title: "Motivasyon",
          body: "Her gün küçük adımlar atmak, büyük hedefe ulaşmanın en güvenilir yoludur. Devam et!",
          estimatedImpact: "low",
        },
      ],
      weeklyFocusSuggestion: `Bu hafta TYT'ye ağırlık ver ve her gün en az 1 AYT konusu ekle.`,
      motivationalMessage: "Başarı bir yolculuktur, varış değil. Sen bu yolun en doğru yolcususun!",
    };
  }

  // ── Mini Exams ─────────────────────────────────────────────────────────────

  async generateMiniExam(req: MiniExamRequest): Promise<MiniExamResponse> {
    const start = Date.now();
    await mockDelay(600, 1200);

    const questions: GeneratedQuestion[] = Array.from(
      { length: req.questionCount },
      (_, i) => {
        const topicId = req.weakTopicIds[i % Math.max(1, req.weakTopicIds.length)] ?? "mock_topic";
        return {
          id: makeQuestionId(topicId, i),
          topicId,
          topicName: `Zayıf Konu ${(i % Math.max(1, req.weakTopicIds.length)) + 1}`,
          subjectName: req.examType === "TYT" ? "Türkçe" : "Matematik",
          questionText: `${req.examType} Mini Sınavı — Soru ${i + 1}`,
          options: [
            { key: "A", text: "Doğru şık" },
            { key: "B", text: "Yanlış şık" },
            { key: "C", text: "Yanlış şık" },
            { key: "D", text: "Yanlış şık" },
            { key: "E", text: "Yanlış şık" },
          ],
          correctAnswer: "A",
          explanation: `Soru ${i + 1} açıklaması — gerçek AI ile içerik üretilecek.`,
          difficulty: req.difficulty,
          estimatedTimeSeconds: (req.targetDurationMinutes * 60) / req.questionCount,
        };
      }
    );

    return {
      ...baseResponse(start),
      requestId: req.requestId,
      exam: {
        id: `mock_exam_${Date.now()}`,
        title: `${req.examType} Mini Denemesi`,
        description: `Zayıf konularına odaklanan ${req.questionCount} soruluk mini deneme.`,
        examType: req.examType,
        questions,
        totalTimeSeconds: req.targetDurationMinutes * 60,
        targetedWeakAreas: req.weakTopicIds,
      },
    };
  }

  // ── Study Plans ────────────────────────────────────────────────────────────

  async generateStudyPlan(req: StudyPlanRequest): Promise<StudyPlanResponse> {
    const start = Date.now();
    await mockDelay();

    const today = new Date();
    const weeklyPlan: StudyPlanResponse["weeklyPlan"] = Array.from(
      { length: Math.min(req.planDurationDays, 7) },
      (_, i) => {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        return {
          date: date.toISOString().split("T")[0],
          dayLabel: DAYS_TR[date.getDay() === 0 ? 6 : date.getDay() - 1],
          totalMinutes: req.dailyAvailableMinutes,
          sessions: [
            {
              subjectName: "Matematik",
              topicNames: [`Konu ${i * 2 + 1}`, `Konu ${i * 2 + 2}`],
              durationMinutes: Math.floor(req.dailyAvailableMinutes * 0.4),
              priority: i < 2 ? "high" : "medium",
            },
            {
              subjectName: "Türkçe",
              topicNames: [`Paragraf Türleri`],
              durationMinutes: Math.floor(req.dailyAvailableMinutes * 0.3),
              priority: "medium",
            },
            {
              subjectName: req.studyField === "say" ? "Fizik" : "Tarih",
              topicNames: [`${req.studyField.toUpperCase()} Konusu`],
              durationMinutes: Math.floor(req.dailyAvailableMinutes * 0.3),
              priority: "low",
            },
          ],
        };
      }
    );

    return {
      ...baseResponse(start),
      requestId: req.requestId,
      weeklyPlan,
      totalTopicsCovered: weeklyPlan.length * 3,
      estimatedCompletionPct: Math.min(
        100,
        Math.round(
          ((req.incompleteTYTTopicIds.length + req.incompleteAYTTopicIds.length > 0)
            ? (weeklyPlan.length * 3 * 100) /
              (req.incompleteTYTTopicIds.length + req.incompleteAYTTopicIds.length)
            : 100)
        )
      ),
      notes:
        "Bu plan örnek verilerle oluşturulmuştur. Gerçek AI entegrasyonu tamamlandığında kişiselleştirilmiş plan üretilecektir.",
    };
  }
}
