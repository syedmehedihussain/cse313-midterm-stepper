#!/usr/bin/env bash
# Concatenate src/ into one self-contained HTML file.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p dist
out=dist/cse313-midterm.html
{
  printf '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>CSE313 Midterm Stepper</title>\n<meta name="description" content="Step-by-step CSE313 Compiler Construction midterm guide: ambiguity, left recursion, left factoring, FIRST/FOLLOW, LL(1) table and parsing.">\n<style>\n'
  cat src/style.css
  printf '</style>\n</head>\n<body>\n'
  cat src/content.html
  printf '<script>\n'
  cat src/engine.js src/data.js src/app.js
  printf '</script>\n</body>\n</html>\n'
} > "$out"
cp "$out" index.html
echo "built $out ($(wc -c < "$out") bytes)"
