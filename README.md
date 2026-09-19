# Lua Obfuscator v5 — Modular Build

The dashboard is split into separate frontend and compiler files so changes are isolated and easier to debug.

## Structure

```text
public/
├── index.html          # Dashboard markup only
├── css/
│   └── style.css       # Dashboard styling
└── js/
    ├── app.js          # UI, controls, tests, worker communication
    ├── compiler.js     # Lexer, parser, bytecode compiler, VM emitter, transforms
    └── worker.js       # Web Worker entry point
```

## Runtime

`app.js` starts `/js/worker.js`. The worker loads `compiler.js` with `importScripts()` and keeps compilation off the UI thread.

## Parser fixes included

- Compound assignments: `+=`, `-=`, `*=`, `/=`, `%=`
- Typed locals and function signatures
- Type declarations
- Dotted and colon method declarations
- Multi-variable generic `for`
- Multi-variable assignment such as `a, b = ...`
- Compound field assignments

## UI

The dashboard no longer contains compiler or worker source in `index.html`. Inline event handlers were removed and UI events are bound from `app.js`.

The interface keeps the existing functionality while using a simpler, restrained presentation with no decorative emoji UI elements.
