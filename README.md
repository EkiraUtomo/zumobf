# ZumHub Obfuscator v9

**Source-transform architecture. No VM wrapper. Executor-compatible.**

## What changed from v1-v8

Previous versions wrapped all code in a custom bytecode VM interpreter. This meant `hookfunction`, `getupvalues`, `debug.*`, `getfenv`, `setfenv`, `loadstring`, `require`, and any function that inspects the Lua C stack would break — because they'd see the VM's internals instead of your real code.

v9 is a full rewrite. Output is real, native Luau — no interpreter layer.

## How it works

The pipeline runs 7 source-level transforms in sequence:

1. **Parse** — full Luau AST parser (type annotations, compound assigns, continue, etc.)
2. **Rename** — every local variable and function name becomes a random obfuscated identifier
3. **String encryption** — all string literals XOR-encrypted with a random polynomial key; decryptor is injected as a real Lua closure
4. **Number obfuscation** — integer constants replaced with `bit32.bxor(N^K, K)` expressions
5. **Dead code** — unreachable `if false then ... end` blocks inserted throughout
6. **Junk code** — meaningless but valid Luau statements scattered between real code
7. **Scope wrapping** — three nested `do...end` blocks with junk locals to pollute name analysis

## Executor compatibility

Because output is plain Luau, these all work normally:
- `hookfunction` / `hookmetamethod`
- `getupvalues` / `setupvalue`
- `debug.getinfo` / `debug.getupvalue`
- `getfenv` / `setfenv`
- `loadstring` / `load`
- `require`
- `coroutine.yield` inside pcall
- `task.wait` and all yielding Roblox APIs

## Usage

Drop the folder on a local server or open `index.html`. Set intensity (1–5), paste script, click Obfuscate.

## Running tests

```
node tests/smoke.js
```

30 cases including executor APIs, type annotations, closures, coroutines, and the full Luau test suite.
