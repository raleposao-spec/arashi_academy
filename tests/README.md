# Backend test
`tests/e2e.mjs` runs the whole purchase flow (code → Ko-fi webhook → confirm → seat → loadout → expiry) against the
Netlify functions with an in-memory store. Run it from a folder that has copies of `netlify/functions/*.mjs` next to it
and a stub `node_modules/@netlify/blobs` (see the top of the file for what the stub needs).
