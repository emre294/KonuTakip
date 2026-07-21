const fs=require("fs");
const file=process.argv[2];
if(!file||!fs.existsSync(file)){console.error("Dosya bulunamadi");process.exit(1);}
const backup=file+".bak-deepfix";
fs.copyFileSync(file,backup);
const map=[0x20ac,null,0x201a,0x0192,0x201e,0x2026,0x2020,0x2021,0x02c6,0x2030,0x0160,0x2039,0x0152,null,0x017d,null,null,0x2018,0x2019,0x201c,0x201d,0x2022,0x2013,0x2014,0x02dc,0x2122,0x0161,0x203a,0x0153,null,0x017e,0x0178];
const inverse={};
for(let i=0;i<map.length;i++){if(map[i]!=null)inverse[map[i]]=128+i;}
function badScore(s){
 let n=0;
 const patterns=[/\u00c3/g,/\u00c2/g,/\u00c4/g,/\u00c5/g,/\u00c6/g,/\u00e2/g,/\u00f0/g,/\u0192/g,/\u00c5\u00b8/g,/\ufffd/g];
 for(const r of patterns)n+=(s.match(r)||[]).length;
 n+=(s.match(/[\u0080-\u009f]/g)||[]).length*3;
 return n;
}
function cpBytes(s){
 const out=[];
 for(const ch of s){
  const cp=ch.codePointAt(0);
  if(cp<=255)out.push(cp);
  else if(inverse[cp]!=null)out.push(inverse[cp]);
  else out.push(...Buffer.from(ch,"utf8"));
 }
 return Buffer.from(out);
}
function decodeOnce(s){return cpBytes(s).toString("utf8");}
function repair(s){
 let best=s;
 let bestScore=badScore(s);
 for(let i=0;i<12;i++){
  const next=decodeOnce(best);
  if(next.includes("\ufffd"))break;
  const score=badScore(next);
  if(score>=bestScore)break;
  best=next;
  bestScore=score;
 }
 return best;
}
const original=fs.readFileSync(file,"utf8");
const newline=original.includes("\r\n")?"\r\n":"\n";
let changed=0;
const fixed=original.split(/\r?\n/).map(line=>{
 if(badScore(line)===0)return line;
 const next=repair(line);
 if(next!==line)changed++;
 return next;
}).join(newline);
fs.writeFileSync(file,fixed,"utf8");
console.log("Duzeltilen satir sayisi: "+changed);
console.log("Yedek: "+backup);
const remaining=fixed.split(/\r?\n/).map((line,i)=>badScore(line)>0?(i+1)+": "+line:null).filter(Boolean);
if(remaining.length){console.log("Kalan supheli satir sayisi: "+remaining.length);console.log(remaining.slice(0,30).join("\n"));}
else console.log("Bozuk karakter kalmadi.");
