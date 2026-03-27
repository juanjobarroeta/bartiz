#!/bin/bash

# Script to fix API URLs in all pages

cd /Users/juanjosebarroeta/construccion-admin/src/pages

for file in *.jsx; do
  echo "Processing $file..."
  
  # Add import if not already present
  if ! grep -q "import.*api.*from.*config/api" "$file"; then
    # Add import after the last import statement
    sed -i '' '/^import/a\
import { api } from '\''../config/api'\''
' "$file"
  fi
  
  # Replace fetch('/api/... with fetch(api('/api/...
  # This handles single quotes
  sed -i '' "s/fetch('\(\/api[^']*\)')/fetch(api('\1'))/g" "$file"
  
  # This handles double quotes  
  sed -i '' 's/fetch("\(\/api[^"]*\)")/fetch(api("\1"))/g' "$file"
  
  # This handles template literals
  sed -i '' 's/fetch(`\(\/api[^`]*\)`)/fetch(api(`\1`))/g' "$file"
  
done

echo "Done!"
