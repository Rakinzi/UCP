#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

stores=(
  "$root_dir/stores/store1"
  "$root_dir/stores/store2"
  "$root_dir/stores/store3"
)

for store in "${stores[@]}"; do
  echo "Syncing SvelteKit in: $store"
  (cd "$store" && bun run prepare)
done
