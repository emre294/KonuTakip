export type StudyField = "sayisal" | "esitAgirlik" | "sozel";

export interface Topic {
  id: string;
  name: string;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  topics: Topic[];
}

export interface ExamSection {
  id: string;
  name: string;
  subjects: Subject[];
}

function makeTopics(subjectId: string, names: string[]): Topic[] {
  return names.map((name, i) => ({ id: `${subjectId}-${i}`, name }));
}

export const TYT_SUBJECTS: Subject[] = [
  {
    id: "tyt-turkce",
    name: "Türkçe",
    color: "#8B5CF6",
    topics: makeTopics("tyt-turkce", [
      "Sözcükte Anlam",
      "Cümlede Anlam",
      "Sözcük Türleri",
      "Fiil",
      "Cümlenin Ögeleri",
      "Paragraf",
      "Yazım Kuralları",
      "Noktalama İşaretleri",
      "Ses Bilgisi",
      "Sözcük Yapısı",
    ]),
  },
  {
    id: "tyt-matematik",
    name: "Temel Matematik",
    color: "#2563EB",
    topics: makeTopics("tyt-matematik", [
      "Sayılar ve Sayı Sistemleri",
      "Doğal Sayılarda İşlemler",
      "Bölme ve Bölünebilme",
      "EBOB ve EKOK",
      "Kesirler ve Ondalıklar",
      "Üslü Sayılar",
      "Köklü Sayılar",
      "Oran-Orantı",
      "Yüzde ve Kâr-Zarar",
      "Temel Kavramlar",
      "Denklemler",
      "Eşitsizlikler",
      "Üçgenler",
      "Dörtgenler ve Çokgenler",
      "Çember ve Daire",
      "Olasılık",
      "İstatistik",
      "Problemler",
    ]),
  },
  {
    id: "tyt-fen-fizik",
    name: "Fen Bilimleri (Fizik)",
    color: "#0891B2",
    topics: makeTopics("tyt-fen-fizik", [
      "Fiziksel Büyüklükler ve Ölçme",
      "Madde ve Özellikleri",
      "Hareket ve Kuvvet",
      "Basınç ve Kaldırma Kuvveti",
      "Isı ve Sıcaklık",
      "Elektrostatik",
      "Optik",
    ]),
  },
  {
    id: "tyt-fen-kimya",
    name: "Fen Bilimleri (Kimya)",
    color: "#0D9488",
    topics: makeTopics("tyt-fen-kimya", [
      "Atom ve Periyodik Sistem",
      "Maddenin Halleri",
      "Karışımlar",
      "Asit-Baz",
      "Kimyasal Tepkimeler",
      "Organik Kimya Temelleri",
    ]),
  },
  {
    id: "tyt-fen-biyoloji",
    name: "Fen Bilimleri (Biyoloji)",
    color: "#16A34A",
    topics: makeTopics("tyt-fen-biyoloji", [
      "Hücre ve Organeller",
      "Canlıların Sınıflandırılması",
      "Kalıtım",
      "Ekosistem",
      "Bitkilerde Üreme",
    ]),
  },
  {
    id: "tyt-sosyal-tarih",
    name: "Sosyal Bilimler (Tarih)",
    color: "#B45309",
    topics: makeTopics("tyt-sosyal-tarih", [
      "Tarih Bilimine Giriş",
      "Uygarlığın Doğuşu",
      "İlk Türk Devletleri",
      "İslam Tarihi",
      "Türkiye Tarihi",
    ]),
  },
  {
    id: "tyt-sosyal-cografya",
    name: "Sosyal Bilimler (Coğrafya)",
    color: "#9333EA",
    topics: makeTopics("tyt-sosyal-cografya", [
      "Coğrafyaya Giriş",
      "Dünya'nın Şekli ve Hareketleri",
      "İklim",
      "Türkiye'nin Fiziki Coğrafyası",
      "Nüfus",
    ]),
  },
  {
    id: "tyt-sosyal-felsefe",
    name: "Sosyal Bilimler (Felsefe)",
    color: "#DB2777",
    topics: makeTopics("tyt-sosyal-felsefe", [
      "Felsefeye Giriş",
      "Bilgi Felsefesi",
      "Ahlak Felsefesi",
    ]),
  },
  {
    id: "tyt-sosyal-din",
    name: "Sosyal Bilimler (Din Kültürü)",
    color: "#EA580C",
    topics: makeTopics("tyt-sosyal-din", [
      "İslam'ın Temel Kaynakları",
      "Hz. Muhammed'in Hayatı",
      "Ahlak ve Değerler",
    ]),
  },
];

const AYT_MATEMATIK_TOPICS = makeTopics("ayt-matematik", [
  "Mantık",
  "Kümeler",
  "Fonksiyonlar",
  "Denklemler",
  "İkinci Dereceden Denklemler",
  "Trigonometri",
  "Analitik Geometri - Doğru",
  "Analitik Geometri - Çember",
  "Logaritma",
  "Diziler",
  "Limit ve Süreklilik",
  "Türev",
  "İntegral",
  "Olasılık ve İstatistik",
]);

const AYT_FIZIK: Subject = {
  id: "ayt-fizik",
  name: "Fizik",
  color: "#0891B2",
  topics: makeTopics("ayt-fizik", [
    "Vektörler",
    "Kinematik",
    "Dinamik",
    "İş-Enerji-Güç",
    "Momentum ve İmpuls",
    "Basit Harmonik Hareket",
    "Dalgalar",
    "Elektrik Alanı",
    "Manyetizma",
    "Optik",
    "Modern Fizik",
    "Elektromanyetik İndüksiyon",
  ]),
};

const AYT_KIMYA: Subject = {
  id: "ayt-kimya",
  name: "Kimya",
  color: "#0D9488",
  topics: makeTopics("ayt-kimya", [
    "Kimyasal Türler ve Tepkimeler",
    "Asit-Baz Dengesi",
    "Çözünürlük Dengesi",
    "Elektrokimya",
    "Organik Kimya",
    "Karbon Kimyası",
    "Makromoleküller",
    "Reaksiyon Hızı",
    "Kimyasal Denge",
    "Gazlar Teorisi",
    "Endüstriyel Kimya",
    "Çevre Kimyası",
  ]),
};

const AYT_BIYOLOJI: Subject = {
  id: "ayt-biyoloji",
  name: "Biyoloji",
  color: "#16A34A",
  topics: makeTopics("ayt-biyoloji", [
    "Hücre Biyolojisi",
    "Hücre Bölünmesi",
    "Kalıtım",
    "DNA ve Genetik Kod",
    "Evrim",
    "Ekosistem ve Çevre",
    "Sindirim Sistemi",
    "Dolaşım Sistemi",
    "Solunum Sistemi",
    "Boşaltım Sistemi",
    "Bitki Biyolojisi",
    "Biyoteknoloji",
  ]),
};

const AYT_EDEBIYAT: Subject = {
  id: "ayt-edebiyat",
  name: "Türk Dili ve Edebiyatı",
  color: "#8B5CF6",
  topics: makeTopics("ayt-edebiyat", [
    "Divan Edebiyatı",
    "Halk Edebiyatı",
    "Tanzimat Dönemi",
    "Servet-i Fünun",
    "Fecr-i Ati",
    "Milli Edebiyat",
    "Cumhuriyet Dönemi",
    "Roman ve Hikaye",
    "Şiir Bilgisi",
    "Tiyatro",
    "Deneme-Makale",
    "Dil Bilgisi",
  ]),
};

const AYT_TARIH1: Subject = {
  id: "ayt-tarih1",
  name: "Tarih 1",
  color: "#B45309",
  topics: makeTopics("ayt-tarih1", [
    "Osmanlı Devleti'nin Kuruluşu",
    "Yükselme Dönemi",
    "Duraklama Dönemi",
    "Gerileme Dönemi",
    "Tanzimat Dönemi",
    "I. Meşrutiyet",
    "II. Meşrutiyet",
    "Osmanlı'nın Çöküşü",
  ]),
};

const AYT_COGRAFYA1: Subject = {
  id: "ayt-cografya1",
  name: "Coğrafya 1",
  color: "#9333EA",
  topics: makeTopics("ayt-cografya1", [
    "Nüfus ve Yerleşme",
    "Ulaşım",
    "Tarım",
    "Sanayi",
    "Enerji Kaynakları",
    "Türkiye'nin İklimi",
    "Bitkiler ve Toprak",
    "Doğal Afetler",
  ]),
};

const AYT_TARIH2: Subject = {
  id: "ayt-tarih2",
  name: "Tarih 2",
  color: "#DC2626",
  topics: makeTopics("ayt-tarih2", [
    "Fransız Devrimi",
    "Sanayi Devrimi",
    "Milliyetçilik Hareketleri",
    "I. Dünya Savaşı",
    "Kurtuluş Savaşı",
    "Atatürk İlkeleri",
    "II. Dünya Savaşı",
    "Soğuk Savaş",
  ]),
};

const AYT_COGRAFYA2: Subject = {
  id: "ayt-cografya2",
  name: "Coğrafya 2",
  color: "#0891B2",
  topics: makeTopics("ayt-cografya2", [
    "Ülkeler ve Bölgeler",
    "Küreselleşme",
    "Çevre Sorunları",
    "Kalkınma",
    "Nüfus Sorunları",
    "Göç",
    "Enerji Politikaları",
    "Kıtalar Coğrafyası",
  ]),
};

const AYT_FELSEFE: Subject = {
  id: "ayt-felsefe",
  name: "Felsefe Grubu",
  color: "#DB2777",
  topics: makeTopics("ayt-felsefe", [
    "Psikolojiye Giriş",
    "Davranış Psikolojisi",
    "Sosyolojiye Giriş",
    "Toplumsal Yapı",
    "Mantık",
    "Felsefenin Alanları",
    "Bilgi ve Gerçeklik",
    "Siyaset Felsefesi",
  ]),
};

const AYT_DIN: Subject = {
  id: "ayt-din",
  name: "Din Kültürü",
  color: "#EA580C",
  topics: makeTopics("ayt-din", [
    "İslam'ın Temel Kaynakları",
    "Hz. Muhammed'in Hayatı",
    "İslam'ın İbadetleri",
    "Ahlak ve Değerler",
    "Dinler Tarihi",
    "Türk-İslam Düşünürleri",
    "Değerler Eğitimi",
    "Çağdaş Dini Akımlar",
  ]),
};

export const AYT_SUBJECTS_BY_FIELD: Record<StudyField, Subject[]> = {
  sayisal: [
    { id: "ayt-matematik", name: "Matematik", color: "#2563EB", topics: AYT_MATEMATIK_TOPICS },
    AYT_FIZIK,
    AYT_KIMYA,
    AYT_BIYOLOJI,
  ],
  esitAgirlik: [
    { id: "ayt-matematik", name: "Matematik", color: "#2563EB", topics: AYT_MATEMATIK_TOPICS },
    AYT_EDEBIYAT,
    AYT_TARIH1,
    AYT_COGRAFYA1,
  ],
  sozel: [
    AYT_EDEBIYAT,
    AYT_TARIH1,
    AYT_COGRAFYA1,
    AYT_TARIH2,
    AYT_COGRAFYA2,
    AYT_FELSEFE,
    AYT_DIN,
  ],
};

export const FIELD_LABELS: Record<StudyField, string> = {
  sayisal: "Sayısal",
  esitAgirlik: "Eşit Ağırlık",
  sozel: "Sözel",
};

export const TYT_EXAM_DATE = new Date("2027-06-14T09:30:00");
export const AYT_EXAM_DATE = new Date("2027-06-15T09:30:00");
