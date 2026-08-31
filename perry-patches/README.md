# perry-patches

Ledger dir for node_modules patches needed to make deps
Perry-compilable.

Rules:

- One patch file per package: `<name>@<version>.patch` (`git diff`
  against the installed tree, paths relative to
  `node_modules/<name>/`).
- Every patch must be Node-compatible. Cross-cutting invariant: single
  source tree, no fork — the tap suite stays green on Node after any
  patch lands.
- Every patch carries its rationale where it applies: a `perry:`
  comment in the patched code explaining why, plus the upstream
  issue/PR if filed.
- Prefer vendoring over patching when a dep needs structural change.
- CI proves reapply-after-install: fresh install → apply → compile.

Apply/reapply: `scripts/perry/apply-patches.sh` (idempotent; `--check`
verifies).
