![package-info](https://github.com/user-attachments/assets/51412725-7bb3-4126-92b9-a6ba0d1ec18a)

# @vltpkg/output

## TODO

## Tracing

`@vltpkg/output/trace` is a low overhead tracer for the install
pipeline. It is off unless one of these is set, and when off every
call returns after one boolean check.

- `VLT_TRACE=<file>` appends one JSON line per event to `<file>`.
  Every thread writes to the same file with the same wall clock, so
  worker events and main thread events sort onto one timeline by `t`.
- `VLT_PHASES=1` prints one `PHASES ...` line to stderr at exit: the
  milliseconds between consecutive phase marks, the event loop delay
  percentiles (how long the main thread was busy with synchronous work
  while IO completions waited), and peak memory.

```sh
VLT_TRACE=trace.jsonl VLT_PHASES=1 vlt install
./scripts/trace-report.ts trace.jsonl --bucket=250
```

The report prints the phase timeline, what each span kind cost
(`manifest`, `request`, `extract`, `tarball:fetch`, `tarball:unpack`,
`inflate`, `write`), how many of each were in flight per time bucket,
and for every phase how long each lane sat idle. An idle lane next to
a busy one is a head-of-line stall.

Event kinds: `phase` (from `mark()`), `<kind>:start`/`<kind>:end`
(from `span()`, paired by `url`, `spec` or `name`), `request` (the
registry client's request events), `lane` (scheduler occupancy), `rss`
(memory samples), `build:level*` (one BFS level of the ideal graph
build), `open` and `exit`.
