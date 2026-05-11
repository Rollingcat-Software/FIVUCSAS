#!/bin/bash
# FIVUCSAS Test Runner (Bash version for Linux/Mac)
# Quick test execution for individual modules

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_header() {
    echo ""
    print_color "$MAGENTA" "═══════════════════════════════════════════════════════════"
    print_color "$MAGENTA" "  $1"
    print_color "$MAGENTA" "═══════════════════════════════════════════════════════════"
    echo ""
}

# Get project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Test biometric-processor
test_biometric() {
    print_header "Testing: biometric-processor (Python)"

    cd "$PROJECT_ROOT/biometric-processor" || exit 1

    print_color "$CYAN" "Running pytest..."
    python -m pytest tests/e2e/ -v --tb=short

    local exit_code=$?
    if [ $exit_code -eq 0 ]; then
        print_color "$GREEN" "✓ biometric-processor tests PASSED"
    else
        print_color "$RED" "✗ biometric-processor tests FAILED"
    fi

    return $exit_code
}

# Test identity-core-api
test_identity() {
    print_header "Testing: identity-core-api (Java)"

    cd "$PROJECT_ROOT/identity-core-api" || exit 1

    print_color "$CYAN" "Running Maven tests..."
    mvn test

    local exit_code=$?
    if [ $exit_code -eq 0 ]; then
        print_color "$GREEN" "✓ identity-core-api tests PASSED"
        print_color "$CYAN" "Test report: file://$PWD/target/surefire-reports/"
    else
        print_color "$RED" "✗ identity-core-api tests FAILED"
    fi

    return $exit_code
}

# Test web-app
test_webapp() {
    print_header "Testing: web-app (TypeScript)"

    cd "$PROJECT_ROOT/web-app" || exit 1

    print_color "$CYAN" "Running Vitest..."
    npm test -- --run

    local exit_code=$?
    if [ $exit_code -eq 0 ]; then
        print_color "$GREEN" "✓ web-app tests PASSED"
    else
        print_color "$RED" "✗ web-app tests FAILED"
    fi

    return $exit_code
}

# Main execution
print_header "FIVUCSAS Test Runner"
print_color "$CYAN" "Project Root: $PROJECT_ROOT"

case "${1:-all}" in
    biometric-processor|biometric)
        test_biometric
        exit $?
        ;;
    identity-core-api|identity)
        test_identity
        exit $?
        ;;
    web-app|webapp)
        test_webapp
        exit $?
        ;;
    all)
        biometric_result=0
        identity_result=0
        webapp_result=0

        test_biometric || biometric_result=$?
        test_identity || identity_result=$?
        test_webapp || webapp_result=$?

        print_header "Test Results Summary"

        [ $biometric_result -eq 0 ] && print_color "$GREEN" "biometric-processor: ✓ PASSED" || print_color "$RED" "biometric-processor: ✗ FAILED"
        [ $identity_result -eq 0 ] && print_color "$GREEN" "identity-core-api: ✓ PASSED" || print_color "$RED" "identity-core-api: ✗ FAILED"
        [ $webapp_result -eq 0 ] && print_color "$GREEN" "web-app: ✓ PASSED" || print_color "$RED" "web-app: ✗ FAILED"

        if [ $biometric_result -eq 0 ] && [ $identity_result -eq 0 ] && [ $webapp_result -eq 0 ]; then
            echo ""
            print_color "$GREEN" "═══════════════════════════════════════════════════════════"
            print_color "$GREEN" "  ✓ ALL TESTS PASSED"
            print_color "$GREEN" "═══════════════════════════════════════════════════════════"
            exit 0
        else
            echo ""
            print_color "$RED" "═══════════════════════════════════════════════════════════"
            print_color "$RED" "  ✗ SOME TESTS FAILED"
            print_color "$RED" "═══════════════════════════════════════════════════════════"
            exit 1
        fi
        ;;
    *)
        print_color "$YELLOW" "Usage: $0 [all|biometric-processor|identity-core-api|web-app]"
        exit 1
        ;;
esac
