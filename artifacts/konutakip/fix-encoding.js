const fs=require("fs");
const file=process.argv[2];
if(!file||!fs.existsSync(file)){console.error("Dosya bulunamadi: "+file);process.exit(1);}
const backup=file+".bak-nodefix";
fs.copyFileSync(file,backup);
const special=[0x20ac,null,0x201a,0x0192,0x201e,0x2026,0x2020,0x2021,0x02c6,0x2030,0x0160,0x2039,0x0152,null,0x017d,null,null,0x2018,0x2019,0x201c,0x201d,0x2022,0x2013,0x2014,0x02dc,0x2122,0x0161,0x203a,0x0153,null,0x017e,0x0178];
const inverse={};
for(let i=0;i<special.length;i++){if(special[i]!=null)inverse[special[i]]=128+i;}
function score(s){return (s.match(/[\u00c2\u00c3\u00c4\u00c5\u00c6\u00e2\u00f0\ufffd]/g)||[]).length;}
function convert(s){const bytes=[];for(const ch of s){const cp=ch.codePointAt(0);if(cp<=127||(cp>=160&&cp<=255)){bytes.push(cp);}else if(inverse[cp]!=null){bytes.push(inverse[cp]);}else{bytes.push(...Buffer.from(ch,"utf8"));}}return Buffer.from(bytes).toString("utf8");}
function repair(line){let text=line;for(let i=0;i<4;i++){const candidate=convert(text);if(score(candidate)>=score(text)||candidate.includes("\ufffd"))break;text=candidate;}return text;}
const original=fs.readFileSync(file,"utf8");
let changed=0;
const fixed=original.split(/\r?\n/).map(line=>{const next=score(line)>0?repair(line):line;if(next!==line)changed++;return next;}).join("\n");
fs.writeFileSync(file,fixed,"utf8");
console.log("Duzeltilen satir sayisi: "+changed);
console.log("Yedek: "+backup);
const remaining=fixed.split(/\r?\n/).map((line,i)=>score(line)>0?(i+1)+": "+line:null).filter(Boolean);
if(remaining.length){console.log("Kalan supheli satirlar:");console.log(remaining.join("\n"));}else{console.log("Bozuk karakter kalmadi.");}
