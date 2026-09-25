'use strict';
const fs=require('fs');
const vm=require('vm');
const path=require('path');
const compiler=fs.readFileSync(path.join(__dirname,'../js/compiler.js'),'utf8');
const worker=fs.readFileSync(path.join(__dirname,'../js/worker.js'),'utf8');

function run(mode,src,opts={}){
  const messages=[];
  const context={console};
  context.self={postMessage:m=>messages.push(m)};
  context.importScripts=()=>vm.runInContext(compiler,context,{filename:'compiler.js'});
  vm.createContext(context);
  vm.runInContext(worker,context,{filename:'worker.js'});
  context.self.onmessage({data:{src,opts:{o_var:false,o_junk:false,o_dead:false,o_poly:false,o_scope:false,o_flow:false,o_wrap:false,o_bytes:false,watermark:'',format:'normal',...opts},intensity:1,targetBytes:0,mode}});
  return messages;
}

const source=`local function add(a,b) return a+b end\nlocal x=add(2,3)\nlocal t={value=x}\nfunction t:add(n) self.value+=n return self.value end\nlocal y=t:add(4)\nprint(y)`;

for(const mode of ['vm','fallback']){
  const msgs=run(mode,source);
  const err=msgs.find(m=>m.type==='error');
  if(err)throw new Error(mode+': worker error: '+err.msg);
  const done=msgs.find(m=>m.type==='done');
  if(!done||typeof done.result!=='string'||!done.result.length)throw new Error(mode+': missing output');
  if(done.result.includes('local function add(a,b)')&&mode==='vm')throw new Error('vm: original source leaked into output');
  console.log('PASS worker '+mode+' pipeline → '+done.result.length+' chars');
}
console.log('2/2 worker pipeline tests passed');
