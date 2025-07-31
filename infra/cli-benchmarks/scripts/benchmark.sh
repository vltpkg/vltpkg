# Exit on error
set -Eeuxo pipefail

# Check if fixture name is provided
if [ -z "$1" ]; then
    echo "Error: Fixture name not provided"
    echo "Usage: $0 <fixture-name> <variation>"
    exit 1
fi

# Check if variation is provided
if [ -z "$2" ]; then
    echo "Error: Benchmark variation not provided"
    echo "Usage: $0 <fixture-name> <variation>"
    exit 1
fi

# Navigate to the fixture directory
pushd "./infra/cli-benchmarks/fixtures/$1"

RESULTS_DIR="../../../../results"
SCRIPTS_DIR="../../scripts"

# Run the install variation
case "$2" in
    cache)
        bash ../../scripts/variations/cache.sh "$SCRIPTS_DIR" "$RESULTS_DIR" "$1" "$2"
        ;;
    cache-lockfile)
        bash ../../scripts/variations/cache-lockfile.sh "$SCRIPTS_DIR" "$RESULTS_DIR" "$1" "$2"
        ;;
    cache-node-modules)
        bash ../../scripts/variations/cache-node-modules.sh "$SCRIPTS_DIR" "$RESULTS_DIR" "$1" "$2"
        ;;
    cache-lockfile-node-modules)
        bash ../../scripts/variations/cache-lockfile-node-modules.sh "$SCRIPTS_DIR" "$RESULTS_DIR" "$1" "$2"
        ;;
    lockfile)
        bash ../../scripts/variations/lockfile.sh "$SCRIPTS_DIR" "$RESULTS_DIR" "$1" "$2"
        ;;
    lockfile-node_modules)
        bash ../../scripts/variations/lockfile-node-modules.sh "$SCRIPTS_DIR" "$RESULTS_DIR" "$1" "$2"
        ;;
    node-modules)
        bash ../../scripts/variations/node-modules.sh "$SCRIPTS_DIR" "$RESULTS_DIR" "$1" "$2"
        ;;
    clean)
        bash ../../scripts/variations/clean.sh "$SCRIPTS_DIR" "$RESULTS_DIR" "$1" "$2"
        ;;
    run)
        bash ../../scripts/variations/run.sh "$SCRIPTS_DIR" "$RESULTS_DIR" "$1" "$2"
        ;;
    *)
        echo "Error: Unknown install variation '$2'"
        exit 1
        ;;
esac

popd
echo "Installation benchmark suite completed successfully!"
