const fs = require("fs");

const path = "./app/ai-teacher.tsx";
let code = fs.readFileSync(path, "utf8");

function replaceRequired(pattern, replacement, label) {
  const updated = code.replace(pattern, replacement);

  if (updated === code) {
    throw new Error(label + " bulunamadı.");
  }

  code = updated;
}

replaceRequired(
  /body:\s*\{\s*color:\s*colors\.foreground,\s*fontSize:\s*15,\s*fontFamily:\s*"Inter_400Regular",\s*lineHeight:\s*\d+,\s*\}/,
  `body: {
      color: colors.foreground,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      lineHeight: 23,
    }`,
  "Markdown body"
);

replaceRequired(
  /bullet_list:\s*\{\s*marginVertical:\s*\d+,\s*\}/,
  `bullet_list: {
      marginTop: 3,
      marginBottom: 8,
    }`,
  "bullet_list"
);

if (!code.includes("ordered_list: {")) {
  code = code.replace(
    `    ordered_list_icon: {
      color: AI_COLOR,
      fontFamily: "Inter_600SemiBold",
    },`,
    `    ordered_list: {
      marginTop: 3,
      marginBottom: 8,
    },
    ordered_list_icon: {
      color: AI_COLOR,
      fontFamily: "Inter_600SemiBold",
    },
    list_item: {
      marginBottom: 4,
    },`
  );
}

replaceRequired(
  /blockquote:\s*\{\s*backgroundColor:\s*AI_COLOR\s*\+\s*"12",\s*borderLeftColor:\s*AI_COLOR,\s*borderLeftWidth:\s*3,\s*paddingHorizontal:\s*12,\s*paddingVertical:\s*8,\s*borderRadius:\s*6,\s*marginVertical:\s*6,\s*\}/,
  `blockquote: {
      backgroundColor: AI_COLOR + "12",
      borderLeftColor: AI_COLOR,
      borderLeftWidth: 3,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      marginTop: 6,
      marginBottom: 8,
    }`,
  "blockquote"
);

replaceRequired(
  /fence:\s*\{\s*backgroundColor:\s*colors\.muted,\s*borderRadius:\s*10,\s*padding:\s*12,\s*\}/,
  `fence: {
      backgroundColor: colors.muted,
      color: colors.foreground,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
      fontSize: 14,
      lineHeight: 21,
    }`,
  "fence"
);

code = code.replace(
  /paragraph:\s*\{\s*marginTop:\s*0,\s*marginBottom:\s*\d+,\s*\}/,
  `paragraph: {
      marginTop: 0,
      marginBottom: 4,
    }`
);

code = code.replace(
  /aiBubble:\s*\{\s*width:\s*"100%",\s*maxWidth:\s*"100%",\s*borderRadius:\s*20,\s*borderTopLeftRadius:\s*6,\s*paddingHorizontal:\s*16,\s*paddingVertical:\s*14,/,
  `aiBubble: {
    width: "100%",
    maxWidth: "100%",
    borderRadius: 18,
    borderTopLeftRadius: 5,
    paddingHorizontal: 15,
    paddingVertical: 12,`
);

code = code.replace(
  /userBubble:\s*\{\s*width:\s*"100%",\s*maxWidth:\s*"100%",\s*borderRadius:\s*20,\s*borderTopRightRadius:\s*6,\s*paddingHorizontal:\s*16,\s*paddingVertical:\s*\d+,/,
  `userBubble: {
    width: "100%",
    maxWidth: "100%",
    borderRadius: 18,
    borderTopRightRadius: 5,
    paddingHorizontal: 15,
    paddingVertical: 11,`
);

fs.writeFileSync(path, code, "utf8");
console.log("PATCH_OK");
