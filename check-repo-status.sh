#!/bin/bash

# Repository Status Checker
# Shows current state of root repo and all submodules

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         FIVUCSAS Repository Structure Analysis                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo "📦 ROOT REPOSITORY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Repository: $(basename $(pwd))"
echo "Branch: $(git branch --show-current)"
echo "Remote: $(git remote get-url origin 2>/dev/null || echo 'Not configured')"
echo "Status:"
git status -s | head -10
echo ""

echo "📁 SUBMODULES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Function to check submodule
check_submodule() {
    local name=$1
    
    if [ -d "$name/.git" ]; then
        echo "✅ $name (Active)"
        cd "$name"
        echo "   Branch: $(git branch --show-current)"
        echo "   Remote: $(git remote get-url origin 2>/dev/null || echo '❌ NOT CONFIGURED')"
        echo "   Uncommitted changes: $(git status -s | wc -l) files"
        echo "   Last commit: $(git log -1 --oneline)"
        cd ..
    else
        echo "❌ $name (Not initialized)"
    fi
    echo ""
}

# Check each submodule
check_submodule "identity-core-api"
check_submodule "biometric-processor"
check_submodule "docs"
check_submodule "desktop-app"
check_submodule "mobile-app"
check_submodule "practice-and-test"
check_submodule "web-app"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  ISSUES DETECTED                                               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

has_issues=false

# Check for submodules without remotes
for submodule in identity-core-api biometric-processor docs; do
    if [ -d "$submodule/.git" ]; then
        cd "$submodule"
        if ! git remote get-url origin &>/dev/null; then
            echo "⚠️  $submodule has NO REMOTE configured"
            echo "   Cannot push commits to separate repository"
            echo "   Fix: git remote add origin <URL>"
            echo ""
            has_issues=true
        fi
        cd ..
    fi
done

if [ "$has_issues" = false ]; then
    echo "✅ No issues detected!"
else
    echo "Run: ./fix-submodules.sh to fix remote configuration"
fi
echo ""

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  RECOMMENDATION                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "See REPOSITORY_STRUCTURE_GUIDE.md for detailed explanation"
echo "and recommended solutions."
echo ""
