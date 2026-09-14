#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "=== Interview Coder (No Paywall) ==="
echo "Use Cmd+B on macOS or Ctrl+B on Linux to toggle window visibility."
echo "Building application..."

# The build command cleans generated files. Preserve local configuration.
npm run build

echo "Starting application. Keep this terminal open while using the app."
exec npm run run-prod
