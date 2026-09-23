# ZumObf v5 — Modular VM

A browser-based Lua/Luau obfuscation project with a custom compiler and stack virtual machine.

## Layout

- `public/index.html` — dashboard markup only
- `public/css/style.css` — dashboard styling
- `public/js/app.js` — UI, worker control, tests, download handling
- `public/js/worker.js` — background compilation pipeline
- `public/js/compiler.js` — lexer, parser, bytecode compiler, serializer, VM emitter
- `tests/compile-smoke.js` — local compiler/VM smoke tests

## VM pipeline

The VM path does not compile the original source into a Lua string and then execute that string. The JavaScript compiler emits a custom instruction stream with constants and child prototypes. The output contains a Lua interpreter that deserializes and dispatches those instructions.

The VM currently includes local/global/upvalue access, closures, captured outer frames, arithmetic and comparison operators, control-flow jumps, tables, field/index operations, calls with fixed or all return values, varargs, multiple assignment support, method calls, and a 42-opcode instruction set.

VM mode deliberately skips the source-reloading `loadstring` and byte-array loader layers. Those transforms remain available for fallback mode.

## Local smoke test

Run with Node.js from the project root:

```text
node tests/compile-smoke.js
```

The smoke test verifies representative compiler paths and checks that generated VM output does not embed the input source as a `load()` payload.

## v6 VM correctness work

The serializer now uses signed zig-zag integers with LEB128/varint encoding instead of forcing every bytecode value into 8 bits. This is important for jump targets, constant indexes, instruction counts, and negative sentinels such as `-1`.

The compiler also handles LuaU `continue`, integer division and bitwise operators, short-circuit `and`/`or`, dynamic table indexes, indexed/member assignments, multiple returns, and vararg calls more explicitly.

## Architecture references

The implementation is original code in this repository. Its structure was cross-checked against public open-source projects for established VM/compiler patterns rather than copied wholesale:

- `sudo-dava25/LuaU-obfuscator` — preprocess Luau syntax, walk an AST into custom bytecode, then generate a self-contained VM runtime.
- `PY44N/LuaObfuscatorV2` — separate compiler/VM/minifier components and use of a bytecode interpreter as a protection layer.
- `SYahama/Lua-Py-Obfuscator` — AST transformation pipeline, randomized identifiers, string transforms, and custom ISA concepts.
- `0xXrer/MathOBF-lua` — custom opcode/VM structure and encoded bytecode data.

These projects are references for architecture and techniques; their code is not embedded verbatim here.

## Current correctness status

The project now tests the browser worker pipeline in addition to compiler and serializer behavior. VM closures are emitted as real Lua/Luau functions, so generated functions can be passed to normal native APIs that expect callable functions. Numeric `for` loops support ascending and descending steps, `continue` targets the correct loop phase, multiple-assignment trims/pads RHS values, and vararg/multiple-return calls propagate requested return counts.

The local automated suite currently passes 25 checks across compiler smoke tests, VM stack regressions, serialization, additional semantics, worker execution, and Pastefy proxy request handling.

The repository is intentionally still a custom Luau subset rather than a claim of complete language compatibility. Production validation against the exact Roblox Luau runtime should remain part of release testing.
