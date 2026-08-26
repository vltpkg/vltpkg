# perry-patches

Ledger dir for node_modules patches needed to make deps
Perry-compilable. Empty through Phase 0/1 — filled by the Phase 2
mechanical wave.

Rules:

- One patch file per package: `<name>@<version>.patch` (`git diff`
  against the installed tree, paths relative to
  `node_modules/<name>/`).
- Every patch must be Node-compatible. Cross-cutting invariant: single
  source tree, no fork — the tap suite stays green on Node after any
  patch lands.
- Every patch gets a `perry-notes.md` ledger entry: why, upstream
  issue/PR if filed, and the `perry check` command that verifies it.
- Prefer vendoring over patching when a dep needs structural change.
- G2 requires CI to prove reapply-after-install: fresh install → apply
  → compile.

Apply/reapply tooling is Phase 2 work; there is no applier script yet.
