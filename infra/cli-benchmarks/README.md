# cli-benchmarks

Install benchmarks for the `vlt` CLI, over the fixtures in `fixtures/`.

Two drivers, for two different questions.

## `scripts/benchmark.sh` — one artifact over time

hyperfine, driven by `scripts/variations/*.sh`, exporting the JSON that
feeds bencher history. This is what CI runs. `BENCH_BINARY` picks the
binary, `BENCH_RUNS` / `BENCH_WARMUP` the sample size.

```sh
bash ./infra/cli-benchmarks/scripts/benchmark.sh abbrev clean
```

## `scripts/bench.ts` — several artifacts against each other

Added for the Perry port. hyperfine measures one binary per
run and reports no memory, and the port's central question is "how does the
compiled binary compare to the Node build on the same fixture". This driver
answers that.

```sh
node --experimental-strip-types infra/cli-benchmarks/scripts/bench.ts \
  --fixture abbrev --variation clean \
  --artifact "node=node .build-bundle/vlt.js" \
  --artifact "perry=.build-perry/vlt"
```

What it adds over hyperfine:

- **Artifact parameterization.** `--artifact name=command`, repeated. Each
  artifact runs the same fixture, variation, and arguments.
- **max-RSS.** Collected per run through GNU `/usr/bin/time`. hyperfine
  reports wall and user only, and RSS is the metric the port is most likely
  to regress: `WeakMap` entries are never collected in the compiled binary.
- **Round-robin interleaving.** Artifacts alternate every round, so a host
  that drifts mid-run hits all of them rather than whichever ran last.
- **An A/A noise band.** `--aa` runs one artifact against itself and records
  the observed median spread in `noise-bands.json`.

### The protocol

These numbers are only comparable if they were taken the same way.

1. **Dedicated host.** No other build, test run, or editor. Two CPUs is
   enough for the fixtures here; what matters is that nothing else moves.
2. **Warmup rounds are not measured.** Default 2. They exist to warm the
   page cache and the registry cache, not the CPU.
3. **N >= 10 measured rounds.** The driver warns below that. The reported
   statistic is the **median**, not the mean: install timings have a long
   right tail and the mean tracks the tail rather than the typical run.
4. **Measure the band before the comparison.** Run `--aa` on the same host,
   same fixture, same variation. A comparison read against a band from
   another host is not a comparison.
5. **Re-measure the band when the host changes.** It is cheap and it is the
   only thing standing between a 4% delta and a false alarm.

### The acceptance rule

For each metric, the ratio is `median(artifact) / median(baseline)`, where
the baseline is the first `--artifact`.

- `ratio > 1 + band` is a **regression**. The driver exits non-zero, so CI
  can gate on it.
- `ratio < 1 - band` is an improvement.
- anything else is within the noise band and is **not** a result.

The band is `max(observed A/A spread, --band-floor)`, floor 3%. The floor
exists because an A/A run on a quiet host can measure a spread near zero,
and treating a 0.2% band as real would fail on nothing but scheduling luck.

Bands live in `noise-bands.json`, keyed by `fixture/variation`, with the
raw measurement kept next to the band so a suspiciously tight one is
visible.

### Comparing to a compiled binary

The Perry build has no `install` yet — the real CLI entry comes later — so
today the useful comparisons are startup-shaped (`--args '--version'`) with
the `cache-lockfile-node-modules` variation, which prepares nothing between
runs. Use the bundled artifact (`.build-bundle/vlt.js`) as the Node
baseline, not `scripts/bins/vlt`: the latter type-strips on every start and
is ~4x slower, which flatters the binary.
