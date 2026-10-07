#!/usr/bin/env bash
# Builds the game and publishes dist/ to the gh-pages branch, which GitHub Pages serves.
# Usage: npm run deploy
set -euo pipefail
cd "$(dirname "$0")/.."
npm test
npm run build
remote=$(git remote get-url origin)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
cp -R dist/. "$tmp"
touch "$tmp/.nojekyll"
cd "$tmp"
git init -q -b gh-pages
git add -A
git commit -q -m "Deploy $(date -u +%Y-%m-%dT%H:%MZ)"
git push -f -q "$remote" gh-pages
echo "Deployed to gh-pages"
