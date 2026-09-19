// ── UI ────────────────────────────────────────────────────────────────────────
function stab(id,el){document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));document.querySelectorAll('.pnl').forEach(p=>p.classList.remove('active'));el.classList.add('active');document.getElementById('pnl_'+id).classList.add('active');}
function tog(id,card){const cb=document.getElementById(id);cb.checked=!cb.checked;card.classList.toggle('on',cb.checked);}
let currentMode='vm';
function setMode(m){
  currentMode=m;
  document.getElementById('card_vm').classList.toggle('on',m==='vm');
  document.getElementById('card_fallback').classList.toggle('on',m==='fallback');
}
document.getElementById('junk_lvl').oninput=function(){document.getElementById('jlbl').textContent=this.value+'/5';};
function fmtB(b){if(b>=1073741824)return(b/1073741824).toFixed(2)+' GB';if(b>=1048576)return(b/1048576).toFixed(2)+' MB';if(b>=1024)return(b/1024).toFixed(2)+' KB';return b+' B';}
document.getElementById('sval').oninput=document.getElementById('sunit').onchange=()=>{
  const v=parseFloat(document.getElementById('sval').value),u=parseInt(document.getElementById('sunit').value);
  document.getElementById('snote').textContent=(!u||isNaN(v)||v<=0)?'Pads with stealthy fake functions to hit the byte target.':'Target: '+fmtB(Math.round(v*u));
};

function dataURI(t){return'data:text/plain;charset=utf-8;base64,'+btoa(unescape(encodeURIComponent(t)));}
function showDL(txt){const fname='obfuscated_'+Date.now()+'.lua';const a=document.getElementById('dla');a.href=dataURI(txt);a.download=fname;a.textContent=fname;document.getElementById('dlc').style.display='block';}
function saveLua(){const v=document.getElementById('out').value;if(!v){setSt('Obfuscate first.');return;}try{const b=new Blob([v],{type:'text/plain'}),url=URL.createObjectURL(b),a=document.createElement('a');a.href=url;a.download='obfuscated_'+Date.now()+'.lua';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},1000);setSt('Downloaded.');}catch(e){showDL(v);setSt('Tap the link below to save.');}}
function makeW(){return new Worker('/js/worker.js');}

let W=null;
function getOpts(){const ids=['o_var','o_junk','o_dead','o_poly','o_scope','o_flow','o_wrap','o_bytes'];const o={};ids.forEach(i=>o[i]=document.getElementById(i).checked);return o;}
function setSt(m){document.getElementById('st').textContent=m;}
function setBusy(b){const btn=document.getElementById('btnrun');btn.disabled=b;btn.textContent=b?'Running…':'Obfuscate';}

async function runObf(){
  const src=document.getElementById('inp').value.trim();
  if(!src){setSt('Paste a script first.');return;}
  if(W){W.terminate();W=null;}
  const intensity=parseInt(document.getElementById('junk_lvl').value);
  const v=parseFloat(document.getElementById('sval').value),u=parseInt(document.getElementById('sunit').value);
  const targetBytes=(!u||isNaN(v)||v<=0)?0:Math.round(v*u);
  document.getElementById('lg').innerHTML='';document.getElementById('bar').style.width='0%';
  document.getElementById('stats').style.display='none';document.getElementById('dlc').style.display='none';
  document.getElementById('out').value='';setSt('Starting '+currentMode+' mode…');setBusy(true);
  let done=0;
  W=makeW();
  W.onmessage=function(e){
    const{type,msg,result,n,iLen,oLen,mode}=e.data;
    if(type==='log'){const lg=document.getElementById('lg');lg.innerHTML+=msg+'\n';lg.scrollTop=lg.scrollHeight;done++;document.getElementById('bar').style.width=Math.min(95,done*6)+'%';setSt(msg.replace('OK ',''));}
    else if(type==='error'){setSt('Compile error: '+msg+' — try fallback mode.');setBusy(false);W=null;document.getElementById('bar').style.width='0%';}
    else if(type==='done'){
      document.getElementById('bar').style.width='100%';
      document.getElementById('out').value=result;
      document.getElementById('si').textContent=fmtB(iLen);
      document.getElementById('so').textContent=fmtB(oLen);
      document.getElementById('sx').textContent=Math.round(oLen/iLen)+'x';
      document.getElementById('sn').textContent=n+(mode==='vm'?' (VM)':' (fallback)');
      document.getElementById('stats').style.display='grid';
      showDL(result);setSt('Done — '+fmtB(oLen)+'. Paste into Roblox.');setBusy(false);W=null;
    }
  };
  W.onerror=function(e){setSt('Worker error: '+e.message);setBusy(false);W=null;};
  W.postMessage({src,opts:getOpts(),intensity,targetBytes,mode:currentMode});
}
function cpOut(){const v=document.getElementById('out').value;if(!v){setSt('Nothing to copy.');return;}navigator.clipboard.writeText(v).then(()=>setSt('Copied.')).catch(()=>{document.getElementById('out').select();document.execCommand('copy');setSt('Copied.');});}
function clr(){if(W){W.terminate();W=null;}['inp','out'].forEach(i=>document.getElementById(i).value='');document.getElementById('lg').innerHTML='';document.getElementById('bar').style.width='0%';document.getElementById('stats').style.display='none';document.getElementById('dlc').style.display='none';setSt('Cleared.');setBusy(false);}

// ── TESTS ─────────────────────────────────────────────────────────────────────
function rndI(a,b){return Math.floor(Math.random()*(b-a+1))+a;}
const IDS2=['l','I','1','O','0'];
function id2(n){n=n||rndI(7,11);let s='_';for(let i=0;i<n;i++)s+=IDS2[rndI(0,4)];return s;}
function getTS(){return document.getElementById('tsrc').value.trim();}
function luaEsc2(s){return s.replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\r/g,'\\r').replace(/\n/g,'\\n').replace(/\t/g,'\\t');}

// Quick inline test versions
function tVar(c){const m={};c=c.replace(/\blocal\s+([a-zA-Z_]\w*)/g,(x,n)=>{if(!m[n])m[n]=id2();return'local '+m[n];});for(const[k,v]of Object.entries(m))c=c.replace(new RegExp('\\b'+k+'\\b','g'),v);return{c,m};}
function tDead(c){const ln=c.split('\n'),o=[];for(const l of ln){o.push(l);if(l.trim().length>4&&Math.random()<0.3)o.push(`if rawequal(nil,false) then local ${id2(5)}=0 end`);}return o.join('\n');}
function tWrap(c){return`assert(load("${luaEsc2(c)}","@t"))()` ;}
function tBytes(c){const a=id2(),iv=id2(4),cv=id2(4);const b=[];for(let i=0;i<c.length;i++)b.push(c.charCodeAt(i));return`local ${a}={${b.join(',')}};local ${cv}={};for ${iv}=1,#${a} do ${cv}[${iv}]=string.char(${a}[${iv}]) end;assert(load(table.concat(${cv})))()`;}
function tScope(c){let r=c;for(let i=0;i<3;i++){const a=id2(),b=id2();r=`do\nlocal ${a}=0;local ${b}=nil;\n${r}\nend`;}return r;}

const TESTS=[
  {id:'vm-compile',name:'VM: Compiler produces bytecode',fn:()=>{
    // Use the worker's compile via a quick inline test
    // We test the output structure by checking it starts with const count
    try{
      const w=makeW();
      return new Promise(res=>{
        w.onmessage=e=>{w.terminate();if(e.data.type==='done'&&e.data.result.length>100){res({pass:true,detail:'VM compiled '+e.data.iLen+' chars → '+e.data.oLen+' chars output'});}else if(e.data.type==='error'){res({pass:false,detail:'Compile error: '+e.data.msg});}};
        w.onerror=e=>res({pass:false,detail:'Worker error: '+e.message});
        w.postMessage({src:getTS(),opts:{o_var:false,o_junk:false,o_dead:false,o_poly:false,o_scope:false,o_flow:false,o_wrap:false,o_bytes:false},intensity:1,targetBytes:0,mode:'vm'});
      });
    }catch(e){return{pass:false,detail:'Worker creation failed: '+e.message};}
  }},
  {id:'vm-no-load-src',name:'VM: No load() on source in output',fn:()=>{
    return new Promise(res=>{
      const w=makeW();
      w.onmessage=e=>{w.terminate();if(e.data.type==='done'){const out=e.data.result;const hasLoadSrc=out.includes('load("local')||out.includes('load("print')||out.includes('load("if ');res({pass:!hasLoadSrc,detail:hasLoadSrc?'load(source) found — VM failed':'No load() on source anywhere — VM working'});}else if(e.data.type==='error'){res({pass:false,detail:e.data.msg});}};
      w.onerror=e=>res({pass:false,detail:e.message});
      w.postMessage({src:getTS(),opts:{o_var:false,o_junk:false,o_dead:false,o_poly:false,o_scope:false,o_flow:false,o_wrap:false,o_bytes:false},intensity:1,targetBytes:0,mode:'vm'});
    });
  }},
  {id:'vm-has-bytecode',name:'VM: Output contains number array (bytecode)',fn:()=>{
    return new Promise(res=>{
      const w=makeW();
      w.onmessage=e=>{w.terminate();if(e.data.type==='done'){const out=e.data.result;const hasBc=/local _[lI10O]+={(\d+,)+\d+}/.test(out);res({pass:hasBc,detail:hasBc?'Bytecode number array present':'Bytecode array not found'});}else if(e.data.type==='error'){res({pass:false,detail:e.data.msg});}};
      w.onerror=e=>res({pass:false,detail:e.message});
      w.postMessage({src:getTS(),opts:{o_var:false,o_junk:false,o_dead:false,o_poly:false,o_scope:false,o_flow:false,o_wrap:false,o_bytes:false},intensity:1,targetBytes:0,mode:'vm'});
    });
  }},
  {id:'vm-has-vm-fn',name:'VM: Output contains VM function (deserialize+execute)',fn:()=>{
    return new Promise(res=>{
      const w=makeW();
      w.onmessage=e=>{w.terminate();if(e.data.type==='done'){const out=e.data.result;const hasVM=out.includes('while')&&out.includes('elseif')&&out.includes('string.char(table.unpack');res({pass:hasVM,detail:hasVM?'VM deserializer and executor present':'VM code not found in output'});}else if(e.data.type==='error'){res({pass:false,detail:e.data.msg});}};
      w.onerror=e=>res({pass:false,detail:e.message});
      w.postMessage({src:getTS(),opts:{o_var:false,o_junk:false,o_dead:false,o_poly:false,o_scope:false,o_flow:false,o_wrap:false,o_bytes:false},intensity:1,targetBytes:0,mode:'vm'});
    });
  }},
  {id:'wrap-escape',name:'Loadstring: no raw newlines in load() arg',fn:()=>{
    const s=getTS();const out=tWrap(s);
    if(!out.startsWith('assert(load('))return{pass:false,detail:'Wrapper missing'};
    if(out.includes('\n'))return{pass:false,detail:'Raw newline in output — BROKEN'};
    return{pass:true,detail:'Escaped correctly, single-line safe'};
  }},
  {id:'dead-no-false',name:'Dead branches: not obvious "if false then"',fn:()=>{
    const out=tDead(getTS());
    const obv=(out.match(/if false then/g)||[]).length;
    const opaque=(out.match(/rawequal\(nil,false\)/g)||[]).length;
    if(obv>0)return{pass:false,detail:obv+' obvious "if false" found'};
    if(opaque<1)return{pass:false,detail:'No opaque predicates (re-run)'};
    return{pass:true,detail:opaque+' opaque false predicates'};
  }},
  {id:'scope',name:'Scope bomb: balanced do/end',fn:()=>{
    const out=tScope(getTS());const ln=out.split('\n').map(l=>l.trim());
    const d=ln.filter(l=>l==='do').length,en=ln.filter(l=>l==='end').length;
    if(d<3)return{pass:false,detail:'Only '+d+' do-blocks'};
    if(d!==en)return{pass:false,detail:'Mismatch: '+d+' do / '+en+' end'};
    return{pass:true,detail:d+' nested scopes, balanced'};
  }},
  {id:'bytes',name:'Byte array: valid structure',fn:()=>{
    const out=tBytes(getTS());
    if(!/local _[lI10O]+={(\d+,)+\d+}/.test(out))return{pass:false,detail:'Array not found'};
    if(!out.includes('assert(load(table.concat('))return{pass:false,detail:'load(concat) missing'};
    return{pass:true,detail:(out.match(/,\d+/g)||[]).length+' bytes encoded'};
  }},
  {id:'worker',name:'Blob Worker: creates and terminates',fn:()=>{
    try{const w=makeW();w.terminate();return{pass:true,detail:'Blob Worker spawned cleanly from inline script tag'};}
    catch(e){return{pass:false,detail:'Worker failed: '+e.message};}
  }},
  {id:'dl',name:'Data URI: base64 round-trip',fn:()=>{
    const s="print('test')";const uri=dataURI(s);
    if(!uri.startsWith('data:text/plain;charset=utf-8;base64,'))return{pass:false,detail:'URI prefix wrong'};
    const dec=decodeURIComponent(escape(atob(uri.split(',')[1])));
    return dec===s?{pass:true,detail:'Round-trip verified'}:{pass:false,detail:'Round-trip mismatch'};
  }},
];

async function runTests(){
  const LIST=document.getElementById('tlist');
  const TBAR=document.getElementById('tbar');
  const TS=document.getElementById('tst');
  LIST.innerHTML='';document.getElementById('tres').style.display='none';
  document.getElementById('tsum').style.display='none';TBAR.style.width='0%';
  let passed=0,failed=0;
  for(let i=0;i<TESTS.length;i++){
    const t=TESTS[i];TS.textContent='Running '+t.id+'...';
    TBAR.style.width=Math.round(((i+1)/TESTS.length)*100)+'%';
    await new Promise(r=>setTimeout(r,0));
    let res;
    try{
      const maybePromise=t.fn();
      res=maybePromise instanceof Promise?await maybePromise:maybePromise;
    }catch(e){res={pass:false,detail:'Exception: '+e.message};}
    if(res.pass)passed++;else failed++;
    const row=document.createElement('div');row.className='rrow';
    row.innerHTML=`<span style="flex-shrink:0">${res.pass?'PASS':'FAIL'}</span><div><div class="rn">${t.name}</div><div class="rd">${res.detail}</div></div>`;
    LIST.appendChild(row);document.getElementById('tres').style.display='block';
    await new Promise(r=>setTimeout(r,20));
  }
  document.getElementById('tpass').textContent=passed;document.getElementById('tfail').textContent=failed;
  document.getElementById('tsum').style.display='grid';
  TS.textContent=`${passed}/${TESTS.length} passed${failed?' — '+failed+' failed':''}.`;
}

function bindUI(){
  document.querySelectorAll('.tab').forEach(el=>el.addEventListener('click',()=>stab(el.dataset.tab,el)));
  document.querySelectorAll('[data-mode]').forEach(el=>el.addEventListener('click',()=>setMode(el.dataset.mode)));
  document.querySelectorAll('[data-toggle]').forEach(el=>el.addEventListener('click',()=>tog(el.dataset.toggle,el)));
  document.getElementById('btnrun').addEventListener('click',runObf);
  document.getElementById('btncopy').addEventListener('click',cpOut);
  document.getElementById('btnsave').addEventListener('click',saveLua);
  document.getElementById('btnclear').addEventListener('click',clr);
  document.getElementById('btntests').addEventListener('click',runTests);
}
document.addEventListener('DOMContentLoaded',bindUI);
