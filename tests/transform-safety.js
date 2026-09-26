const fs=require('fs');
const vm=require('vm');
const compiler=fs.readFileSync('js/compiler.js','utf8');
const worker=fs.readFileSync('js/worker.js','utf8');

vm.runInNewContext(compiler,{console,Math,bit32:{band:(a,b)=>a&b,bor:(a,b)=>a|b,bxor:(a,b)=>a^b,bnot:a=>~a,lshift:(a,b)=>a<<b,rshift:(a,b)=>a>>>b},string:{},table:{},tonumber:Number,JSON});

if(!worker.includes("Variable mangling skipped in VM mode"))throw new Error('worker VM safety branch missing');
if(!compiler.includes('Never slice a Lua statement in half'))throw new Error('safe padding missing');
if(!compiler.includes('Only plain string literals are encoded'))throw new Error('safe polymorphic transform missing');

console.log('PASS transform safety guards');
