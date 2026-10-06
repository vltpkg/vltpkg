# Exit on error
set -Eeuxo pipefail

# Load common variables
source "$1/variations/common.sh"

# Keep the downloaded package metadata cache warm, but remove the lockfile
# and installed packages so each run resolves the graph from manifests.
hyperfine \
  --ignore-failure \
  --export-json="$BENCH_OUTPUT_FOLDER/benchmarks.json" \
  --warmup="$BENCH_WARMUP" \
  --runs="$BENCH_RUNS" \
  --setup="bash $BENCH_SCRIPTS/clean-helpers.sh clean_all" \
  --prepare="bash $BENCH_SCRIPTS/clean-helpers.sh wait_vlt_children; sleep 1; bash $BENCH_SCRIPTS/clean-helpers.sh clean_lockfiles clean_node_modules" \
  --conclude="bash $BENCH_SCRIPTS/clean-helpers.sh wait_vlt_children; sleep 1; bash $BENCH_SCRIPTS/clean-helpers.sh clean_lockfiles clean_node_modules" \
  --cleanup="bash $BENCH_SCRIPTS/clean-helpers.sh clean_all" \
  --parameter-list "binary" "$BENCH_BINARY" \
  --command-name="{binary} install: $BENCH_FIXTURE & $BENCH_VARIATION" "$BENCH_COMMAND_VLT"
