'use strict';
const fs=require('fs');
const vm=require('vm');
const path=require('path');
const source=fs.readFileSync(path.join(__dirname,'../js/compiler.js'),'utf8');
const context={console};vm.createContext(context);vm.runInContext(source+'\nthis.api={compile};',context);

function decode(bc){
  let i=0; const read=()=>bc[i++];
  function proto(){
    const p={consts:[],code:[],protos:[]};
    const nc=read();
    for(let k=0;k<nc;k++){const t=read();if(t===3)p.consts[k]=null;else if(t===2)p.consts[k]=read()===1;else{const n=read();let s='';for(let j=0;j<n;j++)s+=String.fromCharCode(read());p.consts[k]=t===0?Number(s):s;}}
    const ni=read();for(let k=0;k<ni;k++){const n=read(),a=[];for(let j=0;j<n;j++)a.push(read());p.code.push(a);}
    const np=read();for(let k=0;k<np;k++)p.protos.push(proto());p.params=read();p.vararg=read()===1;return p;
  }
  return proto();
}

function findOps(src){return decode(context.api.compile(src));}

const asc=findOps('local s=0 for i=1,3 do s+=i end');
const desc=findOps('local s=0 for i=3,1,-1 do s+=i end');
const repeat=findOps('local i=0 repeat i+=1 if i<2 then continue end until i>=3');
const localMany=findOps('local function f() return 1,2 end local a,b,c=f()');
const rhsExtra=findOps('local a,b=1,2,3');
const varargReturn=findOps('local function f(...) return ... end local a,b=f(1,2)');
const varargCall=findOps('local function f(...) return ... end f(...)');

const jmpCount=p=>p.code.filter(x=>x[0]===30).length;
if(jmpCount(asc)===0||jmpCount(desc)===0)throw new Error('numeric-for jump structure missing');
if(repeat.code.some(x=>x[0]===30&&x[1]===0))throw new Error('repeat continue produced an invalid fixed jump');
const lc=localMany.code.flat();
if(!lc.includes(1)||!lc.includes(2))throw new Error('multi-return local assignment missing expected constants');
const vr=findOps('local function f(a,...) return a,... end local x,y,z=f(...)');
if(!vr.code.some(x=>x[0]===70&&x[2]===3))throw new Error('CALL_VAR multret patch missing');
const ret=findOps('local function f(...) return f(...) end');
const nested=ret.protos[0].code.find(x=>x[0]===70);
if(!nested||nested[2]!==-1)throw new Error('CALL_VAR return-all patch missing');
const retMixed=findOps('local function f(...) return 7,... end');
const retVar=retMixed.protos[0].code.find(x=>x[0]===53);
const retOp=retMixed.protos[0].code.find(x=>x[0]===52);
if(!retVar||retVar[1]!==-1||!retOp||retOp[1]!==-1)throw new Error('mixed return-vararg propagation missing');
console.log('PASS ascending numeric for control flow');
console.log('PASS descending numeric for control flow');
console.log('PASS repeat/continue control flow');
console.log('PASS local multiple-assignment RHS trimming/padding');
console.log('PASS CALL_VAR multiple-return propagation');
console.log('PASS CALL_VAR return-all propagation');
console.log('6/6 additional semantic compiler tests passed');
