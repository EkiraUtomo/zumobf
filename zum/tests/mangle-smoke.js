'use strict';
const fs=require('fs');
const vm=require('vm');
const path=require('path');
const source=fs.readFileSync(path.join(__dirname,'../public/js/compiler.js'),'utf8');
const context={console,Math};
vm.createContext(context);
vm.runInContext(source+'\nthis.api={compile,emitVMLua,L_var};',context);
function assert(cond,msg){if(!cond)throw new Error(msg);}

const sample=`
local function add(a,b)
  local text="function local end"
  return a+b
end
local x,y,z=1,2,3
local obj={value=1}
obj.add=function(self,n) return self.value+n end
local result=add(x,y)
`;
const mangled=context.api.L_var(sample);

assert(/local\s+function\s+[_A-Za-z][A-Za-z0-9_]*\s*\(/.test(mangled), 'local function declaration was corrupted');
assert(!/local\s+(?!function\b)[_A-Za-z][A-Za-z0-9_]*\s+[_A-Za-z][A-Za-z0-9_]*\s*\(/.test(mangled), 'function keyword appears to have been mangled');
assert(mangled.includes('function local end'), 'string literal was modified');
assert(/\.add=function/.test(mangled), 'member name was modified');

const bc=context.api.compile('local function add(a,b) return a+b end local x=add(1,2)');
const vmLua=context.api.emitVMLua(bc);
const vmMangled=context.api.L_var(vmLua);
assert(/local\s+function\s+[_A-Za-z][A-Za-z0-9_]*\s*\(/.test(vmMangled), 'VM helper function declaration was corrupted');
assert(!/local\s+(?!function\b)[_A-Za-z][A-Za-z0-9_]*\s+[_A-Za-z][A-Za-z0-9_]*\s*\(/.test(vmMangled), 'VM output contains reserved-word corruption');

console.log('PASS variable-mangling keyword/string/member safety');
console.log('PASS VM emission + mangling smoke test');
