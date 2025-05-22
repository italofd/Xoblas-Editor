#!/bin/bash

# Check if a path argument is provided
if [ $# -eq 0 ]; then
  # If no path is provided, use current directory
  path="."
else
  # Use the provided path
  path="$1"
fi

# Resolve to absolute path
abs_path=$(realpath "$path")

# Get directory name
dir_name=$(basename "$abs_path")

# Save current directory
current_dir=$(pwd)

# Go to parent directory of the target
cd "$(dirname "$abs_path")"

# Run tree on the directory name itself, this way the root node will be the directory name
tree -l -i -J --noreport "$dir_name"

# Return to original directory
cd "$current_dir"