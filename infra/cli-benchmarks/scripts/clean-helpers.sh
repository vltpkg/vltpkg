# Exit on error
set -Eeuxo pipefail

# Function to safely remove files/directories
safe_remove() {
  if [ -e "$1" ]; then
    rm -rf "$1" || true
  fi
}

# Function to safely clean vlt cache
clean_vlt_cache() {
  if command -v vlt &> /dev/null; then
    safe_remove "$(vlt config get cache | xargs)"
  fi
}

# Function to clean lockfiles for all package managers
clean_lockfiles() {
  echo "Cleaning lockfiles..."
  safe_remove "vlt-lock.json"
}

# Function to clean node_modules directory
clean_node_modules() {
  echo "Cleaning node_modules directory..."
  safe_remove "node_modules"
}

# Function to clean caches for all package managers
clean_all_cache() {
  echo "Cleaning package manager caches..."
  clean_vlt_cache
}

clean_all() {
  clean_node_modules
  clean_lockfiles
  clean_all_cache
  echo "Cleanup completed successfully!"
}

# Function to display available functions
show_help() {
  echo "Available functions:"
  echo "  clean_vlt_cache"
  echo "  clean_lockfiles"
  echo "  clean_node_modules"
  echo "  clean_all_cache"
  echo "  clean_all"
  echo ""
  echo "Usage: $0 [function_name1] [function_name2] ..."
  echo "Example: $0 clean_npm_cache clean_lockfiles"
}

# Main execution logic
if [ $# -eq 0 ]; then
  show_help
else
  for arg in "$@"; do
    case "$arg" in
      clean_vlt_cache)
        clean_vlt_cache
        ;;
      clean_lockfiles)
        clean_lockfiles
        ;;
      clean_node_modules)
        clean_node_modules
        ;;
      clean_all_cache)
        clean_all_cache
        ;;
      clean_all)
        clean_all
        ;;
      help|--help|-h)
        show_help
        exit 0
        ;;
      *)
        echo "Unknown function: $arg"
        echo "Use 'help' to see available functions."
        exit 1
        ;;
    esac
  done
fi

