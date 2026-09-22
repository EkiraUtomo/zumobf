'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '../public/js/compiler.js'), 'utf8');
const context = { console };
vm.createContext(context);
vm.runInContext(source + '\nthis.api={compile,emitVMLua};', context);

const lines = [];
for (let i = 0; i < 360; i++) lines.push(`local v${i}=${i}; v${i}=v${i}+1`);
lines.push('local a,b,c=1,2,3');
lines.push('local t={}; t["x"]=123; t["x"]+=7');
lines.push('local function f(x,...) return x,... end');
lines.push('local q,r=f(9,8,7)');
lines.push('for i,v in pairs({10,20,30}) do if i==2 then continue end end');
const input = lines.join('\n');

const bc = context.api.compile(input);
const out = context.api.emitVMLua(bc);
const header = out.match(/local ([A-Za-z_][A-Za-z0-9_]*)=(\d+);local ([A-Za-z_][A-Za-z0-9_]*)=\{([^}]*)\};/);
if (!header) throw new Error('VM byte array header missing');

const seed = Number(header[2]);
const encoded = header[4].split(',').filter(Boolean).map(Number);
for (let i = 0; i < encoded.length; i++) encoded[i] ^= ((seed + i * 17) % 251);

let pos = 0;
const decoded = [];
while (pos < encoded.length) {
  let zz = 0;
  let shift = 0;
  while (true) {
    if (pos >= encoded.length) throw new Error('Truncated varint');
    const b = encoded[pos++];
    zz += (b % 128) * 2 ** shift;
    if (b < 128) break;
    shift += 7;
    if (shift > 63) throw new Error('Varint too long');
  }
  decoded.push(zz % 2 ? -(zz + 1) / 2 : zz / 2);
}

if (decoded.length !== bc.length) throw new Error(`Decoded length ${decoded.length} != bytecode length ${bc.length}`);
for (let i = 0; i < bc.length; i++) {
  if (decoded[i] !== bc[i]) throw new Error(`Bytecode mismatch at ${i}: ${decoded[i]} != ${bc[i]}`);
}

if (!out.includes('local ')) throw new Error('Generated Lua VM body missing');
console.log(`PASS serialization round-trip: ${bc.length} integers -> ${encoded.length} encrypted bytes`);
console.log(`PASS negative sentinel preservation: ${bc.includes(-1) && decoded.includes(-1)}`);
console.log(`PASS large-index preservation: ${bc.some(v => v > 255) && decoded.some(v => v > 255)}`);
