# Git Submodules Guide for FIVUCSAS

This repository uses **Git Submodules** to manage multiple component repositories as a unified project.

## 📚 What are Git Submodules?

Git submodules allow you to keep a Git repository as a subdirectory of another Git repository. This lets you clone another repository into your project and keep your commits separate.

## 🏗️ Repository Structure

```
FIVUCSAS/                           # Main repository (this one)
├── .gitmodules                     # Submodule configuration
├── biometric-processor/            # Submodule: Python FastAPI ML service
├── desktop-app/                    # Submodule: Kotlin Multiplatform desktop
├── docs/                           # Submodule: Documentation & configs
├── identity-core-api/              # Submodule: Spring Boot core API
├── mobile-app/                     # Submodule: Kotlin Multiplatform mobile
├── practice-and-test/              # Submodule: Testing materials
├── web-app/                        # Submodule: React admin dashboard
├── docker-compose.yml              # Root: Docker orchestration
└── README.md                       # Root: Main documentation
```

---

## 🚀 Getting Started

### First Time Clone (Recommended)

Clone the main repository **with all submodules** in one command:

```bash
git clone --recurse-submodules https://github.com/Rollingcat-Software/FIVUCSAS.git
cd FIVUCSAS
```

### Already Cloned Without Submodules?

If you cloned without `--recurse-submodules`, initialize them:

```bash
cd FIVUCSAS
git submodule update --init --recursive
```

---

## 🔄 Daily Workflow

### 1. Pulling Latest Changes

**Update main repository AND all submodules:**

```bash
# Pull main repo and update submodules
git pull
git submodule update --recursive --remote

# Or in one command:
git pull --recurse-submodules
```

**Update only the main repository:**

```bash
git pull
```

**Update only submodules:**

```bash
git submodule update --remote --recursive
```

### 2. Working on a Submodule

When you need to make changes to a component (e.g., `identity-core-api`):

```bash
# Navigate to the submodule
cd identity-core-api

# Check current branch (submodules are in "detached HEAD" by default)
git status

# Create/checkout a branch
git checkout main  # or: git checkout -b feature/my-feature

# Make your changes
# ... edit files ...

# Commit and push to the submodule's repository
git add .
git commit -m "feat: your changes"
git push origin main

# Go back to main repository
cd ..

# Update the main repo to track the new commit
git add identity-core-api
git commit -m "chore: update identity-core-api submodule"
git push
```

### 3. Checking Submodule Status

```bash
# View all submodules and their current commits
git submodule status

# View differences in submodules
git diff --submodule

# Check if submodules are on a branch or detached HEAD
git submodule foreach 'git status'
```

---

## 📖 Common Commands

### Initialization & Updates

```bash
# Initialize submodules after cloning
git submodule init

# Update submodules to recorded commits
git submodule update

# Update submodules to latest remote commits
git submodule update --remote

# Update specific submodule
git submodule update --remote identity-core-api

# Recursive update (including nested submodules)
git submodule update --init --recursive
```

### Working with Branches

```bash
# Run a command in all submodules
git submodule foreach 'git checkout main'

# Pull latest changes in all submodules
git submodule foreach 'git pull origin main'

# Check status of all submodules
git submodule foreach 'git status'
```

### Removing a Submodule

If you need to remove a submodule:

```bash
# 1. Remove from .gitmodules
git config -f .gitmodules --remove-section submodule.NAME

# 2. Remove from .git/config
git config -f .git/config --remove-section submodule.NAME

# 3. Remove the submodule directory
git rm --cached path/to/submodule
rm -rf path/to/submodule

# 4. Commit the changes
git commit -m "chore: remove submodule NAME"
```

---

## 🎯 Best Practices

### 1. Always Commit Submodule Updates

When a submodule is updated, commit the change in the main repository:

```bash
git add path/to/submodule
git commit -m "chore: update submodule to version X.Y.Z"
```

### 2. Use Branches in Submodules

Don't work in detached HEAD state:

```bash
cd identity-core-api
git checkout main  # or your feature branch
# ... make changes ...
```

### 3. Pull Before Push

Always pull latest changes before pushing:

```bash
git pull --recurse-submodules
git submodule update --remote
# ... make changes ...
git push --recurse-submodules=on-demand
```

### 4. Coordinate Team Updates

When multiple people update submodules:

```bash
# Person A updates submodule
cd identity-core-api
git checkout main
git pull
git commit -m "feat: add new endpoint"
git push

# Person A updates main repo
cd ..
git add identity-core-api
git commit -m "chore: update identity-core-api"
git push

# Person B pulls changes
git pull
git submodule update --init --recursive
```

---

## 🔧 Troubleshooting

### Submodule is Empty or Missing

```bash
git submodule update --init --recursive
```

### Submodule Showing Uncommitted Changes

```bash
# Option 1: Commit changes in the submodule
cd path/to/submodule
git add .
git commit -m "fix: uncommitted changes"
git push

cd ..
git add path/to/submodule
git commit -m "chore: update submodule"

# Option 2: Discard changes
cd path/to/submodule
git checkout .
```

### Detached HEAD State

This is normal! Submodules point to specific commits. To work on a branch:

```bash
cd path/to/submodule
git checkout main
# ... work normally ...
```

### Merge Conflicts with Submodules

```bash
# Accept their version
git checkout --theirs path/to/submodule
git add path/to/submodule

# Accept your version
git checkout --ours path/to/submodule
git add path/to/submodule

# Update to latest
git submodule update --remote path/to/submodule
git add path/to/submodule
```

### "Permission Denied" or Authentication Issues

Make sure you have access to all submodule repositories:

```bash
# Test SSH access
ssh -T git@github.com

# Or use HTTPS with credentials
git config --global credential.helper store
```

---

## 🎓 Advanced Usage

### Cloning Specific Submodule Depth

Save bandwidth by limiting history:

```bash
git clone --recurse-submodules --shallow-submodules https://github.com/Rollingcat-Software/FIVUCSAS.git
```

### Parallel Submodule Updates

Speed up updates with parallel fetching:

```bash
git submodule update --jobs 4
```

### Custom Submodule Branches

Track a specific branch instead of a commit:

```bash
# In .gitmodules, add:
[submodule "identity-core-api"]
    path = identity-core-api
    url = https://github.com/Rollingcat-Software/identity-core-api.git
    branch = develop
```

Then update:

```bash
git submodule update --remote --recursive
```

---

## 📋 Quick Reference Card

| Task | Command |
|------|---------|
| Clone with submodules | `git clone --recurse-submodules <url>` |
| Init submodules | `git submodule update --init --recursive` |
| Update all to latest | `git submodule update --remote --recursive` |
| Update main + subs | `git pull --recurse-submodules` |
| Status of all subs | `git submodule status` |
| Run cmd in all subs | `git submodule foreach '<command>'` |
| Work on a submodule | `cd <submodule> && git checkout main` |
| Update submodule ref | `git add <submodule> && git commit` |

---

## 🔗 Submodule Repositories

All component repositories are hosted under the **Rollingcat-Software** organization:

- **biometric-processor**: https://github.com/Rollingcat-Software/biometric-processor
- **desktop-app**: https://github.com/Rollingcat-Software/desktop-app
- **docs**: https://github.com/Rollingcat-Software/docs
- **identity-core-api**: https://github.com/Rollingcat-Software/identity-core-api
- **mobile-app**: https://github.com/Rollingcat-Software/mobile-app
- **practice-and-test**: https://github.com/Rollingcat-Software/practice-and-test
- **web-app**: https://github.com/Rollingcat-Software/web-app

---

## 🆘 Need Help?

- **Git Submodules Official Docs**: https://git-scm.com/book/en/v2/Git-Tools-Submodules
- **GitHub Submodules Guide**: https://github.blog/2016-02-01-working-with-submodules/
- **Team Discussion**: Open an issue in the main FIVUCSAS repository

---

**Last Updated**: January 2025  
**Maintained by**: FIVUCSAS Team @ Marmara University
