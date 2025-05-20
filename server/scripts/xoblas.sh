#!/bin/bash

# Check if a path argument is provided
if [ $# -eq 0 ]; then
  # If no path is provided, use current directory
  path="."
else
  # Use the provided path
  path="$1"
fi

# Change to the specified directory
if ! cd "$path" 2>/dev/null; then
  echo "Error: Could not change to directory: $path"
  exit 1
fi

# Run tree command with JSON output in the current directory
tree -i -J --noreport .