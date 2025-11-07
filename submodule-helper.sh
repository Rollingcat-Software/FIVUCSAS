#!/bin/bash
# FIVUCSAS Submodule Management Helper (Unix/Linux/macOS)
# Quick commands for common submodule operations

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

show_header() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║   FIVUCSAS - Git Submodules Management Helper        ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

show_help() {
    show_header
    echo -e "${YELLOW}Usage: ./submodule-helper.sh <command>${NC}"
    echo ""
    echo -e "${GREEN}Available Commands:${NC}"
    echo ""
    echo -e "  ${WHITE}init${NC}        Initialize all submodules after cloning"
    echo -e "  ${WHITE}update${NC}      Update all submodules to latest remote commits"
    echo -e "  ${WHITE}status${NC}      Show status of all submodules"
    echo -e "  ${WHITE}pull${NC}        Pull latest changes in main repo and all submodules"
    echo -e "  ${WHITE}checkout${NC}    Checkout main branch in all submodules"
    echo -e "  ${WHITE}foreach${NC}     Run a custom command in all submodules"
    echo -e "  ${WHITE}help${NC}        Show this help message"
    echo ""
    echo -e "${GREEN}Examples:${NC}"
    echo "  ./submodule-helper.sh init"
    echo "  ./submodule-helper.sh update"
    echo "  ./submodule-helper.sh status"
    echo ""
}

initialize_submodules() {
    show_header
    echo -e "${YELLOW}🔄 Initializing all submodules...${NC}"
    echo ""
    
    git submodule update --init --recursive
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✅ All submodules initialized successfully!${NC}"
        echo ""
        echo -e "${CYAN}Submodule Status:${NC}"
        git submodule status
    else
        echo -e "${RED}❌ Failed to initialize submodules${NC}"
        exit 1
    fi
}

update_submodules() {
    show_header
    echo -e "${YELLOW}🔄 Updating all submodules to latest remote commits...${NC}"
    echo ""
    
    git submodule update --remote --recursive
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✅ All submodules updated successfully!${NC}"
        echo ""
        echo -e "${CYAN}Submodule Status:${NC}"
        git submodule status
    else
        echo -e "${RED}❌ Failed to update submodules${NC}"
        exit 1
    fi
}

show_status() {
    show_header
    echo -e "${YELLOW}📊 Submodule Status:${NC}"
    echo ""
    
    git submodule status
    
    echo ""
    echo -e "${CYAN}Branch Information:${NC}"
    git submodule foreach 'echo "=== $name ===" && git branch --show-current'
}

pull_all() {
    show_header
    echo -e "${YELLOW}⬇️  Pulling latest changes...${NC}"
    echo ""
    
    echo -e "${CYAN}1️⃣  Pulling main repository...${NC}"
    git pull
    
    echo ""
    echo -e "${CYAN}2️⃣  Updating submodules...${NC}"
    git submodule update --remote --recursive
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✅ Successfully pulled all changes!${NC}"
    else
        echo -e "${RED}❌ Failed to pull changes${NC}"
        exit 1
    fi
}

checkout_main() {
    show_header
    echo -e "${YELLOW}🌿 Checking out main branch in all submodules...${NC}"
    echo ""
    
    git submodule foreach 'git checkout main || git checkout master'
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✅ All submodules checked out to main branch!${NC}"
    else
        echo -e "${YELLOW}⚠️  Some submodules may not have a 'main' or 'master' branch${NC}"
    fi
}

run_foreach() {
    show_header
    echo -e "${YELLOW}⚙️  Run custom command in all submodules${NC}"
    echo ""
    
    read -p "Enter command to run in all submodules: " custom_command
    
    if [ -n "$custom_command" ]; then
        echo ""
        echo -e "${CYAN}Running: $custom_command${NC}"
        echo ""
        git submodule foreach "$custom_command"
    else
        echo -e "${RED}❌ No command provided${NC}"
        exit 1
    fi
}

# Main execution
case "${1:-help}" in
    init)
        initialize_submodules
        ;;
    update)
        update_submodules
        ;;
    status)
        show_status
        ;;
    pull)
        pull_all
        ;;
    checkout)
        checkout_main
        ;;
    foreach)
        run_foreach
        ;;
    help|*)
        show_help
        ;;
esac

echo ""
