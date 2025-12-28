#!/bin/bash
# FIVUCSAS Web-App Submodule Setup Script
# This script completes the web-app submodule setup after GitHub repository is created

set -e  # Exit on any error

echo "=============================================="
echo "🚀 FIVUCSAS Web-App Submodule Setup"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Verify we're in the right directory
if [ ! -d "/home/user/FIVUCSAS" ]; then
    echo -e "${RED}❌ Error: FIVUCSAS directory not found${NC}"
    exit 1
fi

# Step 2: Push web-app to its repository
echo -e "${YELLOW}📤 Step 1: Pushing web-app code to GitHub...${NC}"
cd /home/user/FIVUCSAS/web-app

if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Error: web-app is not a git repository${NC}"
    exit 1
fi

echo "   Current branch: $(git branch --show-current)"
echo "   Remote: $(git remote get-url origin)"
echo ""

read -p "   Ready to push? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Aborted by user${NC}"
    exit 1
fi

if git push -u origin main; then
    echo -e "${GREEN}✅ Web-app code pushed successfully${NC}"
else
    echo -e "${RED}❌ Failed to push web-app code${NC}"
    echo "   Please ensure the GitHub repository exists:"
    echo "   https://github.com/Rollingcat-Software/web-app"
    exit 1
fi

echo ""

# Step 3: Go back to main repo
echo -e "${YELLOW}🔄 Step 2: Switching to main FIVUCSAS repository...${NC}"
cd /home/user/FIVUCSAS

# Step 4: Remove web-app directory
echo -e "${YELLOW}🗑️  Step 3: Removing web-app directory...${NC}"
echo "   (Don't worry, it's on GitHub now!)"
rm -rf web-app

echo -e "${GREEN}✅ web-app directory removed${NC}"
echo ""

# Step 5: Add web-app as submodule
echo -e "${YELLOW}➕ Step 4: Adding web-app as submodule...${NC}"
if git submodule add http://local_proxy@127.0.0.1:27472/git/Rollingcat-Software/web-app.git web-app; then
    echo -e "${GREEN}✅ web-app added as submodule${NC}"
else
    echo -e "${RED}❌ Failed to add web-app as submodule${NC}"
    echo "   Restoring from backup..."
    cp -r /tmp/web-app-backup web-app
    exit 1
fi

echo ""

# Step 6: Commit submodule addition
echo -e "${YELLOW}💾 Step 5: Committing submodule addition...${NC}"
git add .gitmodules web-app

git commit --no-gpg-sign -m "feat: Add web-app as submodule

Convert web-app to proper submodule following microservices architecture.

- web-app now maintained in separate repository
- Consistent with other components (identity-core-api, biometric-processor)
- Enables independent versioning and deployment
- Repository: https://github.com/Rollingcat-Software/web-app
"

echo -e "${GREEN}✅ Submodule addition committed${NC}"
echo ""

# Step 7: Push to FIVUCSAS repository
echo -e "${YELLOW}📤 Step 6: Pushing to FIVUCSAS repository...${NC}"
if git push -u origin claude/initial-setup-01JNNEJv8tTTsiMXZRuBPjjb; then
    echo -e "${GREEN}✅ Changes pushed to FIVUCSAS${NC}"
else
    echo -e "${RED}❌ Failed to push to FIVUCSAS${NC}"
    echo "   You can push manually later with:"
    echo "   git push -u origin claude/initial-setup-01JNNEJv8tTTsiMXZRuBPjjb"
fi

echo ""

# Step 8: Verify setup
echo -e "${YELLOW}🔍 Step 7: Verifying submodule setup...${NC}"
echo ""
git submodule status
echo ""

# Check if web-app is in the list
if git submodule status | grep -q "web-app"; then
    echo -e "${GREEN}✅ SUCCESS! web-app is now a proper submodule${NC}"
    echo ""
    echo "📊 Current submodules:"
    git submodule status | awk '{print "   - " $2 " (" $1 ")"}'
else
    echo -e "${RED}⚠️  Warning: web-app not found in submodule list${NC}"
fi

echo ""
echo "=============================================="
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo "=============================================="
echo ""
echo "Next steps:"
echo "  1. Verify: git submodule status"
echo "  2. Test clone: git clone --recursive <repo-url>"
echo "  3. Clean up backup: rm -rf /tmp/web-app-backup"
echo ""
