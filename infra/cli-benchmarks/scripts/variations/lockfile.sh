# Exit on error
set -Eeuxo pipefail

# Load common variables
source "$1/variations/common.sh"

# Run the benchmark suite
# When running a cache benchmark, we want to clean up only the node_modules
# directory and the lockfiles between each run.
hyperfine \
  --export-json="$BENCH_OUTPUT_FOLDER/benchmarks.json" \
  --warmup="$BENCH_WARMUP" \
  --runs="$BENCH_RUNS" \
  --setup="bash $BENCH_SCRIPTS/clean-helpers.sh clean_all" \
  --prepare="sleep 1; bash $BENCH_SCRIPTS/clean-helpers.sh clean_all_cache clean_node_modules" \
  --conclude="sleep 1; bash $BENCH_SCRIPTS/clean-helpers.sh clean_all_cache clean_node_modules" \
  --cleanup="bash $BENCH_SCRIPTS/clean-helpers.sh clean_all" \
  --command-name="vlt install: $BENCH_FIXTURE & $BENCH_VARIATION" "$BENCH_COMMAND_VLT"
