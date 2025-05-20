# Define the xoblas function
xoblas_func() {
  local path="."
  if [ $# -gt 0 ]; then
    path="$1"
  fi
  if ! cd "$path" 2>/dev/null; then
    echo "Error: Could not change to directory: $path"
    return 1
  fi
  tree -J .
}

# Alias to call the function
alias xoblas='xoblas_func'