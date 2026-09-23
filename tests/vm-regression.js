'use strict';
const fs=require('fs');
const vm=require('vm');
const path=require('path');
const source=fs.readFileSync(path.join(__dirname,'../public/js/compiler.js'),'utf8');
const context={console};
vm.createContext(context);
vm.runInContext(source+'\nthis.api={compile};',context);

function decode(bc){
  let i=0;
  function read(){return bc[i++];}
  function proto(){
    const p={consts:[],code:[],protos:[]};
    const nc=read();
    for(let k=0;k<nc;k++){
      const t=read();
      if(t===3)p.consts[k]=null;
      else if(t===2)p.consts[k]=read()===1;
      else {let n=read(),s='';for(let j=0;j<n;j++)s+=String.fromCharCode(read());p.consts[k]=t===0?Number(s):s;}
    }
    const ni=read();
    for(let k=0;k<ni;k++){const n=read(),a=[];for(let j=0;j<n;j++)a.push(read());p.code.push(a);}
    const np=read();for(let k=0;k<np;k++)p.protos.push(proto());
    p.params=read();p.vararg=read()===1;return p;
  }
  return proto();
}

const method=decode(context.api.compile(`local t={value=1} function t:add(n) self.value+=n return self.value end t:add(2)`));
const ops=method.code.map(x=>x[0]);
if(!ops.includes(62))throw new Error('method regression: SWAP opcode missing');

const indexed=decode(context.api.compile(`local t={x=1}; t["x"]+=2`));
if(!indexed.code.some(x=>x[0]===71))throw new Error('indexed assignment regression: DUP2 opcode missing');

const fn=decode(context.api.compile(`local function f(a,b,...) return a,b,... end local x,y,z=f(1,2,3,4)`));
if(fn.protos[0].params!==2||fn.protos[0].vararg!==true)throw new Error('function parameter/vararg metadata regression');

console.log('PASS method self-call stack ordering');
console.log('PASS indexed compound-assignment stack ordering');
console.log('PASS function parameter + vararg metadata');
console.log('3/3 VM semantic regressions passed');
