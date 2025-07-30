# Exit on error
set -Eeuxo pipefail

# Install system dependencies
echo "Installing system dependencies..."
sudo apt-get update && sudo apt-get install -y jq

# Install Hyperfine
wget https://github.com/sharkdp/hyperfine/releases/download/v1.19.0/hyperfine_1.19.0_amd64.deb
sudo dpkg -i hyperfine_1.19.0_amd64.deb

echo "Required system dependencies installed successfully!"
JQ_VERSION=$(jq --version)
HYPERFINE_VERSION=$(hyperfine --version)
echo "jq: $JQ_VERSION"
echo "hyperfine: $HYPERFINE_VERSION"

# Create Results Directory
mkdir -p ./results/

# Rename fixtures package.json files
mv infra/cli-benchmarks/fixtures/vue/package.json_ infra/cli-benchmarks/fixtures/vue/package.json

# Log Package Manager Versions
echo "Logging package manager versions..."
PNPM_VERSION="$(pnpm -v)"
VLT_VERSION="$(vlt --version)"

# Output versions
echo "vlt: $VLT_VERSION"
echo "pnpm: $PNPM_VERSION"

# Save versions to JSON file
echo "{
  \"vlt\": \"$VLT_VERSION\",
  \"pnpm\": \"$PNPM_VERSION\"
}" > ./results/versions.json

echo "Setup completed successfully!"
