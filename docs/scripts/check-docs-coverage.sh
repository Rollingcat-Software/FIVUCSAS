#!/bin/bash
# Documentation coverage check script

set -e

echo "🔍 Checking documentation coverage..."
echo ""

# Required documentation files
REQUIRED_DOCS=(
    "README.md"
    "01-getting-started/README.md"
    "01-getting-started/QUICK_START.md"
    "01-getting-started/HOW_TO_RUN_APPS.md"
    "02-architecture/README.md"
    "02-architecture/ARCHITECTURE_ANALYSIS.md"
    "03-development/README.md"
    "03-development/CLAUDE.md"
    "04-api/README.md"
    "05-testing/README.md"
    "05-testing/TESTING_GUIDE.md"
    "06-deployment/README.md"
    "06-deployment/START_ALL_SERVICES.md"
    "07-status/README.md"
    "07-status/PROJECT_STATUS_NOW.md"
)

MISSING=0
FOUND=0

for doc in "${REQUIRED_DOCS[@]}"; do
    if [ ! -f "$doc" ]; then
        echo "❌ Missing: $doc"
        MISSING=$((MISSING + 1))
    else
        echo "✅ Found: $doc"
        FOUND=$((FOUND + 1))
    fi
done

echo ""
echo "📊 Results:"
echo "   Found: $FOUND"
echo "   Missing: $MISSING"
echo "   Coverage: $(($FOUND * 100 / ${#REQUIRED_DOCS[@]}))%"
echo ""

if [ $MISSING -gt 0 ]; then
    echo "❌ Documentation coverage check FAILED"
    echo "   $MISSING required files missing"
    exit 1
else
    echo "✅ Documentation coverage check PASSED"
    echo "   All required documentation present"
    exit 0
fi
