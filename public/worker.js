// worker.js — all obfuscation layers run here, off the main thread

function rnd(a,b){return Math.floor(Math.random()*(b-a+1))+a;}
function pick(a){return a[rnd(0,a.length-1)];}
const IDS=["l","I","1","O","0"];
function mkid(n){n=n||rnd(8,14);let s="_";for(let i=0;i<n;i++)s+=pick(IDS);return s;}
function fmtBytes(b){
  if(b>=1073741824)return(b/1073741824).toFixed(2)+" GB";
  if(b>=1048576)return(b/1048576).toFixed(2)+" MB";
  if(b>=1024)return(b/1024).toFixed(2)+" KB";
  return b+" B";
}

// ── BASE LAYERS ───────────────────────────────────────────────────────────────
function L_varMangle(code){
  const map={};
  code=code.replace(/\blocal\s+function\s+([a-zA-Z_]\w*)/g,(m,n)=>{if(!map[n])map[n]=mkid();return"local function "+map[n];});
  code=code.replace(/\blocal\s+([a-zA-Z_]\w*)/g,(m,n)=>{if(!map[n])map[n]=mkid();return"local "+map[n];});
  for(const[k,v]of Object.entries(map))code=code.replace(new RegExp("\\b"+k+"\\b","g"),v);
  return{code,map};
}
function L_strToChars(code){
  return code.replace(/"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g,(m,dq,sq)=>{
    const s=dq!==undefined?dq:sq;if(!s)return'""';
    return"("+s.split("").map(c=>`string.char(${c.charCodeAt(0)})`).join("..")+")";
  });
}
function L_numArith(code){
  return code.replace(/\b(\d+)\b/g,(m,n)=>{
    const v=parseInt(n);if(isNaN(v)||v>999999)return m;
    const a=rnd(1,500);return`(${v+a}-${a})`;
  });
}
function L_junkFlood(code,intensity){
  const count=intensity*40;
  const ops=[
    ()=>{const v=mkid(),x=rnd(1,9999);return`local ${v}=${x};${v}=${v}*${rnd(1,9)}+${rnd(0,99)};${v}=${v}-${v};`;},
    ()=>{const v=mkid(),w=mkid();return`local ${v}=math.huge;local ${w}=${v}*0;`;},
    ()=>{const v=mkid();return`local ${v}=tostring(${rnd(1,99999)});${v}=string.rep(${v},0);`;},
    ()=>{const v=mkid(),t=mkid();return`local ${t}={};for _,${v} in ipairs(${t}) do end;`;},
    ()=>{const v=mkid();return`local ${v}=type(nil)=="nil" and 0 or 1;${v}=0;`;},
    ()=>{const a=mkid(),b=mkid(),c=mkid();return`local ${a},${b},${c}=${rnd(1,99)},${rnd(1,99)},${rnd(1,99)};${a}=${b}+${c}-${b}-${c};`;},
    ()=>{const v=mkid(),f=mkid();return`local function ${f}() return 0 end;local ${v}=${f}();`;},
    ()=>{const v=mkid();return`local ${v}=pcall(function() end) and 0 or 0;`;},
    ()=>{const a=mkid();return`local ${a}={n=0};${a}.n=${a}.n+1-1;`;},
    ()=>{const v=mkid();return`local ${v}=math.max(0,0);${v}=math.min(0,${v});`;},
  ];
  let junk="";for(let i=0;i<count;i++)junk+=pick(ops)()+"\n";
  const lines=code.split("\n"),result=[];
  const jlines=junk.split("\n").filter(Boolean);let ji=0;
  for(const ln of lines){
    result.push(ln);
    const ins=Math.floor(intensity/2)+rnd(0,3);
    for(let k=0;k<ins&&ji<jlines.length;k++,ji++)result.push(jlines[ji]);
  }
  while(ji<jlines.length)result.push(jlines[ji++]);
  return result.join("\n");
}
function L_charFlattener(code){
  const tbl=mkid(10),sc=mkid(8);
  const entries=[];for(let i=32;i<127;i++)entries.push(`[${i}]=${sc}(${i})`);
  const pre=`local ${sc}=string.char;local ${tbl}={${entries.join(",")}};\n`;
  const t=code.replace(/"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g,(m,dq,sq)=>{
    const s=dq!==undefined?dq:sq;if(!s)return'""';
    return"("+s.split("").map(c=>{const cc=c.charCodeAt(0);return cc>=32&&cc<127?`${tbl}[${cc}]`:`${sc}(${cc})`;}).join("..")+")";
  });
  return pre+t;
}
function L_scopeBomb(code,depth){
  depth=depth||4;let r=code;
  for(let i=0;i<depth;i++){const j=mkid(),j2=mkid();r=`do\nlocal ${j}=${rnd(1,999)};local ${j2}=nil;\n${r}\n${j}=nil;\nend`;}
  return r;
}
function L_deadBranch(code){
  const lines=code.split("\n"),out=[];
  const preds=[
    ()=>`if false then local ${mkid()}=0 end`,
    ()=>`if (${rnd(100,999)}<${rnd(1,99)}) then local ${mkid()}=0 end`,
    ()=>`if type(nil)~="nil" then error("x") end`,
    ()=>`if math.huge<0 then local ${mkid()}=0 end`,
    ()=>`if nil then local ${mkid()}=0 end`,
  ];
  for(const ln of lines){
    out.push(ln);
    if(ln.trim().length>2&&Math.random()<0.4)out.push(pick(preds)());
  }
  return out.join("\n");
}
function L_loadstringWrap(code){
  const tag="@_"+Math.random().toString(36).slice(2,10);
  const esc=code.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\r?\n/g,"\\n").replace(/\t/g,"\\t");
  return`assert(load("${esc}","${tag}"))()`;
}
function L_byteArray(code){
  // chunked so we don't blow the call stack on large scripts
  const arr=mkid(),iv=mkid(4),cv=mkid(4);
  const bytes=[];
  for(let i=0;i<code.length;i++)bytes.push(code.charCodeAt(i));
  // build in 500-byte chunks to avoid one giant string concat
  const CHUNK=500;const parts=[];
  for(let i=0;i<bytes.length;i+=CHUNK)parts.push(bytes.slice(i,i+CHUNK).join(","));
  return`local ${arr}={${parts.join(",")}};local ${cv}={};for ${iv}=1,#${arr} do ${cv}[${iv}]=string.char(${arr}[${iv}]) end;assert(load(table.concat(${cv})))()`;
}
function L_polyXor(code){
  const KEY=rnd(5,250);
  const s1=rnd(2,20),offset=rnd(1,20);
  const s2=Math.ceil((KEY-offset)/s1)+rnd(0,2);
  const KEY2=((s1*s2)%251)+offset;
  const kv=mkid(),sv1=mkid(4),sv2=mkid(4),ov=mkid(4);
  const keyExpr=`local ${sv1}=${s1};local ${sv2}=${s2};local ${ov}=${offset};local ${kv}=(${sv1}*${sv2})%251+${ov};`;
  const decFn=mkid(10);
  const decoder=`${keyExpr}local function ${decFn}(s) local r={} for i=1,#s do r[i]=string.char(bit32.bxor(string.byte(s,i),${kv})) end return table.concat(r) end\n`;
  const t=code.replace(/"((?:[^"\\]|\\.)*)"/g,(m,s)=>{
    if(!s||s.length>300)return m;
    let enc="";for(let i=0;i<s.length;i++)enc+="\\"+( s.charCodeAt(i)^KEY2);
    return`${decFn}("${enc}")`;
  });
  return decoder+t;
}
function L_opaquePredicates(code){
  const lines=code.split("\n"),out=[];
  const truePreds=[
    ()=>{const v=mkid(4),n=rnd(2,9);return`(function() local ${v}=${n};return ${v}*${v}>=(0) end)()`;},
    ()=>{const v=mkid(4);return`(function() local ${v}=math.abs(-${rnd(1,99)});return ${v}>=(0) end)()`;},
    ()=>`(select(2,pcall(function()end))=="" or true)`,
    ()=>`(type(tostring)==type(print) and true or true)`,
    ()=>{const n=rnd(1,9);return`(${n}*${n}==${n*n})`;},
  ];
  for(const ln of lines){
    if(ln.trim().length>4&&Math.random()<0.15)out.push(`if ${pick(truePreds)()} then ${ln.trim()} end`);
    else out.push(ln);
  }
  return out.join("\n");
}
function L_strChunkSplit(code){
  return code.replace(/"((?:[^"\\]|\\.){4,})"/g,(m,s)=>{
    if(s.length<4)return m;
    const chunks=[];let pos=0;const nChunks=rnd(2,4);
    for(let i=0;i<nChunks-1;i++){
      const end=pos+Math.max(1,Math.floor(s.length/nChunks)+rnd(-1,1));
      if(end>=s.length)break;
      chunks.push(s.slice(pos,end));pos=end;
    }
    chunks.push(s.slice(pos));
    if(chunks.length<2)return m;
    return"("+chunks.map(c=>JSON.stringify(c)).join("..")+")";
  });
}
function L_microVM(code){
  const pc=mkid(6),ops=mkid(8),run=mkid(6),halt=mkid(6);
  const lines=code.split("\n").filter(l=>l.trim());
  const opcodes=[];
  for(let i=0;i<lines.length;i+=5)opcodes.push(lines.slice(i,i+5).join("\n"));
  if(opcodes.length===0)return code;
  const entries=opcodes.map((op,i)=>{
    const esc=op.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n");
    return`[${i+1}]=function() assert(load("${esc}"))() end`;
  });
  return`local ${pc}=1;local ${halt}=${opcodes.length};local ${ops}={${entries.join(",")}};local function ${run}() while ${pc}<=${halt} do ${ops}[${pc}]();${pc}=${pc}+1 end end;${run}()`;
}
function L_antiExtraction(code){
  const env=mkid(6),sentinel=mkid(6);
  return`local ${env}=0;for _ in pairs(_G) do ${env}=${env}+1 end;local ${sentinel}=${env}>10;\n`+code;
}
function L_tripleLoad(code){
  const bytes1=[];for(let i=0;i<code.length;i++)bytes1.push(code.charCodeAt(i));
  const rev=bytes1.slice().reverse();
  const rv=mkid(),ri=mkid(4),rc=mkid(4);
  const shell1=`local ${rv}={${rev.join(",")}};local ${rc}={};for ${ri}=1,#${rv} do ${rc}[${ri}]=string.char(${rv}[#${rv}-${ri}+1]) end;assert(load(table.concat(${rc})))()`;
  const K2=rnd(11,99);
  const bytes2=[];for(let i=0;i<shell1.length;i++)bytes2.push(shell1.charCodeAt(i)^K2);
  const fa=rnd(2,10),k2v=mkid(6),k2a=mkid(4),k2b=mkid(4),k2i=mkid(3),k2c=mkid(3),k2r=mkid(3);
  const fb=Math.ceil(K2/fa);
  const shell2=`local ${k2a}=${fa};local ${k2b}=${fb};local ${k2v}=(${k2a}*${k2b})%256;local ${k2r}={${bytes2.join(",")}};local ${k2c}={};for ${k2i}=1,#${k2r} do ${k2c}[${k2i}]=string.char(bit32.bxor(${k2r}[${k2i}],${k2v})) end;assert(load(table.concat(${k2c})))()`;
  const bytes3=[];for(let i=0;i<shell2.length;i++)bytes3.push(shell2.charCodeAt(i));
  const s3a=mkid(),s3i=mkid(3),s3c=mkid(3);
  return`local ${s3a}={${bytes3.join(",")}};local ${s3c}={};for ${s3i}=1,#${s3a} do ${s3c}[${s3i}]=string.char(${s3a}[${s3i}]) end;assert(load(table.concat(${s3c})))()`;
}
function L_flowMangle(code){
  const sv=mkid(),tv=mkid(),dv=mkid();
  return`local ${sv}=1;local ${dv}=false;local ${tv};${tv}=function()\n`+code+`\n${dv}=true end;while not ${dv} do ${tv}();${sv}=${sv}+1;if ${sv}>99999 then break end end;`;
}
function padToSize(code,targetBytes){
  if(!targetBytes||targetBytes<=0||code.length>=targetBytes)return code;
  const needed=targetBytes-code.length;
  let pad="";
  while(pad.length<needed){
    const v=mkid(10),x=rnd(100000,9999999),y=rnd(1,9999);
    pad+=`local ${v}=${x};${v}=${v}+${y}-${y};${v}=nil;\n`;
  }
  return pad.slice(0,needed)+code;
}
function compact(c){return c.replace(/\r?\n/g," ").replace(/\t/g," ").replace(/ {2,}/g," ").trim();}

// ── MESSAGE HANDLER ───────────────────────────────────────────────────────────
self.onmessage=function(e){
  const{src,opts,intensity,targetBytes}=e.data;
  let code=src;
  let layerCount=0;

  function step(name,fn){
    code=fn(code);layerCount++;
    self.postMessage({type:"log",msg:"✓ "+name+" → "+code.length.toLocaleString()+" chars"});
  }

  if(opts.o_split) step("String chunk split",L_strChunkSplit);
  if(opts.o_var){const r=L_varMangle(code);code=r.code;layerCount++;self.postMessage({type:"log",msg:"✓ Variable mangling → "+code.length.toLocaleString()+" chars"});}
  if(opts.o_str)  step("String → char array",L_strToChars);
  if(opts.o_num)  step("Number arithmetic",L_numArith);
  if(opts.o_junk) step("Massive junk flood",c=>L_junkFlood(c,intensity));
  if(opts.o_char) step("Per-char flattener",L_charFlattener);
  if(opts.o_dead) step("Dead branch inject",L_deadBranch);
  if(opts.o_poly) step("Polymorphic XOR",L_polyXor);
  if(opts.o_opaque) step("Opaque predicates",L_opaquePredicates);
  if(opts.o_anti) step("Anti-extraction trap",L_antiExtraction);
  if(opts.o_scope) step("Scope bomb",c=>L_scopeBomb(c,4));
  if(opts.o_flow) step("Control flow mangle",L_flowMangle);
  if(opts.o_vm)   step("Micro-VM dispatch",L_microVM);
  if(opts.o_wrap) step("Loadstring wrap",L_loadstringWrap);
  if(opts.o_bytes) step("Byte array encode",L_byteArray);
  if(opts.o_multi_wrap) step("Triple-load nesting",L_tripleLoad);

  let oneline=compact(code);
  if(targetBytes>0&&oneline.length<targetBytes){
    self.postMessage({type:"log",msg:"Padding to "+fmtBytes(targetBytes)+"..."});
    oneline=padToSize(oneline,targetBytes);
    self.postMessage({type:"log",msg:"✓ Padded → "+fmtBytes(oneline.length)});
  }

  self.postMessage({type:"done",result:oneline,layerCount,inputLen:src.length,outputLen:oneline.length});
};
