'use strict';
const {obfuscate} = require('../js/compiler.js');

let pass=0,fail=0;
function test(name, src){
  try {
    const out = obfuscate(src, {intensity:3});
    if(!out.startsWith('--DoggoJr Is Here')) throw new Error('Missing header');
    if(!out.includes('bit32.bxor')) throw new Error('Missing encryption');
    if(out.includes('.loc[')) throw new Error('VM artifact in output');
    console.log('PASS', name);
    pass++;
  } catch(e) {
    console.log('FAIL', name, '|', e.message.substring(0,80));
    fail++;
  }
}

test('locals',        'local x=10; local y=20; return x+y');
test('numeric for',   'for i=1,10 do local s=i end');
test('generic for',   'for k,v in pairs({a=1,b=2}) do end');
test('closure',       'local function make(n) return function() n+=1 return n end end');
test('method',        'local O={} function O:add(n) self.v+=n end');
test('type ann',      'local function f(a:number,b:number):number return a+b end');
test('typed table',   'type D={name:string} local d:D={name="hi"}');
test('multiline type','type Data = {\n    name: string,\n    value: number\n}\nlocal x=1');
test('pcall',         'local ok,r=pcall(function() return 42 end)');
test('xpcall',        'local h=false local ok=xpcall(function()error("x")end,function()h=true end)');
test('coroutine',     'local co=coroutine.create(function() coroutine.yield(10) return 30 end)');
test('hookfunction',  'hookfunction(print,function(...) return ... end)');
test('getupvalues',   'local ups=getupvalues(print)');
test('debug',         'local i=debug.getinfo(1)');
test('getfenv',       'local env=getfenv(1)');
test('setfenv',       'setfenv(1,{})');
test('loadstring',    'local f=loadstring("return 42") print(f())');
test('require',       'local m=require("game.Players")');
test('metatable',     'local t={} setmetatable(t,{__index=function(s,k) return k end})');
test('recursion',     'local function fac(n) if n<=1 then return 1 end return n*fac(n-1) end');
test('continue',      'for i=1,10 do if i%2==0 then continue end end');
test('compound assign','local x=0; for i=1,5 do x+=i end');
test('string escape', 'local s="\\n\\t\\r\\\\\\"\'"');
test('unicode str',   'local u="UwU ✓ λ Ω"');
test('multiret',      'local function v() return 10,20,30 end local a,b,c=v()');
test('varargs',       'local function f(...) return select("#",...) end');
test('bit32',         'local x=bit32.band(0xFF,0x0F)');
test('table ops',     'local t={1,2,3} table.insert(t,4) table.remove(t,1)');
test('complex flow',  'local r=0 for i=1,20 do if i%3==0 then r+=i*2 elseif i%2==0 then r-=i else r+=1 end end');

const fs=require('fs');
const bigSrc=fs.readFileSync(__dirname+'/./full_suite.lua','utf8');
test('full test suite', bigSrc);

console.log('\n'+pass+'/'+(pass+fail)+' passed');
if(fail>0) process.exit(1);
