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
