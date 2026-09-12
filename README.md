# Lua Obfuscator v3

17-layer Lua / Roblox script obfuscator. All heavy processing runs in a **Web Worker** — UI never freezes. No server, no build step, pure static HTML.

## Features

| Layer | What it does |
|---|---|
| Variable mangling | Renames every local to a confusable-char ID (`_lI1O0`) |
| String → char array | Splits every string into `string.char()` calls |
| Number arithmetic | Wraps integers in `(N+A)-A` expressions |
| Massive junk flood | Injects up to 400 dead-variable blocks |
| Per-char flattener | Builds a 95-slot ASCII table, replaces all chars with `tbl[N]` |
| Polymorphic XOR | Key derived at runtime via `(A×B)%251+offset` — no plaintext key |
| Opaque predicates | Guards real code behind statically-undecidable conditions |
| String chunk split | Shreds strings into random fragments joined at runtime |
| Micro-VM dispatch | Wraps code in an opcode table walked by a program counter |
| Anti-extraction trap | Fingerprints `_G` size — decoder poisons isolated runs |
| Triple-load nesting | Three shells: reverse-byte → XOR → byte-array |
| Control flow mangle | Wraps body in a coroutine-style dispatcher |
| Scope bomb | 4× nested `do...end` blocks with junk locals |
| Dead branch inject | Injects `if false then` / impossible-condition branches |
| Loadstring wrap | `assert(load(..., "@tag"))()` outer shell |
| Byte array encode | Encodes full output as byte table, rebuilt via `string.char` |
| Size padding | Pads to a target file size (KB / MB / GB) |

## Project structure

```
lua-obfuscator/
├── public/
│   ├── index.html   ← full UI
│   └── worker.js    ← all obfuscation runs here (Web Worker)
├── vercel.json      ← Vercel static deploy config
└── README.md
```

---

## Deploy

### Vercel (fastest — one command)

```bash
cd lua-obfuscator
npx vercel --prod
```

Vercel auto-detects `vercel.json` and serves `public/` as the root. Done.

### GitHub Pages

```bash
cd lua-obfuscator
git init
git add .
git commit -m "init: lua obfuscator v3"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/lua-obfuscator.git
git push -u origin main
```

Then in your repo on GitHub:
1. Settings → Pages
2. Source: **Deploy from a branch**
3. Branch: `main` / folder: `/public`
4. Save — live at `https://YOUR_USERNAME.github.io/lua-obfuscator/`

### Codeberg Pages

```bash
cd lua-obfuscator
git init
git add .
git commit -m "init: lua obfuscator v3"
git remote add origin https://codeberg.org/YOUR_USERNAME/lua-obfuscator.git
git push -u origin main
```

Then in your Codeberg repo:
1. Settings → Pages
2. Branch: `main` / folder: `public`
3. Save — live at `https://YOUR_USERNAME.codeberg.page/lua-obfuscator/`

---

## Local development

No build step. Just open the file directly — but Web Workers require a server context (no `file://`). Use any static server:

```bash
# Python
cd public && python3 -m http.server 8080

# Node
npx serve public

# VS Code
# Install "Live Server" extension → right-click index.html → Open with Live Server
```

Then open `http://localhost:8080`.

---

## Notes

- Output is always a single compact line of valid Lua / Luau
- The obfuscated script runs identically to the original
- `bit32` is required at runtime (available in Roblox Luau; not in vanilla Lua 5.1 without a compat library)
- Web Worker is loaded from `worker.js` in the same directory — keep both files together
