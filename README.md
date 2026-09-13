# Lua Obfuscator v5 — VM Edition

The most advanced Lua/Roblox obfuscator available. Compiles your script to a
custom 39-opcode bytecode format executed by an embedded virtual machine.
**No `load()` call on source code. Ever.**

## Why VM mode breaks the ceiling

Every previous obfuscation approach using `load()` can be defeated by hooking
`load` globally — one line of Lua reveals the decoded source regardless of
how many XOR/byte-array layers wrapped it.

VM mode eliminates this attack surface:

```
Source Lua
↓ JS Lexer + Recursive-descent Parser
AST
↓ Bytecode compiler (39 opcodes)
Bytecode array [numbers]
↓ Rolling-XOR encryption (seed computed, never static)
Encrypted bytecode
↓ Emit: Lua VM + encrypted bytecode table
VM Lua source
↓ v4 pipeline: var mangle + junk + XOR + scope + flow + loadstring + byte array
Final single-line output — no load() on source
```

A `load()` hook sees the VM booting — not your script. To reverse VM mode
an attacker must reverse the VM instruction set, decrypt the rolling-XOR
bytecode, deserialize the custom proto format, reconstruct control flow from
opcodes, and then understand the reconstructed logic. Multi-hour job for
a skilled reverser.

## Supported Lua constructs

- `local` variable declarations (single and multi)
- `local function` and anonymous functions
- All arithmetic: `+ - * / % ^`
- All comparisons: `== ~= < <= > >=`
- All logic: `and or not`
- String concat `..` and length `#`
- `if / elseif / else / end`
- `while / do / end`
- `for i = start, limit, step do` (numeric)
- `for k in iter do` (generic)
- `repeat / until`
- `do / end` blocks
- `return` (single and multi-value)
- `break`
- Table constructors `{}`, field access `.`, index access `[]`
- Method calls `:`
- String and number literals, `true`, `false`, `nil`, `...`
- Nested functions and closures
- Global access (`game`, `workspace`, `print`, etc.)

## Files

```
lua-obf-v5/
├── public/
│   └── index.html   ← everything in one file (compiler + VM + UI)
├── vercel.json
├── .gitignore
└── README.md
```

## Deploy

### Vercel (one command)
```bash
npx vercel --prod
```

### GitHub Pages
```bash
git init && git add . && git commit -m "init: lua obfuscator v5 VM edition"
git branch -M main
git remote add origin https://github.com/YOU/lua-obf.git
git push -u origin main
# Settings → Pages → branch: main → / (root)
# Live at: https://YOU.github.io/lua-obf/
```

### Codeberg Pages
```bash
git remote add origin https://codeberg.org/YOU/lua-obf.git
git push -u origin main
# Settings → Pages → branch: main → / (root)
```

### Raw GitHub (direct link)
Works — single file, inline Blob Worker, no external dependencies.
```
https://raw.githubusercontent.com/YOU/lua-obf/main/public/index.html
```

## Local dev
Web Workers need a real server, not `file://`:
```bash
cd public && python3 -m http.server 8080
# open http://localhost:8080
```

## Notes

- Output is always a single compact line of valid Luau
- `bit32` required at runtime (available in Roblox Luau)
- `string.unpack` used for float64 deserialization if available (Luau 5.1+)
- Fallback mode available for scripts that use advanced patterns the
  compiler doesn't yet handle (metatables, coroutines, `rawset`/`rawget` heavy code)
- The Blob Worker is built from an inline `<script type="x-worker">` tag —
  no `worker.js` file needed, zero CORS issues from any hosting origin
