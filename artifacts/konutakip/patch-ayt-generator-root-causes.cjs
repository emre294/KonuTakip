const fs = require("fs");

const filePath =
  "./generate-ayt-subtopics-official.cjs";

let code = fs
  .readFileSync(filePath, "utf8")
  .replace(/^\uFEFF/, "")
  .replace(/\r\n/g, "\n");

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function replaceBetween(
  startMarker,
  endMarker,
  replacement,
  label,
) {
  const start = code.indexOf(startMarker);
  const end = code.indexOf(
    endMarker,
    start,
  );

  ensure(
    start !== -1,
    `${label} başlangıcı bulunamadı`,
  );

  ensure(
    end !== -1,
    `${label} bitişi bulunamadı`,
  );

  code =
    code.slice(0, start) +
    replacement +
    code.slice(end);
}

/* =========================================================
 * 1. JSON + MADDE LISTESI PARSER
 * ========================================================= */

replaceBetween(
  "function extractJsonArray(content) {",
  "function sanitizeSubtopics(",
`function extractJsonArray(content) {
  const cleaned = String(content ?? "")
    .replace(/\`\`\`json/gi, "")
    .replace(/\`\`\`/g, "")
    .trim();

  const arrayStart =
    cleaned.indexOf("[");

  const arrayEnd =
    cleaned.lastIndexOf("]");

  if (
    arrayStart !== -1 &&
    arrayEnd > arrayStart
  ) {
    try {
      const parsed = JSON.parse(
        cleaned.slice(
          arrayStart,
          arrayEnd + 1,
        ),
      );

      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Aşağıdaki güvenli liste parserına geç.
    }
  }

  const objectStart =
    cleaned.indexOf("{");

  const objectEnd =
    cleaned.lastIndexOf("}");

  if (
    objectStart !== -1 &&
    objectEnd > objectStart
  ) {
    try {
      const parsedObject = JSON.parse(
        cleaned.slice(
          objectStart,
          objectEnd + 1,
        ),
      );

      const arrayValue = Object.values(
        parsedObject,
      ).find(Array.isArray);

      if (Array.isArray(arrayValue)) {
        return arrayValue;
      }
    } catch {
      // Satır parserına geç.
    }
  }

  const quotedItems = [
    ...cleaned.matchAll(
      /["“”]([^"“”]{3,180})["“”]/g,
    ),
  ].map((match) => match[1]);

  if (quotedItems.length >= 3) {
    return quotedItems;
  }

  const listItems = cleaned
    .split("\\n")
    .map((line) =>
      line
        .replace(
          /^\\s*(?:[-•*]|\\d+[.)])\\s*/,
          "",
        )
        .trim(),
    )
    .filter(
      (line) =>
        line.length >= 3 &&
        line.length <= 180 &&
        !/^(?:açıklama|not|sonuç|json|alt kazanımlar?)\\s*:?$/i.test(
          line,
        ),
    );

  if (listItems.length >= 3) {
    return listItems;
  }

  throw new Error(
    "AI cevabında ayrıştırılabilir alt kazanım listesi bulunamadı",
  );
}

`,
  "Çıktı parserı",
);

/* =========================================================
 * 2. KALITE FILTRESI
 * ========================================================= */

replaceBetween(
  "function sanitizeSubtopics(",
  "async function callBackend(",
`function sanitizeSubtopics(
  topicName,
  values,
) {
  const seen = new Set();

  const metaPattern =
    /^(?:not|uyarı|açıklama|gerekçe|kanıt|resmî kanıt|verilen metin|bu konu|aşağıdaki alt kazanımlar)/i;

  const studyPattern =
    /genel tekrar|konu anlatımı|soru çözümü|test çözme|çalışma programı/i;

  const cleaned = values
    .map((value) =>
      String(value ?? "")
        .replace(
          /^\\s*[-•*\\d.)]+\\s*/,
          "",
        )
        .replace(/^["“”]|["“”]$/g, "")
        .replace(/\\s+/g, " ")
        .trim(),
    )
    .filter(Boolean)
    .filter(
      (value) =>
        !metaPattern.test(value) &&
        !studyPattern.test(value),
    )
    .filter((value) => {
      const key = normalize(value);

      if (
        key.length < 3 ||
        key === normalize(topicName) ||
        seen.has(key)
      ) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, 10);

  ensure(
    cleaned.length >= 3,
    \`En az 3 geçerli alt kazanım gerekli: \${cleaned.length}\`,
  );

  ensure(
    cleaned.length <= 10,
    "En fazla 10 alt kazanım olabilir",
  );

  for (const item of cleaned) {
    ensure(
      item.length <= 150,
      \`Alt kazanım çok uzun: \${item}\`,
    );
  }

  return cleaned;
}

`,
  "Kalite filtresi",
);

/* =========================================================
 * 3. SORU VALIDATORUNDEN AYIR
 * ========================================================= */

code = code.replace(
  /feature:\s*"ai_teacher"/g,
  'feature: "ai_coach"',
);

/* =========================================================
 * 4. PROMPTTA SORU URETIMINI ACIKCA YASAKLA
 * ========================================================= */

code = code.replace(
  '"Yalnızca JSON string dizisi döndür.",',
`"Kesinlikle soru, seçenek, cevap anahtarı veya çözüm üretme.",
    "Yalnızca alt kazanım adlarını üret.",
    "Yalnızca JSON string dizisi döndür.",`,
);

code = code.replace(
  '"Yalnızca düzeltilmiş JSON string dizisini döndür.",',
`"Kesinlikle soru, seçenek, cevap anahtarı veya çözüm üretme.",
    "Yalnızca düzeltilmiş JSON string dizisini döndür.",`,
);

/* =========================================================
 * 5. YANLIS KANIT PARCASINI KULLANMA
 * ========================================================= */

replaceBetween(
  "function buildEvidenceText(",
  "function escapeTs(",
`function buildEvidenceText(
  topic,
  evidenceEntry,
) {
  const directEvidence = String(
    evidenceEntry?.evidence ?? "",
  )
    .replace(/\\s+/g, " ")
    .trim();

  const topicWords = normalize(
    topic.name,
  )
    .split(" ")
    .filter(
      (word) =>
        word.length >= 5 &&
        ![
          "sistemi",
          "donemi",
          "bilgisi",
          "temelleri",
          "devleti",
        ].includes(word),
    );

  const normalizedEvidence =
    normalize(directEvidence);

  const matchingWordCount =
    topicWords.filter(
      (word) =>
        normalizedEvidence.includes(word),
    ).length;

  const evidenceIsRelevant =
    directEvidence.length >= 250 &&
    (
      topicWords.length === 0 ||
      matchingWordCount >= 1
    );

  if (evidenceIsRelevant) {
    return directEvidence.slice(
      0,
      9000,
    );
  }

  return [
    "Resmî AYT ana konu başlığı:",
    topic.name,
    "",
    "Bu ana konunun doğrudan kavram, işlem,",
    "yorumlama ve uygulama kazanımlarını çıkar.",
    "Ana konu dışındaki ders veya konulara geçme.",
    "Başka konulardan örnek kazanım ekleme.",
  ].join("\\n");
}

`,
  "Kanıt uygunluk kontrolü",
);

/* =========================================================
 * 6. HER TURDA EN FAZLA 12 YENI KONU
 * ========================================================= */

const loopAnchor =
`  for (
    let index = 0;
    index < topics.length;
    index += 1
  ) {`;

ensure(
  code.includes(loopAnchor),
  "Ana üretim döngüsü bulunamadı",
);

if (
  !code.includes(
    "const maxTopicsThisRun",
  )
) {
  code = code.replace(
    loopAnchor,
`  const maxTopicsThisRun = Math.max(
    1,
    Number(
      process.env.AYT_MAX_TOPICS_PER_RUN ??
      "12",
    ),
  );

  let attemptedThisRun = 0;

${loopAnchor}`,
  );
}

const skipEndAnchor =
`      continue;
    }

    console.log(
      "============================================================",
    );`;

ensure(
  code.includes(skipEndAnchor),
  "Tamamlanan konu atlama bloğu bulunamadı",
);

if (
  !code.includes(
    "attemptedThisRun >= maxTopicsThisRun",
  )
) {
  code = code.replace(
    skipEndAnchor,
`      continue;
    }

    if (
      attemptedThisRun >=
      maxTopicsThisRun
    ) {
      break;
    }

    attemptedThisRun += 1;

    console.log(
      "============================================================",
    );`,
  );
}

/* =========================================================
 * 7. SON KONTROLLER
 * ========================================================= */

ensure(
  code.includes(
    'feature: "ai_coach"',
  ),
  "Alt kazanım görevi soru validatoründen ayrılamadı",
);

ensure(
  code.includes(
    "evidenceIsRelevant",
  ),
  "Kanıt uygunluk denetimi eklenmedi",
);

ensure(
  code.includes(
    "quotedItems",
  ),
  "Esnek çıktı parserı eklenmedi",
);

ensure(
  code.includes(
    "maxTopicsThisRun",
  ),
  "Kısa tur sınırı eklenmedi",
);

ensure(
  code.includes(
    "Kesinlikle soru, seçenek",
  ),
  "Soru üretmeme kuralı eklenmedi",
);

fs.writeFileSync(
  filePath,
  code.trimEnd() + "\n",
  "utf8",
);

console.log("AYT_GENERATOR_ROOT_FIX_OK");
