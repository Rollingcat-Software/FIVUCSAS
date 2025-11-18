#!/bin/bash

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         FIVUCSAS Submodule Remote Configuration Fix           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "This script will configure remote URLs for all active submodules."
echo ""

# Function to configure submodule
configure_submodule() {
    local submodule=$1
    local url=$2
    local branch=${3:-claude/check-root-repo-011CV1yJ3J5XL4QP68LCrdPG}

    if [ -d "$submodule/.git" ]; then
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "📦 Configuring: $submodule"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        cd "$submodule"

        # Check if remote already exists
        if git remote get-url origin &>/dev/null; then
            current_url=$(git remote get-url origin)
            echo "  ℹ️  Remote 'origin' already exists: $current_url"
            
            if [ "$current_url" != "$url" ]; then
                echo "  ⚠️  URL mismatch!"
                echo "     Current: $current_url"
                echo "     Expected: $url"
                echo ""
                read -p "  Update to expected URL? (y/n) " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    git remote set-url origin "$url"
                    echo "  ✅ Updated origin URL"
                else
                    echo "  ⏭️  Skipping URL update"
                fi
            else
                echo "  ✅ URL is correct"
            fi
        else
            echo "  📝 Adding remote 'origin': $url"
            git remote add origin "$url"
            echo "  ✅ Remote added successfully"
        fi

        # Fetch from remote
        echo "  📥 Fetching from origin..."
        if git fetch origin 2>/dev/null; then
            echo "  ✅ Fetch successful"
        else
            echo "  ⚠️  Fetch failed (may need authentication or URL correction)"
        fi

        # Set upstream branch if it exists
        echo "  🔗 Setting upstream branch..."
        if git show-ref --verify --quiet refs/heads/$branch; then
            if git branch --set-upstream-to=origin/$branch $branch 2>/dev/null; then
                echo "  ✅ Upstream set to origin/$branch"
            else
                echo "  ⚠️  Could not set upstream (remote branch may not exist yet)"
            fi
        else
            echo "  ⚠️  Local branch $branch doesn't exist"
        fi

        # Show current status
        echo ""
        echo "  📊 Current Status:"
        echo "     Remote: $(git remote get-url origin)"
        echo "     Branch: $(git branch --show-current)"
        echo "     Tracking: $(git rev-parse --abbrev-ref @{u} 2>/dev/null || echo 'None')"
        
        cd ..
        echo ""
    else
        echo "⏭️  Skipping $submodule (not initialized)"
        echo ""
    fi
}

# Get URLs from .gitmodules
echo "📖 Reading submodule URLs from .gitmodules..."
echo ""

# Configure each active submodule
configure_submodule "identity-core-api" "https://github.com/Rollingcat-Software/identity-core-api.git"
configure_submodule "biometric-processor" "https://github.com/Rollingcat-Software/biometric-processor.git"
configure_submodule "docs" "https://github.com/Rollingcat-Software/docs.git"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Configuration Complete                                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "✅ Submodule remotes have been configured!"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1️⃣  Push submodule commits (if you have unpushed commits):"
echo "    cd identity-core-api"
echo "    git push origin claude/check-root-repo-011CV1yJ3J5XL4QP68LCrdPG"
echo "    cd ../biometric-processor"
echo "    git push origin claude/check-root-repo-011CV1yJ3J5XL4QP68LCrdPG"
echo ""
echo "2️⃣  Update root repo to track submodule commits:"
echo "    cd .."
echo "    git add identity-core-api biometric-processor"
echo "    git commit -m 'Update submodule references'"
echo "    git push origin claude/check-root-repo-011CV1yJ3J5XL4QP68LCrdPG"
echo ""
echo "3️⃣  Verify everything:"
echo "    ./check-repo-status.sh"
echo ""
