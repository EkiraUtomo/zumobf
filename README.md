# ZumObf v5

Vercel-ready project root.

## Vercel settings

- Root Directory: `./` (repository root)
- Framework Preset: Other
- Build Command: disabled/empty
- Output Directory: `public`

The Pastefy proxy is at `api/pastefy.js`. The browser uploads through `/api/pastefy` so the Pastefy token is not sent directly to Pastefy from the frontend.
