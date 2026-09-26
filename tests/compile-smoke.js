'use strict';
const fs=require('fs');
const vm=require('vm');
const path=require('path');
const source=fs.readFileSync(path.join(__dirname,'../js/compiler.js'),'utf8');
const context={console};
vm.createContext(context);
vm.runInContext(source+'\nthis.api={compile,emitVMLua};',context);
const cases=[
  ['arithmetic',`local a=2 local b=3 local c=a+b`],
  ['multi-return',`local function f() return 1,2,3 end local a,b=f()`],
  ['closure',`local n=0 local function inc() n+=1 return n end inc() inc()`],
  ['method',`local t={value=1} function t:add(n) self.value+=n return self.value end t:add(2)`],
  ['generic-for',`local t={10,20} for i,v in pairs(t) do print(i,v) end`],
  ['typed',`local function add(a:number,b:number):number return a+b end local x:number=add(1,2)`],
];
for(const [name,src] of cases){
  const bc=context.api.compile(src);
  const out=context.api.emitVMLua(bc);
  if(!out.includes('while')||!out.includes('local function'))throw new Error(name+': VM interpreter missing');
  if(out.includes('load("'+src.replace(/"/g,'\\"')))throw new Error(name+': source passed to load()');
  console.log(`PASS ${name} bytecode=${bc.length} vm=${out.length}`);
}
console.log(`${cases.length}/${cases.length} smoke cases passed`);
