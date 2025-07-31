# Exit on error
set -Eeuxo pipefail

# Load common variables
source "$1/variations/common.sh"

# Run the benchmark suite
# When running a clean benchmark, we want to clean up all the things in
# between each run using the clean-helper.sh script.
hyperfine \
  --export-json="$BENCH_OUTPUT_FOLDER/benchmarks.json" \
  --warmup="$BENCH_WARMUP" \
  --runs="$BENCH_RUNS" \
  --prepare="sleep 1; bash $BENCH_SCRIPTS/clean-helpers.sh clean_all" \
  --conclude="sleep 1; bash $BENCH_SCRIPTS/clean-helpers.sh clean_all" \
  --cleanup="bash $BENCH_SCRIPTS/clean-helpers.sh clean_all" \
  "vlt install: $BENCH_FIXTURE & $BENCH_VARIATION" "$BENCH_COMMAND_VLT"
