export interface Quote {
  text: string;
  author: string;
}

export const motivationalQuotes: Quote[] = [
  {
    text: "Disiplin, hedeflerine olan sevginin eylemdeki yansımasıdır.",
    author: "Anonim",
  },
  {
    text: "Her gün küçük bir adım atmak, büyük bir fark yaratır. Tutarlılık, yeteneği yener.",
    author: "Anonim",
  },
  {
    text: "Başarı, her gün tekrarlanan küçük çabaların toplamıdır.",
    author: "Robert Collier",
  },
  {
    text: "Zor olan şeyleri bugün yap, böylece yarın her şey kolaylaşır.",
    author: "Anonim",
  },
  {
    text: "Sınavda değil, çalışma masasında kazanılır.",
    author: "Anonim",
  },
  {
    text: "Bugünkü fedakarlıkların, yarınki özgürlüğünün bedelidir.",
    author: "Anonim",
  },
  {
    text: "Motivasyon seni başlatır; alışkanlık seni ilerlетir.",
    author: "Jim Ryun",
  },
  {
    text: "Her konu başarıldığında, hedefe bir adım daha yaklaşırsın.",
    author: "Anonim",
  },
  {
    text: "Hayal ettiğin üniversiteye, bugün çalıştığın kadar yakınsın.",
    author: "Anonim",
  },
  {
    text: "Karanlıkta ışığını kendin olursun. Çalış ve parlat.",
    author: "Anonim",
  },
  {
    text: "Sabır ve kararlılık birlikte doğulmaz; her gün yeniden seçilir.",
    author: "Anonim",
  },
  {
    text: "Sen yalnızca bir sınav vermiyorsun; geleceğini inşa ediyorsun.",
    author: "Anonim",
  },
  {
    text: "Bugün çalışmak istemiyorsan, yarın isteyeceğini san.",
    author: "Anonim",
  },
  {
    text: "Zorluğun büyüklüğü, kazanımın büyüklüğünü belirler.",
    author: "Anonim",
  },
  {
    text: "Her doğru cevap, bir konuyu öğrenmenin ödülüdür.",
    author: "Anonim",
  },
  {
    text: "Bırakmak istediğinde, başlamak istediğin neden hatırla.",
    author: "Anonim",
  },
  {
    text: "Başarı elde etmek için sabah erken kalkmak yeterli; bütün gün çalışmak şart.",
    author: "Anonim",
  },
  {
    text: "Kendinle rekabet et; dünkünden daha iyi ol.",
    author: "Anonim",
  },
];

export function getRandomQuote(): Quote {
  const index = Math.floor(Math.random() * motivationalQuotes.length);
  return motivationalQuotes[index];
}
